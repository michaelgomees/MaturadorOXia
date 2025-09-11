import { useEffect, useCallback } from 'react';
import { useConnections } from '@/contexts/ConnectionsContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMaturadorPairs } from './useMaturadorPairs';
import { usePrompts } from './usePrompts';

/**
 * Hook para controlar a maturação dos chips e iniciar conversas automáticas
 */
export const useChipMaturation = () => {
  const { connections } = useConnections();
  const { toast } = useToast();
  const { pairs } = useMaturadorPairs();
  const { getGlobalPrompt } = usePrompts();

  // Gera um prompt para iniciar uma conversa entre dois chips usando prompt global
  const generateConversationPrompt = useCallback(async (chip1: any, chip2: any) => {
    try {
      const globalPrompt = getGlobalPrompt();
      if (globalPrompt) {
        // Usar a edge function OpenAI para gerar mensagem com prompt global
        const { data, error } = await supabase.functions.invoke('openai-chat', {
          body: {
            prompt: globalPrompt.conteudo,
            chipName: chip1.name,
            historyLength: 0
          }
        });

        if (data?.message && !error) {
          return data.message;
        }
      }
    } catch (error) {
      console.log('Usando prompt padrão devido a erro:', error);
    }
    
    // Fallback para prompts padrão
    const prompts = [
      "Olá! Como você está hoje?",
      "Oi! Tudo bem por aí?", 
      "Bom dia! Como foi seu fim de semana?",
      "Oi! Você tem alguma novidade interessante?",
      "Olá! Que tal conversarmos um pouco?",
      "Oi! Como estão as coisas?",
      "Bom dia! Espero que esteja tendo um ótimo dia!",
      "Olá! Já fez algo interessante hoje?"
    ];
    
    return prompts[Math.floor(Math.random() * prompts.length)];
  }, [getGlobalPrompt]);

  // Envia uma mensagem entre dois chips usando a API Evolution
  const sendMessageBetweenChips = useCallback(async (senderChip: any, receiverChip: any, message: string) => {
    try {
      console.log(`💬 Enviando mensagem de ${senderChip.name} para ${receiverChip.name}: ${message}`);
      
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
        throw new Error(data?.error || 'Falha ao enviar mensagem');
      }
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem entre chips:`, error);
      return false;
    }
  }, [toast]);

  // Inicia uma conversa entre dois chips ativos
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

    console.log(`🎯 Iniciando conversa entre ${chip1.name} e ${chip2.name}`);

    // Gerar prompt e enviar mensagem
    const prompt = await generateConversationPrompt(chip1, chip2);
    const success = await sendMessageBetweenChips(chip1, chip2, prompt);

    if (success) {
      // Simular resposta após 30-60 segundos
      const responseDelay = Math.random() * 30000 + 30000; // 30-60 segundos
      
      setTimeout(async () => {
        const responsePrompt = await generateConversationPrompt(chip2, chip1);
        await sendMessageBetweenChips(chip2, chip1, responsePrompt);
      }, responseDelay);
    }
  }, [connections, generateConversationPrompt, sendMessageBetweenChips]);

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
    sendMessageBetweenChips
  };
};