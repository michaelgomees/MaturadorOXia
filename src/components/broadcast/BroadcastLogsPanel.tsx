import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, Play } from "lucide-react";
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
}

export function BroadcastLogsPanel() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadLogs();
      loadCampaigns();
      
      // Configurar realtime subscription para atualizações instantâneas
      const channel = supabase
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

      return () => {
        supabase.removeChannel(channel);
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
          instance_id
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
        .select('id, nome, status')
        .eq('usuario_id', user!.id)
        .in('status', ['draft', 'paused'])
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

    try {
      setStarting(true);
      
      const { error } = await supabase
        .from('saas_broadcast_campaigns')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', selectedCampaign);

      if (error) throw error;

      toast.success('Disparo iniciado com sucesso!');
      loadCampaigns();
      setSelectedCampaign("");
    } catch (error) {
      console.error('Erro ao iniciar disparo:', error);
      toast.error('Erro ao iniciar disparo');
    } finally {
      setStarting(false);
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
        </div>
      </div>

      {campaigns.length > 0 && (
        <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione uma campanha para iniciar" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
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
