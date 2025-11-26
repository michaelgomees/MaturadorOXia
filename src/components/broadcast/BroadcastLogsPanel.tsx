import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, Play, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LogEntry {
  id: string;
  campaign_id: string;
  instance_name: string;
  telefone: string;
  mensagem: string;
  status: string;
  enviado_em: string | null;
  erro_mensagem: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  nome: string;
  status: string;
  mensagens_total?: number;
  mensagens_enviadas?: number;
  intervalo_min?: number;
  intervalo_max?: number;
  pausar_apos_mensagens?: number;
  pausar_por_minutos?: number;
  agendar_data_especifica?: boolean;
  data_agendada?: string | null;
  horario_inicio?: string;
  horario_fim?: string;
  dias_semana?: number[];
  instance_ids?: string[];
  lista_ids?: string[];
}

export function BroadcastLogsPanel() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadLogs();
      loadCampaigns();
      
      // Configurar realtime subscription para atualizações instantâneas da fila
      const queueChannel = supabase
        .channel('broadcast-queue-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'saas_broadcast_queue',
            filter: `usuario_id=eq.${user.id}`
          },
          () => {
            loadLogs();
          }
        )
        .subscribe();

      // Configurar realtime subscription para atualizações de campanhas
      const campaignsChannel = supabase
        .channel('broadcast-campaigns-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'saas_broadcast_campaigns',
            filter: `usuario_id=eq.${user.id}`
          },
          () => {
            loadCampaigns();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(queueChannel);
        supabase.removeChannel(campaignsChannel);
      };
    }
  }, [user?.id]);

  const loadLogs = async () => {
    try {
      const { data: queueData, error } = await supabase
        .from('saas_broadcast_queue')
        .select(`
          id,
          telefone,
          mensagem,
          status,
          enviado_em,
          erro_mensagem,
          created_at,
          instance_id,
          campaign_id
        `)
        .eq('usuario_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Buscar nomes das instâncias
      const instanceIds = [...new Set(queueData?.map(q => q.instance_id) || [])];
      const { data: instances } = await supabase
        .from('saas_conexoes')
        .select('id, nome')
        .in('id', instanceIds);

      const instanceMap = new Map(instances?.map(i => [i.id, i.nome]) || []);

      const formattedLogs: LogEntry[] = queueData?.map(log => ({
        id: log.id,
        campaign_id: log.campaign_id,
        instance_name: instanceMap.get(log.instance_id) || 'Desconhecida',
        telefone: log.telefone,
        mensagem: log.mensagem,
        status: log.status,
        enviado_em: log.enviado_em,
        erro_mensagem: log.erro_mensagem,
        created_at: log.created_at,
      })) || [];

      setLogs(formattedLogs);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_broadcast_campaigns')
        .select(`
          id,
          nome,
          status,
          mensagens_total,
          mensagens_enviadas,
          intervalo_min,
          intervalo_max,
          pausar_apos_mensagens,
          pausar_por_minutos,
          agendar_data_especifica,
          data_agendada,
          horario_inicio,
          horario_fim,
          dias_semana,
          instance_ids,
          lista_ids
        `)
        .eq('usuario_id', user!.id)
        .in('status', ['draft', 'paused', 'running'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
    }
  };

  const handleStartCampaign = async () => {
    if (!selectedCampaign) {
      toast.error('Selecione uma campanha para iniciar');
      return;
    }

    const campaign = campaigns.find((c) => c.id === selectedCampaign);

    if (!campaign) {
      toast.error('Campanha não encontrada');
      return;
    }

    try {
      setStarting(true);

      // Se a campanha ainda é rascunho, primeiro criamos a fila de disparo
      if (campaign.status === 'draft') {
        toast.info('Preparando fila de disparo...');

        const { data, error } = await supabase.functions.invoke(
          'process-broadcast-campaign',
          {
            body: { campaign_id: selectedCampaign },
          }
        );

        if (error) {
          console.error('Erro ao processar campanha:', error);
          toast.error('Erro ao criar fila de disparo: ' + error.message);
          return;
        }

        console.log('Fila de disparo criada:', data);
      }

      // Garantir que o status esteja como "running"
      const { error: updateError } = await supabase
        .from('saas_broadcast_campaigns')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', selectedCampaign);

      if (updateError) throw updateError;

      // Forçar o processamento imediato desta campanha (primeiro envio)
      const { data: processData, error: functionError } =
        await supabase.functions.invoke('send-broadcast-messages', {
          body: {
            force: true,
            campaign_id: selectedCampaign,
          },
        });

      if (functionError) {
        console.error('Erro ao forçar processamento da campanha:', functionError);
        toast.error('Campanha iniciada, mas houve erro ao processar a fila.');
      } else {
        console.log('Resultado processamento forçado:', processData);
        toast.success('Disparo iniciado. Os próximos envios seguirão automaticamente.');
      }

      await loadCampaigns();
      await loadLogs();
      setSelectedCampaign('');
    } catch (error) {
      console.error('Erro ao iniciar disparo:', error);
      toast.error('Erro ao iniciar disparo');
    } finally {
      setStarting(false);
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      setPausingId(id);

      const { error } = await supabase
        .from('saas_broadcast_campaigns')
        .update({
          status: 'paused',
          ultima_pausa: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Campanha pausada com sucesso!');
      await loadCampaigns();
    } catch (error) {
      console.error('Erro ao pausar campanha:', error);
      toast.error('Erro ao pausar campanha');
    } finally {
      setPausingId(null);
    }
  };

  const handleDeleteAllLogs = async () => {
    if (!confirm('Tem certeza que deseja remover TODOS os disparos configurados? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setDeleting(true);
      
      const { error } = await supabase
        .from('saas_broadcast_queue')
        .delete()
        .eq('usuario_id', user!.id);

      if (error) throw error;

      toast.success('Todos os disparos foram removidos com sucesso!');
      loadLogs();
    } catch (error) {
      console.error('Erro ao remover disparos:', error);
      toast.error('Erro ao remover disparos');
    } finally {
      setDeleting(false);
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      sent: "Enviado",
      pending: "Pendente",
      failed: "Falhou",
    };

    if (status === 'sent') {
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-white border-green-600">
          {labels[status] || status}
        </Badge>
      );
    }

    if (status === 'failed') {
      return (
        <Badge variant="destructive">
          {labels[status] || status}
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        {labels[status] || status}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "HH:mm 'de' dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const truncateMessage = (msg: string, maxLength = 60) => {
    if (msg.length <= maxLength) return msg;
    return msg.substring(0, maxLength) + '...';
  };

  const startableCampaigns = campaigns.filter(
    (c) => c.status === 'draft' || c.status === 'paused'
  );
  const runningCampaigns = campaigns.filter((c) => c.status === 'running');
  const selectedCampaignData = campaigns.find((c) => c.id === selectedCampaign);

  const selectedCampaignLogs = selectedCampaign
    ? logs.filter((log) => log.campaign_id === selectedCampaign)
    : [];

  const sentCount = selectedCampaignLogs.filter((l) => l.status === 'sent').length;
  const pendingCount = selectedCampaignLogs.filter((l) => l.status === 'pending').length;
  const failedCount = selectedCampaignLogs.filter((l) => l.status === 'failed').length;

  const diasSemanaLabels: Record<number, string> = {
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sáb',
    7: 'Dom',
  };

  const formatDiasSemana = (dias?: number[]) => {
    if (!dias || dias.length === 0) return 'Todos os dias';
    return dias.map((d) => diasSemanaLabels[d] || d).join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Nenhum disparo registrado ainda</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Logs de Disparo</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{logs.length} registros</Badge>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteAllLogs}
            disabled={deleting || logs.length === 0}
            className="gap-2"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Removendo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Remover Todos
              </>
            )}
          </Button>
        </div>
      </div>

      {campaigns.length > 0 && (
        <Card className="p-4 mb-4 bg-primary/5 border-primary/20 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="flex-1 min-w-[220px]">
                <SelectValue placeholder="Selecione uma campanha para iniciar" />
              </SelectTrigger>
              <SelectContent>
                {startableCampaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.nome} ({campaign.status === 'draft' ? 'Rascunho' : 'Pausada'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleStartCampaign}
              disabled={!selectedCampaign || starting}
              className="gap-2"
            >
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Iniciar Disparo
                </>
              )}
            </Button>
          </div>

          {runningCampaigns.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Campanhas em execução:
              </p>
              <div className="flex flex-wrap gap-2">
                {runningCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center gap-2 rounded-full border border-primary/20 bg-background/40 px-3 py-1"
                  >
                    <span className="text-xs font-medium text-primary">
                      {campaign.nome}
                    </span>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      Rodando
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePauseCampaign(campaign.id)}
                      disabled={pausingId === campaign.id}
                      className="h-6 px-2 text-[11px]"
                    >
                      {pausingId === campaign.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Parar'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCampaignData && (
            <div className="mt-1 grid gap-3 text-xs text-muted-foreground md:grid-cols-2 md:text-sm">
              <div className="space-y-1">
                <p>
                  <span className="font-semibold text-foreground">Status:</span>{' '}
                  {selectedCampaignData.status === 'draft'
                    ? 'Rascunho'
                    : selectedCampaignData.status === 'paused'
                      ? 'Pausada'
                      : 'Rodando'}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Intervalo entre envios:</span>{' '}
                  {selectedCampaignData.intervalo_min} - {selectedCampaignData.intervalo_max} segundos
                </p>
                <p>
                  <span className="font-semibold text-foreground">Pausa automática:</span>{' '}
                  a cada {selectedCampaignData.pausar_apos_mensagens} mensagens, pausa por{' '}
                  {selectedCampaignData.pausar_por_minutos} minutos
                </p>
              </div>
              <div className="space-y-1">
                <p>
                  <span className="font-semibold text-foreground">Horário:</span>{' '}
                  {selectedCampaignData.horario_inicio} às {selectedCampaignData.horario_fim}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Dias da semana:</span>{' '}
                  {formatDiasSemana(selectedCampaignData.dias_semana)}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Mensagens na fila:</span>{' '}
                  {selectedCampaignLogs.length} no total — {sentCount} enviadas, {pendingCount} pendentes,{' '}
                  {failedCount} com erro
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-2">
          {logs.map((log) => (
            <Card 
              key={log.id} 
              className={`p-4 transition-colors ${
                log.status === 'sent' 
                  ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20' 
                  : 'hover:bg-accent/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {getStatusIcon(log.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-primary">{log.instance_name}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono text-sm">{log.telefone}</span>
                    {getStatusBadge(log.status)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2 break-words">
                    <span className="font-medium">Mensagem:</span> {truncateMessage(log.mensagem)}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {log.enviado_em 
                        ? `Enviado às ${formatDateTime(log.enviado_em)}`
                        : `Criado às ${formatDateTime(log.created_at)}`
                      }
                    </span>
                  </div>

                  {log.erro_mensagem && (
                    <p className="text-xs text-destructive mt-2">
                      Erro: {log.erro_mensagem}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
