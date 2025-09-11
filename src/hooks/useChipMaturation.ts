import { useEffect, useCallback } from 'react';
import { useConnections } from '@/contexts/ConnectionsContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para controlar a maturação dos chips e iniciar conversas automáticas
 */
export const useChipMaturation = () => {
  const { connections } = useConnections();
  const { toast } = useToast();

  // Gera um prompt para iniciar uma conversa entre dois chips
  const generateConversationPrompt = useCallback((chip1: any, chip2: any) => {
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
  }, []);

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
    const prompt = generateConversationPrompt(chip1, chip2);
    const success = await sendMessageBetweenChips(chip1, chip2, prompt);

    if (success) {
      // Simular resposta após 30-60 segundos
      const responseDelay = Math.random() * 30000 + 30000; // 30-60 segundos
      
      setTimeout(async () => {
        const responsePrompt = generateConversationPrompt(chip2, chip1);
        await sendMessageBetweenChips(chip2, chip1, responsePrompt);
      }, responseDelay);
    }
  }, [connections, generateConversationPrompt, sendMessageBetweenChips]);

  // Monitor para iniciar conversas automáticas quando chips estão ativos
  useEffect(() => {
    const activeChips = connections.filter(conn => 
      conn.status === 'active' && 
      conn.isActive && 
      conn.phone && 
      conn.displayName &&
      conn.evolutionInstanceName
    );

    console.log(`🔍 Chips ativos disponíveis para maturação: ${activeChips.length}`);

    if (activeChips.length >= 2) {
      console.log('✅ Condições atendidas para maturação - iniciando conversas automáticas');
      
      // Iniciar primeira conversa imediatamente
      const timer1 = setTimeout(() => {
        startChipConversation();
      }, 5000); // 5 segundos de delay inicial

      // Programar conversas periódicas a cada 2-5 minutos
      const timer2 = setInterval(() => {
        if (Math.random() > 0.3) { // 70% de chance
          startChipConversation();
        }
      }, Math.random() * 180000 + 120000); // 2-5 minutos

      return () => {
        clearTimeout(timer1);
        clearInterval(timer2);
      };
    } else {
      console.log('⏳ Aguardando mais chips ativos para iniciar maturação...');
    }
  }, [connections.filter(c => c.status === 'active' && c.isActive && c.phone && c.displayName).length, startChipConversation]);

  return {
    startChipConversation,
    sendMessageBetweenChips
  };
};