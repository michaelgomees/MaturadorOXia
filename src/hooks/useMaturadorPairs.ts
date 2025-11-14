import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface MaturadorPair {
  id: string;
  nome_chip1: string;
  nome_chip2: string;
  is_active: boolean;
  status: 'running' | 'paused' | 'stopped';
  messages_count: number;
  use_instance_prompt: boolean;
  instance_prompt?: string;
  last_activity: string;
  started_at?: string;
  created_at: string;
  updated_at: string;
  maturation_mode?: 'prompts' | 'messages';
  message_file_id?: string;
  current_message_index?: number;
  loop_messages?: boolean;
}

export const useMaturadorPairs = () => {
  const [pairs, setPairs] = useState<MaturadorPair[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Carregar pares do Supabase
  const loadPairs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saas_pares_maturacao')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPairs((data || []) as MaturadorPair[]);
    } catch (error: any) {
      console.error('Erro ao carregar pares:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pares de maturação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Criar novo par
  const createPair = async (chip1: string, chip2: string, maturationMode?: 'prompts' | 'messages', messageFileId?: string) => {
    try {
      // Verificar se o par já existe
      const exists = pairs.some(p => 
        (p.nome_chip1 === chip1 && p.nome_chip2 === chip2) ||
        (p.nome_chip1 === chip2 && p.nome_chip2 === chip1)
      );

      if (exists) {
        toast({
          title: "Erro",
          description: "Esta dupla de chips já foi configurada.",
          variant: "destructive"
        });
        return null;
      }

      // Se modo messages mas sem arquivo, buscar o primeiro arquivo ativo
      let finalMessageFileId = messageFileId;
      if (maturationMode === 'messages' && !messageFileId) {
        const { data: messageFiles } = await supabase
          .from('saas_maturation_messages')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (messageFiles && messageFiles.length > 0) {
          finalMessageFileId = messageFiles[0].id;
        }
      }

      const { data, error } = await supabase
        .from('saas_pares_maturacao')
        .insert([{
          nome_chip1: chip1,
          nome_chip2: chip2,
          is_active: true,
          status: 'stopped',
          messages_count: 0,
          use_instance_prompt: false,
          maturation_mode: maturationMode || 'prompts',
          message_file_id: finalMessageFileId,
          loop_messages: true,
          current_message_index: 0,
          usuario_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      await loadPairs();
      
      toast({
        title: "Par adicionado",
        description: `Conversa entre ${chip1} e ${chip2} configurada.`
      });

      return data;
    } catch (error: any) {
      console.error('Erro ao criar par:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o par",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Atualizar par
  const updatePair = async (id: string, updates: Partial<MaturadorPair>) => {
    try {
      const { error } = await supabase
        .from('saas_pares_maturacao')
        .update({
          ...updates,
          last_activity: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await loadPairs();
    } catch (error: any) {
      console.error('Erro ao atualizar par:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o par",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Deletar par
  const deletePair = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saas_pares_maturacao')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadPairs();
      
      toast({
        title: "Par removido",
        description: "Configuração de conversa removida."
      });
    } catch (error: any) {
      console.error('Erro ao deletar par:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível deletar o par",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Ativar/desativar par COM FORÇA
  const togglePairActive = async (id: string) => {
    const pair = pairs.find(p => p.id === id);
    if (!pair) return;

    const isActivating = !pair.is_active;

    try {
      const updates: any = {
        is_active: isActivating,
        status: isActivating ? 'running' : 'paused',
        last_activity: new Date().toISOString()
      };

      // Registrar horário de início quando ativar
      if (isActivating && !pair.started_at) {
        updates.started_at = new Date().toISOString();
      }

      console.log(`🚀 ${isActivating ? 'INICIANDO' : 'PAUSANDO'} par ${pair.nome_chip1} <-> ${pair.nome_chip2}`);

      // Atualizar no banco com retry
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          const { error } = await supabase
            .from('saas_pares_maturacao')
            .update(updates)
            .eq('id', id);

          if (error) throw error;
          success = true;
          console.log(`✅ Status atualizado com sucesso no banco`);
        } catch (error) {
          retryCount++;
          console.error(`❌ Tentativa ${retryCount}/${maxRetries} falhou:`, error);
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          } else {
            throw error;
          }
        }
      }

      await loadPairs();

      // Se estiver ATIVANDO, forçar chamada IMEDIATA da edge function
      if (isActivating) {
        console.log(`🔥 FORÇANDO início imediato da maturação via edge function...`);
        
        toast({
          title: "🚀 Iniciando Maturação",
          description: `Dupla ${pair.nome_chip1} ↔️ ${pair.nome_chip2} está sendo ativada...`
        });

        try {
          const { data: forceData, error: forceError } = await supabase.functions.invoke('force-maturation', {
            body: { pairId: id }
          });

          if (forceError) {
            console.error('⚠️ Erro ao forçar maturação:', forceError);
            // Não falhar silenciosamente - tentar novamente
            setTimeout(async () => {
              console.log('🔄 Retry: Tentando forçar maturação novamente...');
              await supabase.functions.invoke('force-maturation', {
                body: { pairId: id }
              });
            }, 3000);
          } else {
            console.log('✅ Maturação forçada com sucesso:', forceData);
            toast({
              title: "✅ Maturação Iniciada!",
              description: `Dupla ${pair.nome_chip1} ↔️ ${pair.nome_chip2} está processando mensagens.`
            });
          }
        } catch (invokeError) {
          console.error('❌ Erro crítico ao invocar force-maturation:', invokeError);
          // Ainda assim, o status foi atualizado, então o polling deve pegar
          toast({
            title: "⚠️ Aviso",
            description: "Status atualizado, mas pode levar ~20s para iniciar. Aguarde...",
            variant: "default"
          });
        }
      } else {
        toast({
          title: "⏸️ Maturação Pausada",
          description: `Dupla ${pair.nome_chip1} ↔️ ${pair.nome_chip2} foi pausada.`
        });
      }
    } catch (error: any) {
      console.error('❌ Erro fatal ao alternar status do par:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar o status do par",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Incrementar contador de mensagens
  const incrementMessages = async (id: string) => {
    const pair = pairs.find(p => p.id === id);
    if (!pair) return;

    await updatePair(id, {
      messages_count: pair.messages_count + 1
    });
  };

  useEffect(() => {
    loadPairs();
  }, []);

  return {
    pairs,
    loading,
    createPair,
    updatePair,
    deletePair,
    togglePairActive,
    incrementMessages,
    refreshPairs: loadPairs
  };
};