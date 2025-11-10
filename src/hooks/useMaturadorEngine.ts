import { useState, useCallback, useRef, useEffect } from 'react';
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
  const processingPairs = useRef<Set<string>>(new Set()); // Controle de pares em processamento
  const backendIntervalRef = useRef<NodeJS.Timeout | null>(null); // Intervalo global do backend
  const { toast } = useToast();
  const { connections, getConnection, syncWithEvolutionAPI } = useConnections();

  // Carregar pares do Supabase ao invés de localStorage
  const loadData = useCallback(async () => {
    try {
      // Carregar mensagens do localStorage
      const savedMessages = localStorage.getItem('ox-maturador-messages');
      if (savedMessages) {
        const data = JSON.parse(savedMessages);
        setMessages(data.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }

      // Carregar pares do Supabase
      const { data: dbPairs, error } = await supabase
        .from('saas_pares_maturacao')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (dbPairs && dbPairs.length > 0) {
        const mappedPairs: ChipPair[] = dbPairs.map((pair: any) => ({
          id: pair.id,
          firstChipId: pair.nome_chip1,
          firstChipName: pair.nome_chip1,
          secondChipId: pair.nome_chip2,
          secondChipName: pair.nome_chip2,
          isActive: pair.is_active,
          messagesCount: pair.messages_count || 0,
          lastActivity: pair.last_activity ? new Date(pair.last_activity) : new Date(),
          status: pair.status || 'stopped',
          useInstancePrompt: pair.use_instance_prompt || false,
          instancePrompt: pair.instance_prompt
        }));
        
        setChipPairs(mappedPairs);
        console.log(`✅ ${mappedPairs.length} pares carregados do Supabase`);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
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
      
      // Enviar histórico completo das últimas 20 mensagens para manter contexto
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          prompt,
          chipName,
          conversationHistory: conversationHistory.slice(-20).map(msg => ({
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
      console.log(`=== PROCESSANDO CONVERSA DO PAR ===`);
      console.log(`Par: ${pair.firstChipName} <-> ${pair.secondChipName}`);

      // Verificar se este par já está sendo processado
      if (processingPairs.current.has(pair.id)) {
        console.log(`⏸️ Par ${pair.firstChipName} <-> ${pair.secondChipName} já está em processamento, aguardando...`);
        return;
      }

      // Marcar par como em processamento
      processingPairs.current.add(pair.id);

      // Buscar histórico de conversa deste par do estado atual
      const pairHistory = messages.filter(msg => msg.chipPairId === pair.id);
      
      // Determinar qual chip deve responder (alternar estritamente)
      const lastMessage = pairHistory[pairHistory.length - 1];
      console.log('📋 Última mensagem:', lastMessage ? `${lastMessage.fromChipName} disse: "${lastMessage.content.substring(0, 50)}..."` : 'Nenhuma');
      
      const respondingChip = !lastMessage || lastMessage.fromChipId === pair.secondChipId
        ? { id: pair.firstChipId, name: pair.firstChipName }
        : { id: pair.secondChipId, name: pair.secondChipName };
      
      const receivingChip = respondingChip.id === pair.firstChipId
        ? { id: pair.secondChipId, name: pair.secondChipName }
        : { id: pair.firstChipId, name: pair.firstChipName };

      // Buscar prompt específico do chip que vai responder
      const respondingConnection = connections.find(c => c.name === respondingChip.name);
      
      if (!respondingConnection) {
        console.error(`❌ Conexão não encontrada para ${respondingChip.name}`);
        throw new Error(`Conexão ${respondingChip.name} não encontrada`);
      }
      
      // SEMPRE usar o prompt da conexão, sem fallback
      const chipPrompt = respondingConnection.prompt;
      
      if (!chipPrompt || chipPrompt.trim() === '') {
        console.error(`❌ Prompt não definido para ${respondingChip.name}`);
        throw new Error(`Configure um prompt para ${respondingChip.name} na aba "Prompts de IA"`);
      }
      
      console.log(`🎯 Chip respondendo: ${respondingChip.name} (próximo será ${receivingChip.name})`);
      console.log(`📝 Prompt do chip (completo): ${chipPrompt}`);
      
      // Gerar mensagem humanizada usando o prompt do chip
      const messageContent = await generateMessage(
        respondingChip.name,
        chipPrompt,
        pairHistory,
        pairHistory.length === 0
      );

      console.log(`✅ Mensagem gerada (${messageContent.length} chars): ${messageContent.substring(0, 100)}...`);

      // Aplicar delay humanizado antes do envio (simular digitação)
      const typingDelay = Math.random() * 2000 + 1000; // 1-3 segundos
      console.log(`⌨️ Simulando digitação por ${(typingDelay/1000).toFixed(1)}s...`);
      await new Promise(resolve => setTimeout(resolve, typingDelay));

      // Enviar mensagem real entre os chips
      try {
        console.log(`💬 Enviando mensagem de ${respondingChip.name} para ${receivingChip.name}`);
        await sendRealMessage(respondingChip.name, receivingChip.name, messageContent);
        console.log(`✅ Mensagem enviada com sucesso!`);
        
        // Atualizar contador no Supabase
        await supabase
          .from('saas_pares_maturacao')
          .update({ 
            messages_count: pair.messagesCount + 1,
            last_activity: new Date().toISOString()
          })
          .eq('id', pair.id);
        
        // Criar mensagem no histórico
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

        // Atualizar estado - garantir que a mensagem seja adicionada antes de continuar
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

        console.log(`✅ Mensagem salva: ${respondingChip.name} → ${receivingChip.name}`);
        
        // Aguardar mais tempo para garantir que o estado foi totalmente atualizado
        // Isso evita que o mesmo chip envie múltiplas mensagens seguidas
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        
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
        
        throw error; // Propagar erro para parar o loop deste par
      }

    } catch (error) {
      console.error('❌ Erro ao processar conversa:', error);
      throw error; // Propagar erro
    }
  }, [messages, generateMessage, sendRealMessage, saveData, toast, connections]);

  // Iniciar maturador
  const startMaturador = useCallback(async () => {
    console.log('=== INICIANDO MATURADOR ===');
    
    // Recarregar pares do Supabase antes de iniciar
    await loadData();
    
    // Aguardar um pouco para garantir que o estado foi atualizado
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Buscar pares ativos diretamente do Supabase
    const { data: dbPairs, error } = await supabase
      .from('saas_pares_maturacao')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Erro ao carregar pares:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pares de maturação",
        variant: "destructive"
      });
      return;
    }

    if (!dbPairs || dbPairs.length === 0) {
      console.warn('⚠️ Nenhum par ativo encontrado!');
      toast({
        title: "Nenhum par ativo",
        description: "Ative pelo menos um par para iniciar o maturador",
        variant: "destructive"
      });
      return;
    }

    const activePairs: ChipPair[] = dbPairs.map((pair: any) => ({
      id: pair.id,
      firstChipId: pair.nome_chip1,
      firstChipName: pair.nome_chip1,
      secondChipId: pair.nome_chip2,
      secondChipName: pair.nome_chip2,
      isActive: pair.is_active,
      messagesCount: pair.messages_count || 0,
      lastActivity: pair.last_activity ? new Date(pair.last_activity) : new Date(),
      status: pair.status || 'running',
      useInstancePrompt: pair.use_instance_prompt || false,
      instancePrompt: pair.instance_prompt
    }));

    console.log(`✅ ${activePairs.length} pares ativos carregados do Supabase`);
    
    // Atualizar status dos pares para 'running' no Supabase
    await Promise.all(activePairs.map(pair => 
      supabase
        .from('saas_pares_maturacao')
        .update({ status: 'running' })
        .eq('id', pair.id)
    ));
    
    // Sincronizar conexões antes de iniciar
    try {
      console.log('🔄 Sincronizando conexões com Evolution API...');
      await Promise.all(activePairs.flatMap(pair => {
        const from = connections.find(c => c.name === pair.firstChipName);
        const to = connections.find(c => c.name === pair.secondChipName);
        const tasks: Promise<void>[] = [];
        if (from?.id) tasks.push(syncWithEvolutionAPI(from.id));
        if (to?.id) tasks.push(syncWithEvolutionAPI(to.id));
        return tasks;
      }));
      console.log('✅ Sincronização concluída');
    } catch (e) {
      console.warn('⚠️ Falha ao sincronizar conexões:', e);
    }

    setIsRunning(true);
    setChipPairs(activePairs);
    
    // Iniciar conversa contínua para cada par
    activePairs.forEach(pair => {
      const pairId = pair.id;
      console.log(`🚀 Iniciando conversa contínua para par: ${pair.firstChipName} <-> ${pair.secondChipName}`);
      
      // Função recursiva para manter conversas ininterruptas
      const keepConversationGoing = async () => {
        try {
          // Verificar status do par no Supabase (não verificar isRunning - usar apenas status do par)
          const { data: currentPair } = await supabase
            .from('saas_pares_maturacao')
            .select('*')
            .eq('id', pairId)
            .single();
          
          if (!currentPair || !currentPair.is_active || currentPair.status !== 'running') {
            console.log(`⏸️ Par ${pairId} pausado ou inativo - parando loop`);
            return;
          }
          
        // Processar mensagem
        console.log(`💬 Processando mensagem do par ${pairId}...`);
        await processChipPairConversation(pair);
        
        // Delay humanizado entre mensagens (12-20 segundos) para conversa mais natural
        // Tempo suficiente para processar e garantir alternância correta
        const nextDelay = (12 + Math.random() * 8) * 1000;
        console.log(`⏰ Próxima mensagem do par ${pairId} em ${(nextDelay/1000).toFixed(1)}s`);
        
        // Agendar próxima mensagem para continuar indefinidamente
        const timeout = setTimeout(() => {
          keepConversationGoing(); // Chamada recursiva para continuar indefinidamente
        }, nextDelay);
          
          intervalRefs.current.set(pairId, timeout as any);
          
        } catch (error) {
          console.error(`❌ Erro no par ${pairId}:`, error);
          
          // Em caso de erro, aguardar menos tempo antes de tentar novamente
          const retryDelay = 10000; // 10 segundos
          console.log(`🔄 Tentando novamente o par ${pairId} em ${retryDelay/1000}s`);
          
          const timeout = setTimeout(() => {
            keepConversationGoing(); // Continuar tentando mesmo após erro
          }, retryDelay);
          
          intervalRefs.current.set(pairId, timeout as any);
        }
      };
      
      // Iniciar conversa imediatamente
      console.log(`▶️ Iniciando primeira mensagem do par ${pairId}...`);
      keepConversationGoing();
    });

    console.log(`✅ ${activePairs.length} par(es) em conversa contínua`);

    toast({
      title: "Maturador Iniciado",
      description: `${activePairs.length} ${activePairs.length === 1 ? 'par está' : 'pares estão'} conversando continuamente`,
    });
  }, [isRunning, processChipPairConversation, toast, connections, syncWithEvolutionAPI, loadData]);

  // Parar maturador
  const stopMaturador = useCallback(async () => {
    console.log('=== PARANDO MATURADOR ===');
    setIsRunning(false);
    
    // Atualizar status de todos os pares para 'stopped' no Supabase
    await supabase
      .from('saas_pares_maturacao')
      .update({ status: 'stopped' })
      .eq('is_active', true);
    
    // Limpar todos os intervalos/timeouts
    intervalRefs.current.forEach((timeout) => {
      clearTimeout(timeout);
    });
    intervalRefs.current.clear();
    
    // Atualizar estado local dos pares
    setChipPairs(prev => prev.map(p => ({ ...p, status: 'stopped' as const })));
    
    console.log('✅ Todas as conversas interrompidas');

    toast({
      title: "Maturador Parado",
      description: "Sistema de conversas automáticas desativado",
    });
  }, [toast]);

  // Iniciar par individual
  const startPair = useCallback(async (pairId: string) => {
    const pair = chipPairs.find(p => p.id === pairId);
    if (!pair) return;

    console.log(`🚀 Iniciando par individual: ${pair.firstChipName} <-> ${pair.secondChipName}`);
    
    // Atualizar status do par no Supabase
    await supabase
      .from('saas_pares_maturacao')
      .update({ status: 'running', is_active: true })
      .eq('id', pairId);
    
    // Atualizar status local
    const updatedPairs = chipPairs.map(p => 
      p.id === pairId 
        ? { ...p, status: 'running' as const, isActive: true }
        : p
    );
    setChipPairs(updatedPairs);
    saveData(messages, updatedPairs);

    // Função recursiva para manter conversas ininterruptas
    const keepConversationGoing = async () => {
      try {
        // Verificar status do par no Supabase
        const { data: currentPair } = await supabase
          .from('saas_pares_maturacao')
          .select('*')
          .eq('id', pairId)
          .single();
        
        if (!currentPair || !currentPair.is_active || currentPair.status !== 'running') {
          console.log(`⏸️ Par ${pairId} pausado ou inativo - parando loop`);
          return;
        }
        
        // Processar mensagem
        console.log(`💬 Processando mensagem do par ${pairId}...`);
        await processChipPairConversation(pair);
        
        const nextDelay = (12 + Math.random() * 8) * 1000;
        console.log(`⏰ Próxima mensagem do par ${pairId} em ${(nextDelay/1000).toFixed(1)}s`);
        
        // Agendar próxima mensagem para continuar indefinidamente
        const timeout = setTimeout(() => {
          keepConversationGoing();
        }, nextDelay);
        
        intervalRefs.current.set(pairId, timeout as any);
        
      } catch (error) {
        console.error(`❌ Erro no par ${pairId}:`, error);
        
        // Em caso de erro, aguardar menos tempo antes de tentar novamente
        const retryDelay = 10000; // 10 segundos
        console.log(`🔄 Tentando novamente o par ${pairId} em ${retryDelay/1000}s`);
        
        const timeout = setTimeout(() => {
          keepConversationGoing();
        }, retryDelay);
        
        intervalRefs.current.set(pairId, timeout as any);
      }
    };
    
    // Iniciar conversa imediatamente
    console.log(`▶️ Iniciando primeira mensagem do par ${pairId}...`);
    keepConversationGoing();

    toast({
      title: "Par Iniciado",
      description: `${pair.firstChipName} ↔ ${pair.secondChipName}`,
    });
  }, [chipPairs, messages, processChipPairConversation, saveData, toast]);

  // Parar par individual
  const stopPair = useCallback(async (pairId: string) => {
    const pair = chipPairs.find(p => p.id === pairId);
    if (!pair) return;

    console.log(`⏸️ Parando par: ${pair.firstChipName} <-> ${pair.secondChipName}`);
    
    // Atualizar status do par no Supabase
    await supabase
      .from('saas_pares_maturacao')
      .update({ status: 'stopped' })
      .eq('id', pairId);
    
    // Atualizar status local
    const updatedPairs = chipPairs.map(p => 
      p.id === pairId 
        ? { ...p, status: 'stopped' as const }
        : p
    );
    setChipPairs(updatedPairs);
    saveData(messages, updatedPairs);

    // Limpar timeout do par
    const timeout = intervalRefs.current.get(pairId);
    if (timeout) {
      clearTimeout(timeout);
      intervalRefs.current.delete(pairId);
    }

    toast({
      title: "Par Pausado",
      description: `${pair.firstChipName} ↔ ${pair.secondChipName}`,
    });
  }, [chipPairs, messages, saveData, toast]);

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

  // Limpar histórico de um par específico
  const clearPairHistory = useCallback((pairId: string) => {
    const updatedMessages = messages.filter(msg => msg.chipPairId !== pairId);
    setMessages(updatedMessages);
    
    // Resetar contador do par
    const updatedPairs = chipPairs.map(p => 
      p.id === pairId ? { ...p, messagesCount: 0 } : p
    );
    setChipPairs(updatedPairs);
    
    saveData(updatedMessages, updatedPairs);
    
    toast({
      title: "Histórico Limpo",
      description: "O histórico deste par foi removido",
    });
  }, [messages, chipPairs, saveData, toast]);

  // Limpar todo o histórico
  const clearAllHistory = useCallback(() => {
    setMessages([]);
    
    const updatedPairs = chipPairs.map(p => ({ ...p, messagesCount: 0 }));
    setChipPairs(updatedPairs);
    
    saveData([], updatedPairs);
    
    toast({
      title: "Histórico Completo Limpo",
      description: "Todas as conversas foram removidas",
    });
  }, [chipPairs, saveData, toast]);

  // Função para chamar o backend e forçar conversas
  const forceMaturationFromBackend = async () => {
    try {
      console.log('🔄 Chamando backend para forçar maturação...');
      const { data, error } = await supabase.functions.invoke('force-maturation');
      
      if (error) {
        console.error('❌ Erro ao chamar force-maturation:', error);
        return;
      }
      
      console.log('✅ Backend respondeu:', data);
      
      // Recarregar mensagens após o backend processar
      await loadData();
      
    } catch (error) {
      console.error('❌ Erro ao forçar maturação pelo backend:', error);
    }
  };

  // Iniciar polling do backend quando houver pares ativos
  useEffect(() => {
    const hasActivePairs = chipPairs.some(pair => pair.status === 'running');
    
    if (hasActivePairs && !backendIntervalRef.current) {
      console.log('🚀 Iniciando polling do backend (a cada 90 segundos)');
      
      // Chamar imediatamente na primeira vez
      forceMaturationFromBackend();
      
      // Depois chamar a cada 90 segundos (1min30s) com variação de ±15s
      const interval = setInterval(() => {
        const randomDelay = Math.random() * 30000; // 0-30 segundos de variação
        setTimeout(() => {
          forceMaturationFromBackend();
        }, randomDelay);
      }, 90000);
      
      backendIntervalRef.current = interval;
      
    } else if (!hasActivePairs && backendIntervalRef.current) {
      console.log('⏸️ Parando polling do backend (nenhum par ativo)');
      clearInterval(backendIntervalRef.current);
      backendIntervalRef.current = null;
    }
    
    return () => {
      if (backendIntervalRef.current) {
        clearInterval(backendIntervalRef.current);
        backendIntervalRef.current = null;
      }
    };
  }, [chipPairs]);

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    isRunning,
    messages,
    chipPairs,
    setChipPairs,
    loadData,
    startMaturador,
    stopMaturador,
    startPair,
    stopPair,
    getPairMessages,
    getStats,
    processChipPairConversation,
    clearPairHistory,
    clearAllHistory
  };
};
