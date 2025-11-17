import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, QrCode, RefreshCw, Trash2, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConnections } from "@/contexts/ConnectionsContext";
import { QRCodeModal } from "@/components/QRCodeModal";
import { supabase } from "@/integrations/supabase/client";

export const ConnectionsTab = () => {
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { connections, addConnection, updateConnection, deleteConnection, syncWithEvolutionAPI } = useConnections();
  
  // Filtrar conexões baseado no termo de busca
  const filteredConnections = connections.filter(connection => 
    connection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    connection.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    connection.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateConnection = async () => {
    if (!newConnectionName.trim()) {
      toast({
        title: "Erro",
        description: "Nome da conexão é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingConnection(true);

    try {
      // Criar nome único da instância
      const instanceName = `whats_${Date.now()}`;
      
      console.log('📞 Criando conexão:', { name: newConnectionName, instanceName });
      
      // Criar conexão no banco primeiro
      const newConnection = await addConnection({
        name: newConnectionName,
        status: 'connecting',
        isActive: false,
        conversationsCount: 0,
        aiModel: 'ChatGPT',
        evolutionInstanceName: instanceName
      });

      console.log('✅ Conexão criada no banco:', newConnection);

      setNewConnectionName('');
      setIsCreatingConnection(false);
      
      toast({
        title: "✅ Conexão criada!",
        description: `A conexão foi salva. Sincronizando com Evolution API...`
      });

      // Abrir modal de QR code automaticamente
      setTimeout(() => {
        handleShowQR(newConnection.id);
      }, 1000);
    } catch (error) {
      console.error('❌ Erro ao criar conexão:', error);
      setIsCreatingConnection(false);
      toast({
        title: "Erro ao criar conexão",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const handleDeleteConnection = async (id: string) => {
    const connection = connections.find(c => c.id === id);
    if (connection && window.confirm(`Tem certeza que deseja excluir a conexão "${connection.name}"?`)) {
      try {
        await deleteConnection(id);
        toast({
          title: "Conexão removida",
          description: "Conexão deletada com sucesso."
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao deletar conexão.",
          variant: "destructive"
        });
      }
    }
  };

  const handleSyncConnection = async (id: string) => {
    const connection = connections.find(c => c.id === id);
    if (!connection) return;

    try {
      await updateConnection(id, { status: 'connecting' });
      await syncWithEvolutionAPI(id);
      
      toast({
        title: "Conexão Sincronizada",
        description: `${connection.name} foi sincronizada com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao sincronizar conexão:', error);
      await updateConnection(id, { status: 'inactive' });
      toast({
        title: "Erro na Sincronização",
        description: `Não foi possível sincronizar ${connection.name}.`,
        variant: "destructive"
      });
    }
  };

  const handleSyncAll = async () => {
    if (connections.length === 0) {
      toast({
        title: "Nenhuma conexão",
        description: "Não há conexões para sincronizar.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sincronizando...",
      description: `Iniciando sincronização de ${connections.length} conexões...`
    });

    let syncedCount = 0;
    let errorCount = 0;

    for (const connection of connections) {
      try {
        await updateConnection(connection.id, { status: 'connecting' });
        await syncWithEvolutionAPI(connection.id);
        syncedCount++;
      } catch (error) {
        console.error(`Erro ao sincronizar ${connection.name}:`, error);
        errorCount++;
      }
    }

    toast({
      title: "Sincronização Concluída",
      description: `${syncedCount} conexão(ões) sincronizada(s)${errorCount > 0 ? `, ${errorCount} erro(s)` : ''}.`,
      variant: errorCount > 0 ? "destructive" : "default"
    });
  };

  const handleShowQR = (connectionId: string) => {
    setShowQRModal(connectionId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Conectando</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inativo</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Phone className="w-6 h-6" />
                Gerenciar Conexões
              </CardTitle>
              <CardDescription className="mt-2">
                Crie e gerencie suas conexões do WhatsApp
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {connections.length} Conexões
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Nova Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nova Conexão</CardTitle>
          <CardDescription>Crie uma nova instância do WhatsApp</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="connection-name">Nome da Conexão</Label>
              <Input
                id="connection-name"
                placeholder="Ex: WhatsApp Vendas"
                value={newConnectionName}
                onChange={(e) => setNewConnectionName(e.target.value)}
                disabled={isCreatingConnection}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleCreateConnection}
                disabled={isCreatingConnection || !newConnectionName.trim()}
              >
                {isCreatingConnection ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Conexões */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Conexões Ativas</CardTitle>
              <CardDescription>Gerencie suas instâncias do WhatsApp</CardDescription>
            </div>
            <Button
              onClick={handleSyncAll}
              variant="outline"
              size="sm"
              disabled={connections.length === 0}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Sincronizar Todas
            </Button>
          </div>
          
          {/* Barra de busca */}
          <div className="mt-4">
            <Input
              type="text"
              placeholder="Buscar por nome, telefone ou display name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredConnections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? 'Nenhuma conexão encontrada' : 'Nenhuma conexão criada ainda.'}</p>
              {!searchTerm && <p className="text-sm">Crie sua primeira conexão acima.</p>}
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {filteredConnections
                  .sort((a, b) => {
                    const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
                    const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
                    
                    if (numA !== numB) {
                      return numA - numB;
                    }
                    
                    return a.name.localeCompare(b.name);
                  })
                  .map((connection) => (
                  <div 
                    key={connection.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{connection.name}</h3>
                            {getStatusBadge(connection.status)}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {connection.phone && (
                              <p className="flex items-center gap-2">
                                <Phone className="w-3 h-3" />
                                {connection.phone}
                              </p>
                            )}
                            <p>Instância: {connection.evolutionInstanceName || 'N/A'}</p>
                            <p>Conversas: {connection.conversationsCount}</p>
                            <p>Modelo IA: {connection.aiModel}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleShowQR(connection.id)}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          QR Code
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSyncConnection(connection.id)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Sincronizar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteConnection(connection.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      {showQRModal && (() => {
        const connection = connections.find(c => c.id === showQRModal);
        return connection ? (
          <QRCodeModal
            open={!!showQRModal}
            onOpenChange={(open) => !open && setShowQRModal(null)}
            chipName={connection.name}
            chipPhone={connection.phone || ''}
          />
        ) : null;
      })()}
    </div>
  );
};
