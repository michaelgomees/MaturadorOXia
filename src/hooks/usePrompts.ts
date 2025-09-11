import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface AIPrompt {
  id: string;
  nome: string;
  conteudo: string;
  categoria: 'conversacao' | 'vendas' | 'suporte' | 'personalizado';
  is_active: boolean;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export const usePrompts = () => {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Carregar prompts do Supabase
  const loadPrompts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saas_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPrompts((data || []) as AIPrompt[]);
    } catch (error: any) {
      console.error('Erro ao carregar prompts:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os prompts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Criar novo prompt
  const createPrompt = async (prompt: Omit<AIPrompt, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Se for global, desativar outros globais primeiro
      if (prompt.is_global) {
        await supabase
          .from('saas_prompts')
          .update({ is_global: false })
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
      }

      const { data, error } = await supabase
        .from('saas_prompts')
        .insert([{
          nome: prompt.nome,
          conteudo: prompt.conteudo,
          categoria: prompt.categoria,
          is_active: prompt.is_active,
          is_global: prompt.is_global,
          usuario_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      await loadPrompts();
      
      toast({
        title: "Prompt criado",
        description: `Prompt "${prompt.nome}" criado com sucesso.`
      });

      return data;
    } catch (error: any) {
      console.error('Erro ao criar prompt:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o prompt",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Atualizar prompt
  const updatePrompt = async (id: string, updates: Partial<AIPrompt>) => {
    try {
      // Se for global, desativar outros globais primeiro
      if (updates.is_global) {
        await supabase
          .from('saas_prompts')
          .update({ is_global: false })
          .neq('id', id);
      }

      const { error } = await supabase
        .from('saas_prompts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await loadPrompts();
      
      toast({
        title: "Prompt atualizado",
        description: "Prompt foi atualizado com sucesso."
      });
    } catch (error: any) {
      console.error('Erro ao atualizar prompt:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o prompt",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Deletar prompt
  const deletePrompt = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saas_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadPrompts();
      
      toast({
        title: "Prompt removido",
        description: "Prompt deletado com sucesso."
      });
    } catch (error: any) {
      console.error('Erro ao deletar prompt:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível deletar o prompt",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Definir prompt global
  const setGlobalPrompt = async (id: string) => {
    try {
      // Desativar todos os prompts globais
      await supabase
        .from('saas_prompts')
        .update({ is_global: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Ativar o prompt selecionado como global
      await supabase
        .from('saas_prompts')
        .update({ is_global: true })
        .eq('id', id);

      await loadPrompts();
      
      toast({
        title: "Prompt global definido",
        description: "Este prompt agora é usado como padrão global."
      });
    } catch (error: any) {
      console.error('Erro ao definir prompt global:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível definir o prompt global",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Obter prompt global ativo
  const getGlobalPrompt = () => {
    return prompts.find(p => p.is_global);
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  return {
    prompts,
    loading,
    createPrompt,
    updatePrompt,
    deletePrompt,
    setGlobalPrompt,
    getGlobalPrompt,
    refreshPrompts: loadPrompts
  };
};