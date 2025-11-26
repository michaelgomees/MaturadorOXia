import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, Circle, RefreshCw } from 'lucide-react';
import { useConnections } from '@/contexts/ConnectionsContext';

export const InstanceSelector = () => {
  const { connections, syncAllFromEvolutionAPI } = useConnections();
  const [selectedInstances, setSelectedInstances] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);

  const toggleInstance = (id: string) => {
    const newSelected = new Set(selectedInstances);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInstances(newSelected);
  };

  const selectAllActive = () => {
    const activeIds = connections
      .filter(c => c.status === 'active')
      .map(c => c.id);
    setSelectedInstances(new Set(activeIds));
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      
      // Toast de início
      const { toast } = await import('react-hot-toast');
      toast.loading('Sincronizando com Evolution API...', { id: 'sync-toast' });
      
      // Sincronizar com a API
      await syncAllFromEvolutionAPI();
      
      // Toast de sucesso
      toast.success('✅ Sincronização concluída! Mostrando apenas conexões ativas.', { 
        id: 'sync-toast',
        duration: 3000 
      });
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      const { toast } = await import('react-hot-toast');
      toast.error('Erro ao sincronizar com a API', { id: 'sync-toast' });
    } finally {
      setSyncing(false);
    }
  };

  const activeConnections = connections.filter(c => c.status === 'active');
  const inactiveConnections = connections.filter(c => c.status !== 'active');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Conexões Disponíveis
              <Badge variant="secondary">{selectedInstances.size} selecionadas</Badge>
            </CardTitle>
            <CardDescription>
              Selecione as instâncias que serão usadas para o disparo. O sistema alternará entre elas.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllActive}
            >
              Selecionar Ativas
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activeConnections.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 text-green-600">Ativas</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {activeConnections.map((conn) => (
                  <Card
                    key={conn.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedInstances.has(conn.id)
                        ? 'ring-2 ring-primary'
                        : ''
                    }`}
                    onClick={() => toggleInstance(conn.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <Avatar>
                          <AvatarImage src={conn.avatar} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {conn.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                          <p className="font-semibold text-sm truncate max-w-[120px]">
                            {conn.name}
                          </p>
                          {conn.phone && (
                            <p className="text-xs text-muted-foreground">
                              {conn.phone}
                            </p>
                          )}
                        </div>
                        {selectedInstances.has(conn.id) ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {inactiveConnections.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Indisponíveis</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {inactiveConnections.map((conn) => (
                  <Card key={conn.id} className="opacity-50">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <Avatar>
                          <AvatarImage src={conn.avatar} />
                          <AvatarFallback className="bg-muted">
                            {conn.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                          <p className="font-semibold text-sm truncate max-w-[120px]">
                            {conn.name}
                          </p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {conn.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {connections.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma conexão disponível. Configure suas instâncias na aba Conexões.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
