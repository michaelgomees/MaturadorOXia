import { useEffect, useCallback } from 'react';
import { useConnections } from '@/contexts/ConnectionsContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMaturadorPairs } from './useMaturadorPairs';

/**
 * Hook para controlar a maturação dos chips e iniciar conversas automáticas
 */
export const useChipMaturation = () => {
  const { connections } = useConnections();
  const { toast } = useToast();
  const { pairs } = useMaturadorPairs();
  // Busca sempre o prompt global mais recente diretamente do Supabase
  const fetchLatestGlobalPrompt = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('saas_prompts')
        .select('*')
        .eq('is_global', true)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      return data || null;
    } catch (e) {
      return null;
    }
  }, []);

  // Gera mensagem humanizada usando sempre o prompt global mais atualizado
  const generateConversationPrompt = useCallback(async (
    chip1: any, 
    chip2: any, 
    isFirstMessage: boolean = false,
    conversationHistory: any[] = []
  ) => {
    try {
      console.log(`🎯 Gerando mensagem para ${chip1.name} -> ${chip2.name} (primeira: ${isFirstMessage})`);
      
      // SEMPRE buscar prompt global mais recente para garantir atualização
      const globalPrompt = await fetchLatestGlobalPrompt();
      let effectivePrompt = globalPrompt?.conteudo || 'Participe de uma conversa natural e casual no WhatsApp. Seja conciso, humano e use emojis moderadamente.';
      
      // Verificar se existe par com prompt específico
      const matchingPair = pairs.find(p =>
        (p.nome_chip1 === chip1.name && p.nome_chip2 === chip2.name) ||
        (p.nome_chip1 === chip2.name && p.nome_chip2 === chip1.name)
      );

      if (matchingPair?.use_instance_prompt && matchingPair.instance_prompt) {
        effectivePrompt = matchingPair.instance_prompt;
        console.log('✅ Usando prompt da instância');
      } else {
        console.log('✅ Usando prompt global mais recente');
      }

      // Chamar OpenAI com configurações humanizadas
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          prompt: effectivePrompt,
          chipName: chip1.name,
          conversationHistory: conversationHistory.slice(-3), // Histórico limitado
          isFirstMessage,
          responseDelay: 30 + Math.random() * 30 // 30-60 segundos de delay
        }
      });

      if (data?.message && !error) {
        console.log(`✅ Mensagem gerada para ${chip1.name}:`, data.message);
        return data.message;
      }

      if (error) {
        console.error('Erro na OpenAI:', error);
      }
    } catch (error) {
      console.error('Erro ao gerar prompt:', error);
    }
    
    // Fallback humanizados para emergência
    const humanizedFallbacks = [
      "oi, tudo bom? 😊",
      "e aí, como tá?",
      "opa! blz?",
      "fala! tudo certo?",
      "oi! como foi o dia?",
      "e aí, novidades? 🤔",
      "opa, beleza?",
      "oi! tudo tranquilo?"
    ];
    
    return humanizedFallbacks[Math.floor(Math.random() * humanizedFallbacks.length)];
  }, [pairs, fetchLatestGlobalPrompt]);

  // Envia uma mensagem entre dois chips usando a API Evolution
  const sendMessageBetweenChips = useCallback(async (senderChip: any, receiverChip: any, message: string) => {
    try {
      console.log(`💬 Enviando mensagem de ${senderChip.name} para ${receiverChip.name}: ${message}`);
      
      // Apenas avisar se as conexões estão inativas, mas tentar enviar mesmo assim
      if (senderChip.status !== 'active' || receiverChip.status !== 'active') {
        console.warn('⚠️ Uma ou ambas conexões podem estar inativas, mas tentando enviar...');
      }
      
      // Chamar Edge Function para enviar mensagem
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'sendMessage',
          instanceName: senderChip.evolutionInstanceName,
          to: receiverChip.phone,
          message: message
        }
      });

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        
        // Apenas logar erro, não mostrar toast para cada erro
        const errorMessage = error.message || '';
        if (errorMessage.includes('Connection Closed')) {
          console.warn(`⚠️ Connection Closed para ${senderChip.name}, mas sistema continuará tentando`);
        }
        throw error;
      }

      if (data?.success) {
        console.log(`✅ Mensagem enviada com sucesso de ${senderChip.name} para ${receiverChip.name}`);
        
        // Incrementar contador de mensagens no par do Supabase
        const matchingPair = pairs.find(p => 
          (p.nome_chip1 === senderChip.name && p.nome_chip2 === receiverChip.name) ||
          (p.nome_chip1 === receiverChip.name && p.nome_chip2 === senderChip.name)
        );
        
        if (matchingPair) {
          await supabase
            .from('saas_pares_maturacao')
            .update({ 
              messages_count: matchingPair.messages_count + 1,
              last_activity: new Date().toISOString()
            })
            .eq('id', matchingPair.id);
        }
        
        toast({
          title: "🤖 Conversa Iniciada!",
          description: `${senderChip.displayName || senderChip.name} enviou mensagem para ${receiverChip.displayName || receiverChip.name}`,
        });
        
        return true;
      } else {
        const errorMsg = data?.error || 'Falha ao enviar mensagem';
        
        // Apenas logar o erro, não pausar pares
        if (errorMsg.includes('Connection Closed')) {
          console.warn(`⚠️ Connection Closed mas sistema continuará tentando`);
        }
        
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem entre chips:`, error);
      return false;
    }
  }, [toast, pairs]);

  // Resetar memórias das conversas dos chips (limpa conversation_history)
  const resetActiveChipsMemory = useCallback(async (apenasDuplasAtivas: boolean = true) => {
    try {
      const alvo = new Set<string>();
      if (apenasDuplasAtivas) {
        pairs.filter(p => p.is_active).forEach(p => {
          alvo.add(p.nome_chip1);
          alvo.add(p.nome_chip2);
        });
      } else {
        connections.forEach(c => alvo.add(c.name));
      }

      const nomes = Array.from(alvo);
      if (nomes.length === 0) {
        toast({ title: 'Nada para limpar', description: 'Nenhum chip selecionado para resetar memória.' });
        return;
      }

      const { error } = await supabase
        .from('saas_conexoes')
        .update({ conversation_history: [] })
        .in('nome', nomes);

      if (error) throw error;

      toast({ title: 'Memórias resetadas', description: `Limpamos ${nomes.length} chip(s).` });
    } catch (e: any) {
      console.error('Erro ao resetar memórias:', e);
      toast({ title: 'Erro', description: e.message || 'Falha ao resetar memórias', variant: 'destructive' });
    }
  }, [pairs, connections, toast]);

  // Inicia uma conversa entre dois chips ativos com mensagem de início da maturação
  const startChipConversation = useCallback(async () => {
    const activeChips = connections.filter(conn => 
      conn.status === 'active' && 
      conn.isActive && 
      conn.phone && 
      conn.displayName &&
      conn.evolutionInstanceName
    );

    if (activeChips.length < 2) {
      console.log('⚠️ Precisa de pelo menos 2 chips ativos para iniciar conversa');
      return;
    }

    // Selecionar dois chips aleatórios
    const shuffled = [...activeChips].sort(() => Math.random() - 0.5);
    const chip1 = shuffled[0];
    const chip2 = shuffled[1];

    console.log(`🎯 Iniciando nova maturação entre ${chip1.name} e ${chip2.name}`);

    // PRIMEIRO: Reset da memória dos chips para nova maturação
    await resetActiveChipsMemory(true);
    
    // SEGUNDO: Gerar mensagem de início da maturação
    const startMessage = await generateConversationPrompt(chip1, chip2, true, []);
    const success = await sendMessageBetweenChips(chip1, chip2, startMessage);

    if (success) {
      // TERCEIRO: Agendar primeira resposta humanizada com delay controlado
      const responseDelay = (30 + Math.random() * 30) * 1000; // 30-60 segundos
      console.log(`⏰ Próxima resposta em ${responseDelay/1000}s`);
      
      setTimeout(async () => {
        const responsePrompt = await generateConversationPrompt(chip2, chip1, false, []);
        await sendMessageBetweenChips(chip2, chip1, responsePrompt);
      }, responseDelay);
    }
  }, [connections, generateConversationPrompt, sendMessageBetweenChips, resetActiveChipsMemory]);

  // (Esta função foi movida para cima para resolver dependência)

  // Monitor para iniciar conversas automáticas APENAS quando pares estão ativos
  useEffect(() => {
    const activePairs = pairs.filter(pair => 
      pair.is_active && 
      pair.status === 'running'
    );

    console.log(`🔍 Pares ativos para maturação: ${activePairs.length}`);

    if (activePairs.length > 0) {
      console.log('✅ Pares ativos encontrados - sistema aguardando ativação manual');
      // Agora só inicia quando especificamente ativado no maturador
      // Não mais iniciando automaticamente
    } else {
      console.log('⏳ Nenhum par ativo no maturador...');
    }
  }, [pairs]);

  return {
    startChipConversation,
    sendMessageBetweenChips,
    resetActiveChipsMemory
  };
};