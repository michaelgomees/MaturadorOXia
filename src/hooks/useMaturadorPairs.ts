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
  created_at: string;
  updated_at: string;
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
  const createPair = async (chip1: string, chip2: string) => {
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

      const { data, error } = await supabase
        .from('saas_pares_maturacao')
        .insert([{
          nome_chip1: chip1,
          nome_chip2: chip2,
          is_active: true,
          status: 'stopped',
          messages_count: 0,
          use_instance_prompt: false,
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

  // Ativar/desativar par
  const togglePairActive = async (id: string) => {
    const pair = pairs.find(p => p.id === id);
    if (!pair) return;

    await updatePair(id, {
      is_active: !pair.is_active,
      status: !pair.is_active ? 'running' : 'paused'
    });
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