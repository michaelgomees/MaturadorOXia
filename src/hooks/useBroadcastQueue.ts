import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook global que mantém o polling de broadcast ativo sempre,
 * processando automaticamente a fila de mensagens pendentes
 */
export function useBroadcastQueue() {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      // Se não há usuário, limpar polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const checkAndPoll = async () => {
      try {
        // Verificar se existem campanhas ativas (status='running')
        const { data: activeCampaigns } = await supabase
          .from('saas_broadcast_campaigns')
          .select('id')
          .eq('status', 'running')
          .eq('usuario_id', user.id);

        if (activeCampaigns && activeCampaigns.length > 0) {
          // Se há campanhas rodando, garantir que o polling está ativo
          if (!pollingIntervalRef.current) {
            console.log('📡 Iniciando polling de broadcast...');
            startPolling();
          }
        } else {
          // Só parar se não há nenhuma campanha running
          if (pollingIntervalRef.current) {
            console.log('⏸️ Parando polling de broadcast (sem campanhas ativas)...');
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Erro ao verificar campanhas ativas:', error);
      }
    };

    const startPolling = () => {
      // Chamar imediatamente
      processBroadcastQueue();

      // Configurar intervalo de 5 segundos para processamento rápido
      pollingIntervalRef.current = setInterval(() => {
        processBroadcastQueue();
      }, 5000);
    };

    const processBroadcastQueue = async () => {
      try {
        console.log('📤 Processando fila de broadcast...');
        const { data, error } = await supabase.functions.invoke('send-broadcast-messages');
        
        if (error) {
          console.error('Erro ao processar fila de broadcast:', error);
        } else {
          if (data?.sent > 0) {
            console.log(`✅ ${data.sent} mensagens enviadas`);
          }
        }
      } catch (error) {
        console.error('Erro ao chamar send-broadcast-messages:', error);
      }
    };

    // Verificar campanhas ativas inicialmente
    checkAndPoll();

    // Verificar a cada 30 segundos se há campanhas ativas (para iniciar/parar polling)
    const checkInterval = setInterval(checkAndPoll, 30000);

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      clearInterval(checkInterval);
    };
  }, [user]);
}
