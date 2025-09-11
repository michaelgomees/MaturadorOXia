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
  Settings, Activity, Wifi, Bot, FileText 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConnections } from "@/contexts/ConnectionsContext";
import { useMaturadorEngine } from "@/hooks/useMaturadorEngine";
import { useChipMaturation } from "@/hooks/useChipMaturation";
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
}

interface ActiveConnection {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
  lastSeen: string | Date;
  platform: string;
}

interface MaturadorConfig {
  isRunning: boolean;
  selectedPairs: ChipPair[];
  useBasePrompt: boolean;
  customPrompt?: string;
}

export const MaturadorTab = () => {
  const { connections: whatsappConnections } = useConnections();
  const { isRunning, startMaturador, stopMaturador } = useMaturadorEngine();
  const { startChipConversation } = useChipMaturation();
  const { pairs: dbPairs, createPair, updatePair, deletePair, togglePairActive } = useMaturadorPairs();
  const { prompts } = usePrompts();
  
  const [config, setConfig] = useState<MaturadorConfig>({
    isRunning: false,
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
      selectedPairs: mappedPairs,
      isRunning: isRunning
    }));
  }, [dbPairs, isRunning]);

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

  const handleStartConversation = async () => {
    try {
      await startChipConversation();
      toast({ 
        title: "💬 Conversa Forçada!", 
        description: "Uma nova conversa foi iniciada entre chips ativos." 
      });
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: "Não foi possível iniciar conversa. Verifique as conexões.", 
        variant: "destructive" 
      });
    }
  };

  const handleStartMaturation = async () => {
    try {
      const activePairs = config.selectedPairs.filter(pair => pair.isActive && pair.status !== 'paused');
      
      if (activePairs.length === 0) {
        toast({ 
          title: "Aviso", 
          description: "Nenhuma dupla ativa encontrada. Ative pelo menos uma dupla para iniciar o maturador.", 
          variant: "destructive" 
        });
        return;
      }

      if (!isConfigValid) {
        toast({ 
          title: "Configuração Incompleta", 
          description: "Configure pelo menos uma dupla ativa antes de iniciar.", 
          variant: "destructive" 
        });
        return;
      }

      // Iniciar sistema de maturação
      startMaturador();
      
      toast({ 
        title: "🎯 Maturador Iniciado!", 
        description: `Sistema ativado para ${activePairs.length} duplas.` 
      });
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: "Não foi possível iniciar o maturador. Verifique as conexões.", 
        variant: "destructive" 
      });
    }
  };

  const getStatusBadge = (status: ChipPair['status']) => {
    switch (status) {
      case 'running': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Em Execução</Badge>;
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
        <div className="flex items-center gap-3">
          <Button
            variant={isRunning ? "destructive" : "default"}
            onClick={isRunning ? stopMaturador : handleStartMaturation}
            disabled={activePairs.length === 0 || !isConfigValid}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Square className="w-4 h-4" />
                Maturador Ativo
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Maturador Inativo
              </>
            )}
          </Button>
          <Button 
            onClick={handleStartConversation} 
            variant="outline"
            className="flex items-center gap-2"
            disabled={!isConfigValid}
          >
            <MessageCircle className="w-4 h-4" />
            Forçar Conversa
          </Button>
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
              <p className="text-2xl font-bold">{isRunning ? 'ON' : 'OFF'}</p>
              <p className="text-xs text-muted-foreground">Status Sistema</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adicionar Nova Dupla */}
        <Card>
          <CardHeader>
            <CardTitle>Configurar Nova Dupla</CardTitle>
            <CardDescription>Selecione duas conexões ativas</CardDescription>
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
            <Button onClick={handleAddPair} disabled={!newPair.chip1 || !newPair.chip2} className="w-full">
              <Users className="w-4 h-4 mr-2" />Adicionar Dupla
            </Button>
          </CardContent>
        </Card>

        {/* Configurações do Maturador */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações do Maturador</CardTitle>
            <CardDescription>Parâmetros gerais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={config.useBasePrompt} 
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, useBasePrompt: checked }))}
              />
              <Label>Usar prompt base das APIs de IA</Label>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Prompt Personalizado (opcional)
              </Label>
              <Textarea
                placeholder="Digite um prompt personalizado para as conversas..."
                value={config.customPrompt || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, customPrompt: e.target.value }))}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Se preenchido, este prompt será usado ao invés do prompt global definido na aba Prompts
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Duplas */}
      <Card>
        <CardHeader>
          <CardTitle>Duplas Configuradas ({config.selectedPairs.length})</CardTitle>
          <CardDescription>Gerencie as duplas</CardDescription>
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{pair.chip1}</Badge>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <Badge variant="outline">{pair.chip2}</Badge>
                          </div>
                          {getStatusBadge(pair.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm">
                            <p className="font-medium">{pair.messagesExchanged} mensagens</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(pair.lastActivity).toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                          
                          <Select defaultValue="">
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Prompt" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="global">Global</SelectItem>
                              {prompts.filter(p => p.is_active).map(prompt => (
                                <SelectItem key={prompt.id} value={prompt.id}>
                                  {prompt.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleTogglePair(pair.id)}
                          >
                            {pair.isActive ? (
                              <>
                                <Pause className="w-4 h-4 mr-2"/>
                                Pausar
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2"/>
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