import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Play, Square, Settings, MessageCircle, Users, Activity, Zap, ArrowRight, Plus } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { useMaturadorEngine } from '@/hooks/useMaturadorEngine';
import { useToast } from '@/hooks/use-toast';

interface ActiveConnection {
  id: string;
  name: string;
  status: string;
}

export const EnhancedMaturadorTab: React.FC = () => {
  const { 
    isRunning, 
    chipPairs, 
    setChipPairs, 
    loadData, 
    startMaturador, 
    stopMaturador, 
    getStats,
    getPairMessages 
  } = useMaturadorEngine();
  
  const [newPair, setNewPair] = useState({
    firstChipId: '',
    secondChipId: ''
  });
  const [activeConnections, setActiveConnections] = useState<ActiveConnection[]>([]);
  const { toast } = useToast();

  // Carregar dados iniciais
  useEffect(() => {
    loadData();

    // Carregar conexões ativas
    const connections = getActiveConnections();
    setActiveConnections(connections);
  }, [loadData]);

  const getActiveConnections = (): ActiveConnection[] => {
    const savedConnections = localStorage.getItem('ox-chip-configs');
    if (!savedConnections) return [];
    
    const connections = JSON.parse(savedConnections);
    return connections
      .filter((conn: any) => conn.isActive)
      .map((conn: any) => ({
        id: conn.id,
        name: conn.name,
        status: 'active'
      }));
  };

  const handleAddPair = () => {
    if (!newPair.firstChipId || !newPair.secondChipId || newPair.firstChipId === newPair.secondChipId) {
      return;
    }

    const firstChip = activeConnections.find(conn => conn.id === newPair.firstChipId);
    const secondChip = activeConnections.find(conn => conn.id === newPair.secondChipId);

    if (!firstChip || !secondChip) return;

    const newChipPair = {
      id: crypto.randomUUID(),
      firstChipId: firstChip.id,
      firstChipName: firstChip.name,
      secondChipId: secondChip.id,
      secondChipName: secondChip.name,
      isActive: true,
      messagesCount: 0,
      lastActivity: new Date(),
      status: 'stopped' as const,
      useInstancePrompt: false
    };

    setChipPairs(prev => [...prev, newChipPair]);
    setNewPair({ firstChipId: '', secondChipId: '' });
    
    toast({
      title: "Par Configurado",
      description: `${firstChip.name} <-> ${secondChip.name}`,
    });
  };

  const handleRemovePair = (pairId: string) => {
    setChipPairs(prev => prev.filter(pair => pair.id !== pairId));
  };

  const handleTogglePair = (pairId: string) => {
    setChipPairs(prev => prev.map(pair =>
      pair.id === pairId ? { ...pair, isActive: !pair.isActive } : pair
    ));
  };

  const handleStartMaturador = () => {
    if (!isRunning) {
      // Verificar se há pares ativos
      const activePairs = chipPairs.filter(pair => pair.isActive);
      
      if (activePairs.length === 0) {
        toast({
          title: "Erro",
          description: "Configure pelo menos um par de chips ativo para iniciar",
          variant: "destructive"
        });
        return;
      }

      startMaturador();
    } else {
      stopMaturador();
    }
  };

  const getStatusBadge = (status: 'running' | 'paused' | 'stopped') => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Em Execução</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pausado</Badge>;
      default:
        return <Badge variant="secondary">Parado</Badge>;
    }
  };

  const getAvailableChipsForSecond = (): ActiveConnection[] => {
    return activeConnections.filter(conn => conn.id !== newPair.firstChipId);
  };

  // Calcular estatísticas usando o hook
  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header com Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Maturador de Chips</h2>
          <p className="text-muted-foreground">
            Configure conversas automáticas inteligentes entre chips usando OpenAI
          </p>
        </div>
      </div>

      {/* Controles Principais */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="font-medium">
            Status: {isRunning ? 'Ativo' : 'Parado'}
          </span>
        </div>
        
        <Button 
          onClick={handleStartMaturador}
          variant={isRunning ? "destructive" : "default"}
          className="flex items-center gap-2"
          disabled={chipPairs.filter(pair => pair.isActive).length === 0}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4" />
              Parar Maturador
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Iniciar Maturador
            </>
          )}
        </Button>
        
        {chipPairs.filter(pair => pair.isActive).length === 0 && !isRunning && (
          <Badge variant="secondary" className="text-xs">
            Ative pelo menos uma dupla para iniciar
          </Badge>
        )}
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Pares Configurados"
          value={chipPairs.length.toString()}
          icon={<Settings className="w-5 h-5" />}
          description="Total de duplas"
        />
        <StatsCard
          title="Pares Ativos"
          value={stats.activePairs.toString()}
          icon={<Users className="w-5 h-5" />}
          description={`${stats.activePairs} de ${chipPairs.length}`}
          trend={stats.activePairs > 0 ? 'up' : undefined}
        />
        <StatsCard
          title="Mensagens Trocadas"
          value={stats.totalMessages.toString()}
          icon={<MessageCircle className="w-5 h-5" />}
          description="Total de mensagens"
          trend={stats.totalMessages > 0 ? 'up' : undefined}
        />
        <StatsCard
          title="Status do Sistema"
          value={isRunning ? 'ON' : 'OFF'}
          icon={<Activity className="w-5 h-5" />}
          description={isRunning ? "Maturação em andamento" : "Sistema parado"}
          trend={isRunning ? 'up' : undefined}
        />
      </div>

      {activeConnections.length > 0 ? (
        <>
          {/* Configuração de Nova Dupla */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Configurar Nova Dupla
              </CardTitle>
              <CardDescription>
                Selecione duas conexões ativas que irão conversar automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primeira Conexão</Label>
                  <Select 
                    value={newPair.firstChipId} 
                    onValueChange={(value) => setNewPair(prev => ({ ...prev, firstChipId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a primeira conexão" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeConnections.map(conn => (
                        <SelectItem key={conn.id} value={conn.id}>
                          {conn.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Segunda Conexão</Label>
                  <Select 
                    value={newPair.secondChipId} 
                    onValueChange={(value) => setNewPair(prev => ({ ...prev, secondChipId: value }))}
                    disabled={!newPair.firstChipId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a segunda conexão" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableChipsForSecond().map(conn => (
                        <SelectItem key={conn.id} value={conn.id}>
                          {conn.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={handleAddPair}
                disabled={!newPair.firstChipId || !newPair.secondChipId || isRunning}
                className="w-full"
              >
                <Users className="w-4 h-4 mr-2" />
                Adicionar Dupla
              </Button>
            </CardContent>
          </Card>

          {/* Info sobre Prompts */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Prompts Individuais</h3>
                  <p className="text-sm text-muted-foreground">
                    Cada chip usa seu próprio prompt configurado na aba "Prompts de IA". 
                    Configure os prompts individualmente para criar personalidades únicas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Lista de Pares Configurados */}
        {chipPairs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Pares Configurados ({chipPairs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[400px] w-full overflow-hidden">
                <ScrollArea className="h-full w-full">
                  <div className="space-y-4 pr-4">
                    {chipPairs.map((pair) => (
                    <div key={pair.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={pair.isActive}
                              onCheckedChange={() => handleTogglePair(pair.id)}
                              disabled={isRunning}
                            />
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {pair.firstChipName} 
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                {pair.secondChipName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {pair.messagesCount} mensagens • {getStatusBadge(pair.status)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const messages = getPairMessages(pair.id);
                                console.log('Mensagens do par:', messages);
                                toast({
                                  title: "Mensagens do Par",
                                  description: `${messages.length} mensagens encontradas. Verifique o console.`,
                                });
                              }}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemovePair(pair.id)}
                              disabled={isRunning}
                            >
                              Remover
                            </Button>
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-2">
                          <p className="text-xs text-blue-800">
                            💡 Cada chip usará seu próprio prompt configurado na aba "Prompts de IA"
                          </p>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma Conexão Ativa</h3>
            <p className="text-muted-foreground mb-4">
              Para usar o maturador, você precisa ter pelo menos duas conexões ativas.
            </p>
            <Button 
              onClick={() => {
                // Navegar para a aba de conexões
                window.dispatchEvent(new CustomEvent('navigate-to-connections'));
              }}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Conexões
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};