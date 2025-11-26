import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export function BroadcastLogsPanel() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadLogs();
      
      // Atualizar logs a cada 5 segundos
      const interval = setInterval(loadLogs, 5000);
      return () => clearInterval(interval);
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
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      sent: "default",
      pending: "secondary",
      failed: "destructive",
    };

    const labels: Record<string, string> = {
      sent: "Enviado",
      pending: "Pendente",
      failed: "Falhou",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
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
        <Badge variant="outline">{logs.length} registros</Badge>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="p-4 hover:bg-accent/50 transition-colors">
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
