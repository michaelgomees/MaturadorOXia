import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useBroadcastQueue() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Processar fila a cada 10 segundos
    const processQueue = async () => {
      try {
        const { error } = await supabase.functions.invoke('send-broadcast-messages');
        
        if (error) {
          console.error('Erro ao processar fila de broadcast:', error);
        }
      } catch (error) {
        console.error('Erro ao chamar função de processamento:', error);
      }
    };

    // Executar imediatamente
    processQueue();

    // Configurar intervalo
    const interval = setInterval(processQueue, 10000);

    return () => clearInterval(interval);
  }, [user?.id]);
}
