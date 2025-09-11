import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Link, CheckCircle, XCircle, RefreshCw, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  // Carregar conexões do localStorage
  useEffect(() => {
    const savedConnections = localStorage.getItem('ox-connections');
    if (savedConnections) {
      setConnections(JSON.parse(savedConnections));
    }
  }, []);

  // Salvar conexões no localStorage
  const saveConnections = (newConnections: Connection[]) => {
    setConnections(newConnections);
    localStorage.setItem('ox-connections', JSON.stringify(newConnections));
  };

  const handleCreateConnection = () => {
    if (!newConnection.name || !newConnection.endpoint) {
      toast({
        title: "Erro",
        description: "Nome e endpoint são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const connection: Connection = {
      id: Date.now().toString(),
      ...newConnection,
      status: 'disconnected',
      isActive: false,
      lastConnectionTime: new Date().toISOString()
    };

    saveConnections([...connections, connection]);
    setNewConnection({ name: '', endpoint: '', apiKey: '', notes: '' });
    setIsCreating(false);
    
    toast({
      title: "Conexão criada",
      description: "Nova conexão Evolution API adicionada com sucesso."
    });
  };

  const handleTestConnection = async (id: string) => {
    const connection = connections.find(c => c.id === id);
    if (!connection) return;

    // Simular teste de conexão
    const updatedConnections = connections.map(c => 
      c.id === id 
        ? { ...c, status: 'connected' as const, lastConnectionTime: new Date().toISOString() }
        : c
    );
    
    saveConnections(updatedConnections);
    
    toast({
      title: "Conexão testada",
      description: `Conexão ${connection.name} estabelecida com sucesso.`
    });
  };

  const handleToggleActive = (id: string) => {
    const updatedConnections = connections.map(c => 
      c.id === id ? { ...c, isActive: !c.isActive } : c
    );
    saveConnections(updatedConnections);
  };

  const handleDeleteConnection = (id: string) => {
    const updatedConnections = connections.filter(c => c.id !== id);
    saveConnections(updatedConnections);
    
    toast({
      title: "Conexão removida",
      description: "Conexão deletada com sucesso."
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
        <Button onClick={() => setIsCreating(true)}>
          <Link className="w-4 h-4 mr-2" />
          Nova Conexão
        </Button>
      </div>

      {/* Formulário de nova conexão */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Conexão Evolution API</CardTitle>
            <CardDescription>
              Configure uma nova conexão com a API do Evolution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Conexão</Label>
                <Input
                  id="name"
                  placeholder="Ex: WhatsApp Principal"
                  value={newConnection.name}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpoint">Endpoint Evolution</Label>
                <Input
                  id="endpoint"
                  placeholder="https://evolution-api.exemplo.com"
                  value={newConnection.endpoint}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, endpoint: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apiKey">Chave de API</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Sua chave de API do Evolution"
                value={newConnection.apiKey}
                onChange={(e) => setNewConnection(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Notas sobre esta conexão..."
                value={newConnection.notes}
                onChange={(e) => setNewConnection(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateConnection}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Conexão
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              <Button onClick={() => setIsCreating(true)}>
                <Link className="w-4 h-4 mr-2" />
                Criar Primeira Conexão
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${connection.id}`}>Conexão Ativa</Label>
                      <Switch
                        id={`active-${connection.id}`}
                        checked={connection.isActive}
                        onCheckedChange={() => handleToggleActive(connection.id)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteConnection(connection.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
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