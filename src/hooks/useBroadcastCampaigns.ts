import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BroadcastCampaign {
  id?: string;
  nome: string;
  lista_ids: string[];
  instance_ids: string[];
  message_file_id?: string;
  intervalo_min: number;
  intervalo_max: number;
  pausar_apos_mensagens: number;
  pausar_por_minutos: number;
  agendar_data_especifica: boolean;
  data_agendada?: string;
  horario_inicio: string;
  horario_fim: string;
  dias_semana: number[];
  random_no_repeat: boolean;
  status: string;
  mensagens_enviadas: number;
  mensagens_total: number;
  created_at?: string;
  usuario_id?: string;
}

export const useBroadcastCampaigns = () => {
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_broadcast_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar campanhas:', error);
      toast({
        title: 'Erro ao carregar campanhas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (
    campaignData: Partial<BroadcastCampaign>
  ): Promise<string | null> => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      if (!userId) {
        toast({
          title: 'Erro de autenticação',
          description: 'Usuário não autenticado',
          variant: 'destructive',
        });
        return null;
      }

      const insertData: any = {
        usuario_id: userId,
        nome: campaignData.nome || `Disparo ${new Date().toLocaleString('pt-BR')}`,
        lista_ids: campaignData.lista_ids || [],
        instance_ids: campaignData.instance_ids || [],
        message_file_id: campaignData.message_file_id,
        intervalo_min: campaignData.intervalo_min || 30,
        intervalo_max: campaignData.intervalo_max || 60,
        pausar_apos_mensagens: campaignData.pausar_apos_mensagens || 20,
        pausar_por_minutos: campaignData.pausar_por_minutos || 10,
        agendar_data_especifica: campaignData.agendar_data_especifica || false,
        data_agendada: campaignData.data_agendada,
        horario_inicio: campaignData.horario_inicio || '08:00:00',
        horario_fim: campaignData.horario_fim || '18:00:00',
        dias_semana: campaignData.dias_semana || [1, 2, 3, 4, 5, 6, 7],
        status: campaignData.status || 'draft',
        mensagens_enviadas: 0,
        mensagens_total: 0,
      };

      const { data, error } = await supabase
        .from('saas_broadcast_campaigns')
        .insert([insertData])
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: 'Campanha criada',
        description: 'Campanha de disparo criada com sucesso',
      });

      await loadCampaigns();
      return data?.id ?? null;
    } catch (error: any) {
      console.error('Erro ao criar campanha:', error);
      toast({
        title: 'Erro ao criar campanha',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const startCampaign = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('saas_broadcast_campaigns')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Campanha iniciada',
        description: 'O disparo começou com sucesso',
      });

      await loadCampaigns();
      return true;
    } catch (error: any) {
      console.error('Erro ao iniciar campanha:', error);
      toast({
        title: 'Erro ao iniciar',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const pauseCampaign = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('saas_broadcast_campaigns')
        .update({ status: 'paused' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Campanha pausada',
        description: 'O disparo foi pausado',
      });

      await loadCampaigns();
      return true;
    } catch (error: any) {
      console.error('Erro ao pausar campanha:', error);
      toast({
        title: 'Erro ao pausar',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteCampaign = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('saas_broadcast_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Campanha excluída',
        description: 'Campanha removida com sucesso',
      });

      await loadCampaigns();
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir campanha:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  return {
    campaigns,
    loading,
    createCampaign,
    startCampaign,
    pauseCampaign,
    deleteCampaign,
    loadCampaigns,
  };
};
