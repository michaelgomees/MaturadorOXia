import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Link, CheckCircle, XCircle, RefreshCw, Trash2, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Connection {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  isActive: boolean;
  lastConnectionTime: string;
  notes: string;
}

export const ConnectionsTab = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newConnection, setNewConnection] = useState({
    name: '',
    endpoint: '',
    apiKey: '',
    notes: ''
  });
  const { toast } = useToast();

  // Carregar conexões do Supabase
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_conexoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedConnections = (data || []).map(conn => ({
        id: conn.id,
        name: conn.nome,
        endpoint: conn.evolution_instance_name || '',
        apiKey: '***configurado***',
        status: conn.status === 'ativo' ? 'connected' as const : 'disconnected' as const,
        isActive: true,
        lastConnectionTime: conn.last_sync || conn.created_at,
        notes: conn.display_name || ''
      }));

      setConnections(formattedConnections);
    } catch (error: any) {
      console.error('Erro ao carregar conexões:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as conexões",
        variant: "destructive"
      });
    }
  };

  // Resetar memória das conexões
  const resetConnectionMemory = async () => {
    try {
      const { error } = await supabase
        .from('saas_conexoes')
        .update({ 
          conversation_history: [],
          config: null 
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      toast({
        title: "Memória resetada",
        description: "Histórico de conversas das conexões foi limpo"
      });
    } catch (error: any) {
      console.error('Erro ao resetar memória:', error);
      toast({
        title: "Erro",
        description: "Não foi possível resetar a memória das conexões",
        variant: "destructive"
      });
    }
  };

  const handleTestConnection = async (id: string) => {
    const connection = connections.find(c => c.id === id);
    if (!connection) return;

    toast({
      title: "Informação",
      description: "Esta funcionalidade está implementada na aba Dados. Use o gerenciamento completo de chips lá."
    });
  };

  const getStatusIcon = (status: Connection['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: Connection['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Desconectado</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Conexões Evolution API</h2>
          <p className="text-muted-foreground">
            Gerencie conexões com a API do Evolution para WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetConnectionMemory}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetar Memórias
          </Button>
          <Button onClick={() => toast({ title: "Informação", description: "Use a aba 'Dados' para gerenciar chips e conexões completas" })}>
            <Link className="w-4 h-4 mr-2" />
            Ver Dados
          </Button>
        </div>
      </div>


      {/* Lista de conexões */}
      <div className="grid gap-4">
        {connections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Link className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhuma conexão configurada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure sua primeira conexão Evolution API
              </p>
              <Button onClick={() => toast({ title: "Informação", description: "Use a aba 'Dados' para criar e gerenciar chips" })}>
                <Link className="w-4 h-4 mr-2" />
                Ir para Dados
              </Button>
            </CardContent>
          </Card>
        ) : (
          connections.map((connection) => (
            <Card key={connection.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(connection.status)}
                    <div>
                      <CardTitle className="text-lg">{connection.name}</CardTitle>
                      <CardDescription>{connection.endpoint}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(connection.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(connection.id)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Testar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    💡 Para gerenciar completamente esta conexão, use a aba "Dados"
                  </div>

                  {connection.notes && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm font-medium">Observações:</Label>
                        <p className="text-sm text-muted-foreground mt-1">{connection.notes}</p>
                      </div>
                    </>
                  )}

                  <Separator />
                  <div className="text-xs text-muted-foreground">
                    Última conexão: {new Date(connection.lastConnectionTime).toLocaleString('pt-BR')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};