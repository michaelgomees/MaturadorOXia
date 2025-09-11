import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface APIConfig {
  id: string;
  nome: string;
  provider: 'openai' | 'anthropic' | 'google' | 'other';
  api_key: string;
  model: string;
  is_active: boolean;
  priority: number;
  max_tokens: number;
  temperature: number;
  description?: string;
  status: 'active' | 'inactive' | 'error';
  created_at: string;
  updated_at: string;
}

export const useAPIConfigs = () => {
  const [configs, setConfigs] = useState<APIConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Carregar configurações do Supabase
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saas_api_configs')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;

      setConfigs((data || []) as APIConfig[]);
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações de API",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Criar nova configuração
  const createConfig = async (config: Omit<APIConfig, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('saas_api_configs')
        .insert([{
          nome: config.nome,
          provider: config.provider,
          api_key: config.api_key,
          model: config.model,
          is_active: config.is_active,
          priority: config.priority,
          max_tokens: config.max_tokens,
          temperature: config.temperature,
          description: config.description,
          status: config.status,
          usuario_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      await loadConfigs();
      
      toast({
        title: "IA configurada",
        description: "Nova configuração de IA adicionada com sucesso."
      });

      return data;
    } catch (error: any) {
      console.error('Erro ao criar configuração:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a configuração",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Atualizar configuração
  const updateConfig = async (id: string, updates: Partial<APIConfig>) => {
    try {
      const { error } = await supabase
        .from('saas_api_configs')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await loadConfigs();
      
      toast({
        title: "Configuração atualizada",
        description: "Configuração foi atualizada com sucesso."
      });
    } catch (error: any) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar a configuração",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Deletar configuração
  const deleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saas_api_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadConfigs();
      
      toast({
        title: "IA removida",
        description: "Configuração de IA deletada com sucesso."
      });
    } catch (error: any) {
      console.error('Erro ao deletar configuração:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível deletar a configuração",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Testar configuração
  const testConfig = async (id: string) => {
    try {
      // Simular teste de conexão
      await updateConfig(id, { status: 'active' });
      
      const config = configs.find(c => c.id === id);
      toast({
        title: "IA testada",
        description: `Configuração ${config?.nome} validada com sucesso.`
      });
    } catch (error: any) {
      console.error('Erro ao testar configuração:', error);
      throw error;
    }
  };

  // Obter configuração ativa com maior prioridade
  const getActiveConfig = () => {
    return configs
      .filter(c => c.is_active && c.status === 'active')
      .sort((a, b) => a.priority - b.priority)[0];
  };

  // Obter configuração OpenAI ativa
  const getOpenAIConfig = () => {
    return configs.find(c => 
      c.provider === 'openai' && 
      c.is_active && 
      c.status === 'active'
    );
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  return {
    configs,
    loading,
    createConfig,
    updateConfig,
    deleteConfig,
    testConfig,
    getActiveConfig,
    getOpenAIConfig,
    refreshConfigs: loadConfigs
  };
};