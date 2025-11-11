import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook global que mantém o polling do backend ativo sempre,
 * independente de qual aba o usuário está visualizando
 */
export const useGlobalMaturadorPolling = () => {
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
        // Verificar se existem pares ativos
        const { data: activePairs } = await supabase
          .from('saas_pares_maturacao')
          .select('id')
          .eq('status', 'running')
          .eq('usuario_id', user.id);

        if (activePairs && activePairs.length > 0) {
          // Se há pares ativos, garantir que o polling está ativo
          if (!pollingIntervalRef.current) {
            console.log('🔄 Iniciando polling global do backend...');
            startPolling();
          }
        } else {
          // Se não há pares ativos, parar o polling
          if (pollingIntervalRef.current) {
            console.log('⏸️ Parando polling global (sem pares ativos)...');
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Erro ao verificar pares ativos:', error);
      }
    };

    const startPolling = () => {
      // Chamar imediatamente
      callForceMaturation();

      // Configurar intervalo de 15 segundos para conversas mais fluidas
      pollingIntervalRef.current = setInterval(() => {
        callForceMaturation();
      }, 15000);
    };

    const callForceMaturation = async () => {
      try {
        console.log('📡 Chamando force-maturation...');
        const { data, error } = await supabase.functions.invoke('force-maturation');
        
        if (error) {
          console.error('Erro ao forçar maturação:', error);
        } else {
          console.log('✅ Force-maturation concluído:', data);
        }
      } catch (error) {
        console.error('Erro ao chamar force-maturation:', error);
      }
    };

    // Verificar pares ativos inicialmente
    checkAndPoll();

    // Verificar a cada 60 segundos se há pares ativos (para iniciar/parar polling)
    const checkInterval = setInterval(checkAndPoll, 60000);

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      clearInterval(checkInterval);
    };
  }, [user]);
};
