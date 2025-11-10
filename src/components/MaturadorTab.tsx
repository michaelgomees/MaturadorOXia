import { useState, useEffect } from "react";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Play, Pause, Square, Users, MessageCircle, ArrowRight, 
  Settings, Activity, Wifi, Bot, Clock 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConnections } from "@/contexts/ConnectionsContext";
import { useMaturadorPairs } from "@/hooks/useMaturadorPairs";
import { usePrompts } from "@/hooks/usePrompts";

interface ChipPair {
  id: string;
  chip1: string;
  chip2: string;
  isActive: boolean;
  messagesExchanged: number;
  lastActivity: string;
  status: 'running' | 'paused' | 'stopped';
  useInstancePrompt?: boolean;
  instancePrompt?: string | null;
}

interface ActiveConnection {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
  lastSeen: string | Date;
  platform: string;
}

interface MaturadorConfig {
  selectedPairs: ChipPair[];
  useBasePrompt: boolean;
  customPrompt?: string;
}

export const MaturadorTab = () => {
  const { connections: whatsappConnections } = useConnections();
  const { pairs: dbPairs, createPair, updatePair, deletePair, togglePairActive } = useMaturadorPairs();
  const { prompts } = usePrompts();
  
  const [config, setConfig] = useState<MaturadorConfig>({
    selectedPairs: [],
    useBasePrompt: true,
    customPrompt: ''
  });
  
  const [newPair, setNewPair] = useState({ 
    chip1: '', 
    chip2: '', 
    promptId: '' 
  });
  const { toast } = useToast();

  // Sincronizar configuração com dados do Supabase
  useEffect(() => {
    const mappedPairs = dbPairs.map(pair => ({
      id: pair.id,
      chip1: pair.nome_chip1,
      chip2: pair.nome_chip2,
      isActive: pair.is_active,
      messagesExchanged: pair.messages_count,
      lastActivity: pair.last_activity,
      status: pair.status
    }));
    
    setConfig(prev => ({
      ...prev,
      selectedPairs: mappedPairs
    }));
  }, [dbPairs]);

  const handleAddPair = async () => {
    if (!newPair.chip1 || !newPair.chip2 || newPair.chip1 === newPair.chip2) {
      toast({
        title: "Erro",
        description: "Selecione dois chips diferentes para criar a conversa.",
        variant: "destructive"
      });
      return;
    }

    try {
      await createPair(newPair.chip1, newPair.chip2);
      setNewPair({ chip1: '', chip2: '', promptId: '' });
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const handleRemovePair = async (pairId: string) => {
    try {
      await deletePair(pairId);
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const handleTogglePair = async (pairId: string) => {
    try {
      await togglePairActive(pairId);
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const handleStartPair = async (pairId: string) => {
    try {
      await updatePair(pairId, { status: 'running' });
      toast({ 
        title: "🎯 Maturação Iniciada!", 
        description: "A dupla começou a maturar automaticamente." 
      });
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: "Não foi possível iniciar a maturação.", 
        variant: "destructive" 
      });
    }
  };

  const handleStopPair = async (pairId: string) => {
    try {
      await updatePair(pairId, { status: 'stopped' });
      toast({ 
        title: "Maturação Parada", 
        description: "A dupla parou de maturar." 
      });
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: "Não foi possível parar a maturação.", 
        variant: "destructive" 
      });
    }
  };

  const handleStartAll = async () => {
    try {
      const activePairs = config.selectedPairs.filter(pair => pair.isActive);
      
      if (activePairs.length === 0) {
        toast({ 
          title: "Aviso", 
          description: "Nenhuma dupla ativa encontrada.", 
          variant: "destructive" 
        });
        return;
      }

      // Iniciar todas as duplas ativas
      for (const pair of activePairs) {
        await updatePair(pair.id, { status: 'running' });
      }
      
      toast({ 
        title: "🎯 Todas as Duplas Iniciadas!", 
        description: `${activePairs.length} duplas começaram a maturar.` 
      });
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: "Não foi possível iniciar todas as duplas.", 
        variant: "destructive" 
      });
    }
  };

  const getStatusBadge = (status: ChipPair['status'], lastActivity?: string) => {
    switch (status) {
      case 'running': 
        const startDate = lastActivity ? new Date(lastActivity).toLocaleDateString('pt-BR') : 'Hoje';
        const startTime = lastActivity ? new Date(lastActivity).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        return (
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Em Execução</Badge>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Maturando desde: {startDate} {startTime}
            </div>
          </div>
        );
      case 'paused': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pausado</Badge>;
      default: return <Badge variant="secondary">Parado</Badge>;
    }
  };

  const getAvailableChipsForSecond = (selectedFirst: string) => {
    return whatsappConnections.filter(connection => 
      connection.status === 'active' && connection.name !== selectedFirst
    );
  };

  // Conexões ativas formatadas
  const activeConnections: ActiveConnection[] = whatsappConnections
    .filter(conn => conn.status === 'active')
    .map(conn => ({
      id: conn.id,
      name: conn.name,
      status: 'connected' as const,
      lastSeen: conn.lastActive,
      platform: 'WhatsApp'
    }));

  const loading = false;
  const activePairs = config.selectedPairs.filter(pair => pair.isActive);
  const runningPairs = config.selectedPairs.filter(pair => pair.status === 'running');
  const totalMessages = config.selectedPairs.reduce((acc, pair) => acc + pair.messagesExchanged, 0);
  const isConfigValid = config.selectedPairs.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Sistema de Maturação</h2>
          <p className="text-muted-foreground">
            Configure conversas automáticas entre conexões ativas ({activeConnections.length} disponíveis)
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="w-8 h-8 text-orange-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{config.selectedPairs.length}</p>
              <p className="text-xs text-muted-foreground">Duplas Configuradas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Activity className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{activePairs.length}</p>
              <p className="text-xs text-muted-foreground">Duplas Ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <MessageCircle className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{totalMessages}</p>
              <p className="text-xs text-muted-foreground">Mensagens Trocadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Settings className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{runningPairs.length > 0 ? 'ON' : 'OFF'}</p>
              <p className="text-xs text-muted-foreground">Status Sistema</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Configurar Nova Dupla</CardTitle>
          <CardDescription>Selecione duas conexões ativas para iniciar maturação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Primeiro Chip</Label>
              <Select value={newPair.chip1} onValueChange={(value) => setNewPair(prev => ({ ...prev, chip1: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {whatsappConnections.filter(conn => conn.status === 'active').map(conn => (
                    <SelectItem key={conn.id} value={conn.name}>
                      <div className="flex items-center gap-2">
                        <Wifi className="w-3 h-3 text-green-500" />{conn.name}
                        <Badge variant="outline" className="text-xs">WhatsApp</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Segundo Chip</Label>
              <Select value={newPair.chip2} onValueChange={(value) => setNewPair(prev => ({ ...prev, chip2: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableChipsForSecond(newPair.chip1).map(conn => (
                    <SelectItem key={conn.id} value={conn.name}>
                      <div className="flex items-center gap-2">
                        <Wifi className="w-3 h-3 text-green-500" />{conn.name}
                        <Badge variant="outline" className="text-xs">WhatsApp</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Bot className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Prompts Individuais</h4>
                <p className="text-sm text-muted-foreground">
                  Cada chip usará seu próprio prompt configurado na aba "Prompts de IA".
                  Configure os prompts para criar personalidades únicas.
                </p>
              </div>
            </div>
          </div>
          
          <Button onClick={handleAddPair} disabled={!newPair.chip1 || !newPair.chip2} className="w-full">
            <Users className="w-4 h-4 mr-2" />Adicionar Dupla
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Duplas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Duplas Configuradas ({config.selectedPairs.length})</CardTitle>
              <CardDescription>Gerencie as duplas</CardDescription>
            </div>
            {config.selectedPairs.length > 0 && (
              <Button 
                onClick={handleStartAll}
                className="flex items-center gap-2"
                disabled={activePairs.length === 0}
              >
                <Play className="w-4 h-4" />
                Iniciar Todos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {config.selectedPairs.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhuma dupla</h3>
              <p className="text-sm text-muted-foreground">Configure a primeira dupla para começar</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                {config.selectedPairs.map(pair => (
                  <Card key={pair.id} className="border-l-4 border-l-primary/30">
                    <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Linha 1: Chips e Status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{pair.chip1}</Badge>
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              <Badge variant="outline">{pair.chip2}</Badge>
                            </div>
                            <div className="text-right text-sm">
                              <p className="font-medium">{pair.messagesExchanged} mensagens</p>
                            </div>
                          </div>
                          
                          {/* Linha 2: Status com Data */}
                          <div className="flex items-center justify-between">
                            <div>
                              {getStatusBadge(pair.status, pair.lastActivity)}
                            </div>
                          </div>
                          
                          {/* Linha 3: Controles */}
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Bot className="w-4 h-4" />
                              Cada chip usa seu prompt individual
                            </div>
                            
                            <div className="flex gap-2">
                              {pair.status === 'running' ? (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleStopPair(pair.id)}
                                  className="flex items-center gap-1"
                                >
                                  <Square className="w-4 h-4"/>
                                  Parar
                                </Button>
                              ) : (
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => handleStartPair(pair.id)}
                                  disabled={!pair.isActive}
                                  className="flex items-center gap-1"
                                >
                                  <Play className="w-4 h-4"/>
                                  Iniciar
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleTogglePair(pair.id)}
                              >
                                {pair.isActive ? (
                                  <>
                                    <Pause className="w-4 h-4 mr-1"/>
                                    Pausar
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-1"/>
                                    Ativar
                                  </>
                                )}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleRemovePair(pair.id)}
                              >
                                Remover
                              </Button>
                            </div>
                          </div>
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};