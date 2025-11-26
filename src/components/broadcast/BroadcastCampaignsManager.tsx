import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, StopCircle, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Campaign {
  id: string;
  nome: string;
  status: string;
  mensagens_enviadas: number;
  mensagens_total: number;
  started_at: string | null;
  created_at: string;
  lista_ids: string[];
  instance_ids: string[];
  horario_inicio: string;
  horario_fim: string;
  dias_semana: number[];
}

export const BroadcastCampaignsManager = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingCampaign, setProcessingCampaign] = useState<string | null>(null);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_broadcast_campaigns')
        .select('*')
        .in('status', ['running', 'paused', 'draft'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCampaigns(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar campanhas:', error);
      toast.error('Erro ao carregar campanhas');
    }
  };

  useEffect(() => {
    loadCampaigns();

    // Subscrição em tempo real para atualizações
    const channel = supabase
      .channel('broadcast-campaigns-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saas_broadcast_campaigns',
        },
        () => {
          loadCampaigns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleForceDispatch = async (campaignId: string) => {
    try {
      setProcessingCampaign(campaignId);
      toast.info('Forçando disparo da primeira mensagem...');

      // Chamar edge function com force=true para essa campanha específica
      const { data, error } = await supabase.functions.invoke(
        'send-broadcast-messages',
        {
          body: {
            force: true,
            campaign_id: campaignId,
          },
        }
      );

      if (error) throw error;

      console.log('Resultado do disparo forçado:', data);
      toast.success('Primeira mensagem enviada! Os próximos envios seguirão automaticamente.');
      
      await loadCampaigns();
    } catch (error: any) {
      console.error('Erro ao forçar disparo:', error);
      toast.error('Erro ao forçar disparo: ' + error.message);
    } finally {
      setProcessingCampaign(null);
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('saas_broadcast_campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Campanha pausada');
      await loadCampaigns();
    } catch (error: any) {
      console.error('Erro ao pausar campanha:', error);
      toast.error('Erro ao pausar campanha');
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('saas_broadcast_campaigns')
        .update({ 
          status: 'running',
          ultima_pausa: null,
        })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Campanha retomada');
      await loadCampaigns();
    } catch (error: any) {
      console.error('Erro ao retomar campanha:', error);
      toast.error('Erro ao retomar campanha');
    }
  };

  const handleStopCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('saas_broadcast_campaigns')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Campanha encerrada');
      await loadCampaigns();
    } catch (error: any) {
      console.error('Erro ao encerrar campanha:', error);
      toast.error('Erro ao encerrar campanha');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Deseja realmente deletar esta campanha? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      // Deletar itens da fila primeiro
      const { error: queueError } = await supabase
        .from('saas_broadcast_queue')
        .delete()
        .eq('campaign_id', campaignId);

      if (queueError) throw queueError;

      // Deletar campanha
      const { error } = await supabase
        .from('saas_broadcast_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Campanha deletada');
      await loadCampaigns();
    } catch (error: any) {
      console.error('Erro ao deletar campanha:', error);
      toast.error('Erro ao deletar campanha');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500">Rodando</Badge>;
      case 'paused':
        return <Badge variant="secondary">Pausada</Badge>;
      case 'draft':
        return <Badge variant="outline">Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDiasSemanaText = (dias: number[]) => {
    const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    if (dias.length === 7) return 'Todos os dias';
    return dias.sort().map(d => diasNomes[d]).join(', ');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campanhas em Execução</CardTitle>
              <CardDescription>
                Gerencie suas campanhas de disparo ativas
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCampaigns}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma campanha ativa</p>
              <p className="text-sm mt-1">
                Crie uma campanha na aba "Configurar & Disparar"
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{campaign.nome}</h3>
                          {getStatusBadge(campaign.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Progresso:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all"
                                  style={{
                                    width: `${(campaign.mensagens_enviadas / campaign.mensagens_total) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="font-mono text-xs">
                                {campaign.mensagens_enviadas}/{campaign.mensagens_total}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-muted-foreground">Horário:</span>
                            <p className="font-mono">{campaign.horario_inicio} - {campaign.horario_fim}</p>
                          </div>
                          
                          <div>
                            <span className="text-muted-foreground">Dias:</span>
                            <p>{getDiasSemanaText(campaign.dias_semana)}</p>
                          </div>
                          
                          <div>
                            <span className="text-muted-foreground">Iniciada em:</span>
                            <p>
                              {campaign.started_at
                                ? format(new Date(campaign.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                : 'Não iniciada'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {campaign.status === 'running' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleForceDispatch(campaign.id)}
                              disabled={processingCampaign === campaign.id}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Forçar Disparo
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handlePauseCampaign(campaign.id)}
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Pausar
                            </Button>
                          </>
                        )}
                        
                        {campaign.status === 'paused' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleResumeCampaign(campaign.id)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Retomar
                          </Button>
                        )}

                        {campaign.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleForceDispatch(campaign.id)}
                            disabled={processingCampaign === campaign.id}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Iniciar
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStopCampaign(campaign.id)}
                        >
                          <StopCircle className="h-4 w-4 mr-2" />
                          Encerrar
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCampaign(campaign.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
