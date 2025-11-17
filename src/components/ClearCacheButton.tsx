import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ClearCacheButton = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clearAllCache = async () => {
    try {
      console.log('🧹 Iniciando limpeza completa do cache...');
      
      // 1. Limpar cache do React Query
      queryClient.clear();
      console.log('✅ Cache do React Query limpo');
      
      // 2. Garantir que todos os pares estão parados
      const { data: activePairs } = await supabase
        .from('saas_pares_maturacao')
        .select('id')
        .or('status.eq.running,is_active.eq.true');

      if (activePairs && activePairs.length > 0) {
        console.log(`🛑 Parando ${activePairs.length} pares ativos...`);
        
        // Parar todos os pares
        const { error } = await supabase
          .from('saas_pares_maturacao')
          .update({ 
            status: 'stopped', 
            is_active: false 
          })
          .in('id', activePairs.map(p => p.id));

        if (error) {
          console.error('❌ Erro ao parar pares:', error);
        } else {
          console.log('✅ Todos os pares foram parados');
        }
      }

      // 3. Limpar localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('maturation') || 
          key.includes('pairs') || 
          key.includes('chip') ||
          key.includes('cache')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`✅ ${keysToRemove.length} itens removidos do localStorage`);

      // 4. Forçar reload da página para garantir limpeza total
      toast({
        title: "✅ Cache Limpo",
        description: "Todo o cache foi limpo e os processos foram parados. Recarregando página...",
      });

      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível limpar o cache completamente",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={clearAllCache}
      variant="destructive"
      size="sm"
      className="gap-2"
    >
      <Trash2 className="h-4 w-4" />
      Limpar Cache e Parar Tudo
    </Button>
  );
};
