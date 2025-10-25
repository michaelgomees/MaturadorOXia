import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useConnections } from '@/contexts/ConnectionsContext';

export interface MaturadorMessage {
  id: string;
  chipPairId: string;
  fromChipId: string;
  fromChipName: string;
  toChipId: string;
  toChipName: string;
  content: string;
  timestamp: Date;
  aiModel: string;
  usage?: any;
}

export interface ChipPair {
  id: string;
  firstChipId: string;
  firstChipName: string;
  secondChipId: string;
  secondChipName: string;
  isActive: boolean;
  messagesCount: number;
  lastActivity: Date;
  status: 'running' | 'paused' | 'stopped';
  useInstancePrompt: boolean;
  instancePrompt?: string;
}

export const useMaturadorEngine = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<MaturadorMessage[]>([]);
  const [chipPairs, setChipPairs] = useState<ChipPair[]>([]);
  const intervalRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { toast } = useToast();
  const { connections, getConnection, /* add sync */ syncWithEvolutionAPI } = useConnections();

  // Carregar dados do localStorage
  const loadData = useCallback(() => {
    const savedMessages = localStorage.getItem('ox-maturador-messages');
    const savedPairs = localStorage.getItem('ox-enhanced-maturador-config');
    
    if (savedMessages) {
      const data = JSON.parse(savedMessages);
      setMessages(data.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })));
    }

    if (savedPairs) {
      const config = JSON.parse(savedPairs);
      if (config.selectedPairs) {
        setChipPairs(config.selectedPairs.map((pair: any) => ({
          ...pair,
          lastActivity: pair.lastActivity ? new Date(pair.lastActivity) : new Date()
        })));
        setIsRunning(config.isRunning || false);
      }
    }
  }, []);

  // Salvar dados no localStorage
  const saveData = useCallback((newMessages: MaturadorMessage[], newPairs: ChipPair[]) => {
    localStorage.setItem('ox-maturador-messages', JSON.stringify(newMessages));
    localStorage.setItem('ox-enhanced-maturador-config', JSON.stringify({
      isRunning,
      selectedPairs: newPairs
    }));
  }, [isRunning]);

  // Enviar mensagem real através da Evolution API
  const sendRealMessage = useCallback(async (
    fromChipName: string,
    toChipName: string,
    message: string
  ): Promise<void> => {
    try {
      console.log(`🚀 INICIANDO ENVIO DE MENSAGEM REAL: ${fromChipName} -> ${toChipName}`);
      console.log(`Mensagem: "${message}"`);
      console.log(`Conexões disponíveis:`, connections.map(c => ({ name: c.name, status: c.status, phone: c.phone })));
      
      // Encontrar as conexões pelos nomes
      const fromConnection = connections.find(conn => conn.name === fromChipName);
      const toConnection = connections.find(conn => conn.name === toChipName);
      
      console.log(`Conexão remetente encontrada:`, fromConnection ? { name: fromConnection.name, status: fromConnection.status, phone: fromConnection.phone, instance: fromConnection.evolutionInstanceName } : 'NÃO ENCONTRADA');
      console.log(`Conexão destinatário encontrada:`, toConnection ? { name: toConnection.name, status: toConnection.status, phone: toConnection.phone, instance: toConnection.evolutionInstanceName } : 'NÃO ENCONTRADA');
      
      if (!fromConnection || !toConnection) {
        throw new Error(`Conexão não encontrada: ${fromChipName} ou ${toChipName}`);
      }
      
      if (fromConnection.status !== 'active' || toConnection.status !== 'active') {
        throw new Error(`Uma das conexões não está ativa: ${fromChipName} (${fromConnection.status}) ou ${toChipName} (${toConnection.status})`);
      }

      // Validar se as conexões têm os dados necessários para envio
      if (!fromConnection.evolutionInstanceName) {
        throw new Error(`Conexão ${fromChipName} não tem instanceName configurado. Configure a instância na Evolution API.`);
      }

      if (!toConnection.phone && !toConnection.evolutionInstanceId) {
        throw new Error(`Conexão ${toChipName} não tem telefone configurado. Configure o número de telefone.`);
      }
      
      // Preparar número do destinatário (limpar formatação)
      let toNumber = toConnection.phone || toConnection.evolutionInstanceId || '';
      if (toNumber.startsWith('+')) {
        toNumber = toNumber.substring(1);
      }
      toNumber = toNumber.replace(/\D/g, ''); // Remove tudo que não for dígito

      // Se o número parece inválido, tenta sincronizar a conexão para pegar o número real da instância
      if (!toNumber || toNumber.length < 11) {
        if ((toConnection as any).id) {
          console.log('⚠️ Número curto/ausente. Tentando sincronizar conexão para obter telefone...');
          try {
            await syncWithEvolutionAPI((toConnection as any).id);
          } catch (e) {
            console.warn('Falha ao sincronizar conexão do destinatário:', e);
          }
          const refreshed = connections.find(c => c.name === toConnection.name);
          let candidate = refreshed?.phone || '';
          candidate = candidate.replace(/\D/g, '');
          if (candidate) {
            toNumber = candidate;
          }
        }
      }

      // Ajuste específico Brasil: se vier 55 + DDD (2) + 8 dígitos (12 no total), adiciona o 9 após o DDD
      if (toNumber.startsWith('55') && toNumber.length === 12) {
        const ddd = toNumber.slice(2, 4);
        const rest = toNumber.slice(4);
        toNumber = `55${ddd}9${rest}`;
        console.log('✔️ Corrigido número BR (adicionado 9):', toNumber);
      }

      // Validação básica: E.164 típico precisa de pelo menos 12-13 dígitos; no Brasil celulares = 13
      if (!toNumber || toNumber.length < 12 || (toNumber.startsWith('55') && toNumber.length < 13)) {
        throw new Error(`Número de telefone inválido para ${toChipName}. Use o formato com DDI e DDD (ex: 55119XXXXXXXX).`);
      }
      
      // Preparar payload para envio
      const payload = {
        instance: fromConnection.evolutionInstanceName, // quem envia
        number: toNumber,                               // quem recebe
        text: message                                   // conteúdo
      };
      
      console.log(`Detalhes do envio:`, {
        instanceName: fromConnection.evolutionInstanceName, // quem envia
        receiver: toNumber,                                // quem recebe
        message: message.substring(0, 50) + '...'
      });

      // Envia no formato esperado pela Edge Function (action + campos corretos)
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'sendMessage',
          instanceName: fromConnection.evolutionInstanceName,
          to: toNumber,
          message
        }
      });
      
      if (error) {
        console.error('Erro ao enviar mensagem via Evolution API:', error);
        throw error;
      }
      
      console.log('Mensagem real enviada com sucesso:', data);
      
    } catch (error: any) {
      console.error('Erro ao enviar mensagem real:', error);
      throw error;
    }
  }, [connections]);

  // Gerar mensagem humanizada usando OpenAI com controles rigorosos
  const generateMessage = useCallback(async (
    chipName: string, 
    prompt: string, 
    conversationHistory: MaturadorMessage[],
    isFirstMessage: boolean = false
  ): Promise<string> => {
    try {
      console.log(`🤖 Gerando mensagem para ${chipName} (primeira: ${isFirstMessage})`);
      
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          prompt,
          chipName,
          conversationHistory: conversationHistory.slice(-3).map(msg => ({
            content: msg.content,
            isFromThisChip: msg.fromChipName === chipName
          })),
          isFirstMessage,
          responseDelay: 30 + Math.random() * 30 // 30-60 segundos
        }
      });

      if (error) {
        console.error('Erro ao chamar OpenAI:', error);
        throw error;
      }

      if (!data?.message) {
        throw new Error('Resposta inválida da OpenAI');
      }

      console.log(`✅ Mensagem gerada (${data.message.length} chars):`, data.message);
      return data.message;
    } catch (error) {
      console.error('Erro ao gerar mensagem:', error);
      
      // Fallback humanizado em caso de erro
      const fallbacks = [
        "kkk 😅",
        "show!",
        "entendi 🤔",
        "massa!",
        "boa! 👍",
        "legal isso",
        "interessante 😊"
      ];
      
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
  }, []);

  // Processar conversa de um par de chips
  const processChipPairConversation = useCallback(async (pair: ChipPair) => {
    try {
      console.log(`=== PROCESSANDO CONVERSA ===`);
      console.log(`Par: ${pair.firstChipName} <-> ${pair.secondChipName}`);
      console.log('Par ativo?', pair.isActive);
      console.log('Status do par:', pair.status);

      // Buscar histórico de conversa deste par
      const pairHistory = messages.filter(msg => msg.chipPairId === pair.id);
      
      // Determinar qual chip deve responder (alternar)
      const lastMessage = pairHistory[pairHistory.length - 1];
      const respondingChip = !lastMessage || lastMessage.fromChipId === pair.secondChipId
        ? { id: pair.firstChipId, name: pair.firstChipName }
        : { id: pair.secondChipId, name: pair.secondChipName };
      
      const receivingChip = respondingChip.id === pair.firstChipId
        ? { id: pair.secondChipId, name: pair.secondChipName }
        : { id: pair.firstChipId, name: pair.firstChipName };

      // Buscar prompt específico do chip que vai responder
      const respondingConnection = connections.find(c => c.name === respondingChip.name);
      const chipPrompt = respondingConnection?.prompt || 'Você é um assistente amigável e prestativo. Responda de forma natural, breve e humanizada. Use emojis ocasionalmente para dar mais naturalidade às conversas.';
      
      console.log(`📝 Usando prompt do chip ${respondingChip.name}:`, chipPrompt.substring(0, 100) + '...');
      
      // Gerar mensagem humanizada usando o prompt do chip
      const messageContent = await generateMessage(
        respondingChip.name,
        chipPrompt,
        pairHistory,
        false
      );

      // Aplicar delay humanizado antes do envio (simular digitação)
      const typingDelay = Math.random() * 3000 + 2000; // 2-5 segundos de "digitação"
      console.log(`⌨️ Simulando digitação por ${typingDelay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, typingDelay));

      // Enviar mensagem real entre os chips
      try {
        await sendRealMessage(respondingChip.name, receivingChip.name, messageContent);
        console.log(`✅ Mensagem real enviada: ${respondingChip.name} -> ${receivingChip.name}`);
        
        // Atualizar contador no Supabase
        await supabase
          .from('saas_pares_maturacao')
          .update({ 
            messages_count: pair.messagesCount + 1,
            last_activity: new Date().toISOString()
          })
          .eq('id', pair.id);
        
        // Só criar mensagem no histórico se o envio real foi bem-sucedido
        const newMessage: MaturadorMessage = {
          id: crypto.randomUUID(),
          chipPairId: pair.id,
          fromChipId: respondingChip.id,
          fromChipName: respondingChip.name,
          toChipId: receivingChip.id,
          toChipName: receivingChip.name,
          content: messageContent,
          timestamp: new Date(),
          aiModel: 'gpt-4o-mini'
        };

        // Atualizar estado apenas se mensagem foi enviada com sucesso
        setMessages(prev => {
          const updated = [newMessage, ...prev];
          return updated;
        });

        setChipPairs(prev => {
          const updated = prev.map(p => 
            p.id === pair.id 
              ? { 
                  ...p, 
                  messagesCount: p.messagesCount + 1,
                  lastActivity: new Date() 
                }
              : p
          );
          
          // Salvar dados atualizados
          const newMessages = [newMessage, ...messages];
          saveData(newMessages, updated);
          
          return updated;
        });

        console.log(`Mensagem processada com sucesso: ${respondingChip.name} -> ${receivingChip.name}`);
        
      } catch (error: any) {
        console.error('❌ Erro ao enviar mensagem real:', error);
        
        let errorMessage = `Não foi possível enviar mensagem real de ${respondingChip.name} para ${receivingChip.name}.`;
        
        if (error.message && error.message.includes('instanceName')) {
          errorMessage += ' Configure a instância Evolution API nas conexões.';
        } else if (error.message && error.message.includes('telefone')) {
          errorMessage += ' Configure os números de telefone nas conexões.';
        } else if (error.message) {
          errorMessage += ` Erro: ${error.message}`;
        }
        
        toast({
          title: "Erro no Envio",
          description: errorMessage,
          variant: "destructive"
        });
        // Não salva mensagem nem incrementa contador se falhou o envio real
        return;
      }

    } catch (error) {
      console.error('Erro ao processar conversa:', error);
      toast({
        title: "Erro na Conversa",
        description: `Erro ao gerar mensagem para ${pair.firstChipName} <-> ${pair.secondChipName}`,
        variant: "destructive"
      });
    }
  }, [messages, generateMessage, sendRealMessage, saveData, toast, connections]);

  // Iniciar maturador
  const startMaturador = useCallback(async () => {
    console.log('=== INICIANDO MATURADOR ===');
    console.log('Total de pares:', chipPairs.length);
    console.log('Pares configurados:', chipPairs);
    
    const activePairs = chipPairs.filter(pair => pair.isActive && pair.status !== 'paused');
    console.log('Pares ativos encontrados:', activePairs.length, activePairs);
    
    if (activePairs.length === 0) {
      console.warn('Nenhum par ativo encontrado!');
      return;
    }
    
    // Sincroniza dados das conexões com a Evolution API antes de iniciar
    try {
      await Promise.all(activePairs.flatMap(pair => {
        const from = connections.find(c => c.name === pair.firstChipName);
        const to = connections.find(c => c.name === pair.secondChipName);
        const tasks: Promise<void>[] = [];
        if (from?.id) tasks.push(syncWithEvolutionAPI(from.id));
        if (to?.id) tasks.push(syncWithEvolutionAPI(to.id));
        return tasks;
      }));
    } catch (e) {
      console.warn('Falha ao sincronizar conexões antes de iniciar:', e);
    }

    setIsRunning(true);
    
    // Criar intervalos contínuos para cada par
    activePairs.forEach(pair => {
      const pairId = pair.id;
      console.log(`📍 Configurando intervalo para par: ${pair.firstChipName} <-> ${pair.secondChipName}`);
      
      // Função recursiva para manter conversas ativas
      const scheduleNextMessage = async () => {
        try {
          // Verificar se ainda está ativo antes de processar
          const currentPair = chipPairs.find(p => p.id === pairId);
          if (!currentPair?.isActive || currentPair.status === 'paused') {
            console.log(`⏸️ Par ${pairId} pausado ou inativo`);
            return;
          }
          
          console.log(`💬 Processando mensagem do par: ${pair.firstChipName} <-> ${pair.secondChipName}`);
          await processChipPairConversation(pair);
          
          // Agendar próxima mensagem após delay de 1-3 minutos
          const nextDelay = (60 + Math.random() * 120) * 1000;
          console.log(`⏰ Próxima mensagem em ${nextDelay/1000}s para par ${pairId}`);
          
          const timeout = setTimeout(() => {
            scheduleNextMessage();
          }, nextDelay);
          
          intervalRefs.current.set(pairId, timeout as any);
          
        } catch (error) {
          console.error(`❌ Erro no par ${pairId}:`, error);
          // Mesmo com erro, reagendar para tentar novamente
          const retryDelay = 30000; // 30 segundos
          const timeout = setTimeout(() => {
            scheduleNextMessage();
          }, retryDelay);
          intervalRefs.current.set(pairId, timeout as any);
        }
      };
      
      // Iniciar primeira mensagem com delay aleatório inicial
      const initialDelay = Math.random() * 10000; // 0-10 segundos
      console.log(`🚀 Iniciando par ${pairId} em ${initialDelay/1000}s`);
      setTimeout(() => {
        scheduleNextMessage();
      }, initialDelay);
    });

    console.log('✅ Total de pares configurados:', activePairs.length);

    toast({
      title: "Maturador Iniciado",
      description: `Sistema ativado para ${activePairs.length} pares`,
    });
  }, [chipPairs, processChipPairConversation, toast]);

  // Parar maturador
  const stopMaturador = useCallback(() => {
    console.log('Parando maturador...');
    setIsRunning(false);
    
    // Limpar todos os intervalos
    intervalRefs.current.forEach(interval => {
      clearInterval(interval);
    });
    intervalRefs.current.clear();

    toast({
      title: "Maturador Parado",
      description: "Sistema de conversas automáticas desativado",
    });
  }, [toast]);

  // Obter mensagens de um par específico
  const getPairMessages = useCallback((pairId: string) => {
    return messages.filter(msg => msg.chipPairId === pairId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [messages]);

  // Obter estatísticas
  const getStats = useCallback(() => {
    const activePairs = chipPairs.filter(p => p.isActive).length;
    const totalMessages = messages.length;
    const messagesLast24h = messages.filter(
      msg => Date.now() - msg.timestamp.getTime() < 24 * 60 * 60 * 1000
    ).length;

    return {
      activePairs,
      totalMessages,
      messagesLast24h,
      isRunning
    };
  }, [chipPairs, messages, isRunning]);

  return {
    isRunning,
    messages,
    chipPairs,
    setChipPairs,
    loadData,
    startMaturador,
    stopMaturador,
    getPairMessages,
    getStats,
    processChipPairConversation
  };
};
