import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Play, Square, Settings, MessageCircle, Users, Activity, ArrowRight, Plus, FileText, Brain, Trash2 } from 'lucide-react';
import { useMaturadorEngine } from '@/hooks/useMaturadorEngine';
import { useMaturadorPairs } from '@/hooks/useMaturadorPairs';
import { useMaturationMessages } from '@/hooks/useMaturationMessages';
import { useMediaData } from '@/hooks/useMediaData';
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
  
  const { pairs: dbPairs, createPair, updatePair, deletePair, togglePairActive } = useMaturadorPairs();
  const { messages: messageFiles } = useMaturationMessages();
  const { config: mediaConfig, mediaItems } = useMediaData();
  
  // Estado global para controlar o modo de maturação de todas as duplas
  const [globalMaturationMode, setGlobalMaturationMode] = useState<'prompts' | 'messages'>(() => {
    const saved = localStorage.getItem('ox-global-maturation-mode');
    return (saved as 'prompts' | 'messages') || 'prompts';
  });

  const [newPair, setNewPair] = useState({
    firstChipId: '',
    secondChipId: '',
    maturationMode: 'prompts' as 'prompts' | 'messages',
    messageFileId: '',
    loopMessages: true
  });
  const [activeConnections, setActiveConnections] = useState<ActiveConnection[]>([]);
  const { toast } = useToast();

  // Salvar modo global no localStorage
  useEffect(() => {
    localStorage.setItem('ox-global-maturation-mode', globalMaturationMode);
  }, [globalMaturationMode]);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();

    // Carregar conexões ativas
    const connections = getActiveConnections();
    setActiveConnections(connections);
    
    // Atualizar conexões a cada 2 segundos
    const interval = setInterval(() => {
      const connections = getActiveConnections();
      setActiveConnections(connections);
    }, 2000);
    
    return () => clearInterval(interval);
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

  const handleAddPair = async () => {
    if (!newPair.firstChipId || !newPair.secondChipId || newPair.firstChipId === newPair.secondChipId) {
      return;
    }

    // Validar modo de mensagens
    if (globalMaturationMode === 'messages' && !newPair.messageFileId) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo de mensagens para o modo 'Mensagens + Dados'",
        variant: "destructive"
      });
      return;
    }

    const firstChip = activeConnections.find(conn => conn.id === newPair.firstChipId);
    const secondChip = activeConnections.find(conn => conn.id === newPair.secondChipId);

    if (!firstChip || !secondChip) return;

    try {
      // SEMPRE usar o modo global ao criar o par
      await createPair(
        firstChip.name, 
        secondChip.name, 
        globalMaturationMode, 
        newPair.messageFileId || undefined,
        newPair.loopMessages
      );
      
      setNewPair({ 
        firstChipId: '', 
        secondChipId: '',
        maturationMode: globalMaturationMode,
        messageFileId: '',
        loopMessages: true
      });
      
      toast({
        title: "Par Configurado",
        description: `${firstChip.name} <-> ${secondChip.name} (${globalMaturationMode === 'prompts' ? '🧠 Prompts IA' : '💬 Mensagens + Dados'})`,
      });
    } catch (error) {
      console.error('Erro ao criar par:', error);
    }
  };

  const handleRemovePair = async (pairId: string) => {
    await deletePair(pairId);
  };

  const handleTogglePair = async (pairId: string) => {
    await togglePairActive(pairId);
  };

  // Parar todas as duplas ativas
  const handleStopAll = async () => {
    const activePairs = dbPairs.filter(p => p.is_active);
    
    if (activePairs.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhuma dupla ativa para parar",
        variant: "destructive"
      });
      return;
    }

    for (const pair of activePairs) {
      await togglePairActive(pair.id);
    }

    toast({
      title: "Duplas Paradas",
      description: `${activePairs.length} dupla(s) foram desativadas`
    });
  };

  // Excluir todas as duplas
  const handleDeleteAll = async () => {
    if (dbPairs.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhuma dupla para excluir"
      });
      return;
    }

    if (isRunning) {
      toast({
        title: "Erro",
        description: "Pare o maturador antes de excluir duplas",
        variant: "destructive"
      });
      return;
    }

    // Confirmar ação
    if (!confirm(`Tem certeza que deseja excluir TODAS as ${dbPairs.length} duplas?`)) {
      return;
    }

    const count = dbPairs.length;
    for (const pair of dbPairs) {
      await deletePair(pair.id);
    }

    toast({
      title: "Duplas Excluídas",
      description: `${count} dupla(s) foram removidas`
    });
  };

  const handleStartMaturador = () => {
    if (!isRunning) {
      // Verificar se há pares ativos nos dbPairs (do banco de dados)
      const activePairs = dbPairs.filter(pair => pair.is_active);
      
      if (activePairs.length === 0) {
        toast({
          title: "Erro",
          description: "Configure pelo menos um par de chips ativo para iniciar",
          variant: "destructive"
        });
        return;
      }

      // Verificar requisitos baseados no modo global
      if (globalMaturationMode === 'messages') {
        // Temporariamente desabilitado - será implementado quando houver suporte a arquivos de mensagens
        console.log('Modo mensagens ativado - implementação pendente');
      }

      toast({
        title: "Maturador Iniciado",
        description: `Modo: ${globalMaturationMode === 'prompts' ? '🧠 Prompts IA (usa tokens)' : '💬 Mensagens + Dados (offline)'}`,
      });

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
      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Users className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duplas Configuradas</p>
                <p className="text-2xl font-bold">{dbPairs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Activity className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duplas Ativas</p>
                <p className="text-2xl font-bold">{stats.activePairs}</p>
                <p className="text-xs text-muted-foreground">{stats.activePairs} de {dbPairs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <MessageCircle className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mensagens Trocadas</p>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Settings className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status Sistema</p>
                <p className="text-2xl font-bold">{isRunning ? 'ON' : 'OFF'}</p>
                <p className="text-xs text-muted-foreground">{isRunning ? "Sistema ativo" : "Sistema parado"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Configurar Nova Dupla */}
      {activeConnections.length >= 2 && (
        <div className="mb-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-1">Configurar Nova Dupla</h3>
            <p className="text-sm text-muted-foreground">
              Selecione duas conexões ativas para iniciar maturação
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Primeiro Chip</Label>
              <Select 
                value={newPair.firstChipId} 
                onValueChange={(value) => setNewPair(prev => ({ ...prev, firstChipId: value }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione..." />
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
              <Label className="text-sm font-medium">Segundo Chip</Label>
              <Select 
                value={newPair.secondChipId} 
                onValueChange={(value) => setNewPair(prev => ({ ...prev, secondChipId: value }))}
                disabled={!newPair.firstChipId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione..." />
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

          {/* Info Box */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Prompts Individuais</p>
                <p className="text-xs text-muted-foreground">
                  Cada chip usará seu próprio prompt configurado na aba "Prompts de IA". Configure os prompts para criar personalidades únicas.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleAddPair}
            className="w-full bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] text-white"
            disabled={!newPair.firstChipId || !newPair.secondChipId}
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Dupla
          </Button>
        </div>
      )}

      {/* Duplas Configuradas */}
      {dbPairs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold">Duplas Configuradas ({dbPairs.length})</h3>
              <p className="text-sm text-muted-foreground">Gerencie as duplas</p>
            </div>
            <Button
              onClick={handleStartMaturador}
              size="lg"
              className={isRunning ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] text-white"}
              disabled={dbPairs.filter(p => p.is_active).length === 0 && !isRunning}
            >
              {isRunning ? (
                <>
                  <Square className="w-5 h-5 mr-2" />
                  Parar Todos
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Iniciar Todos
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              {dbPairs.map(pair => (
                <div 
                  key={pair.id} 
                  className="border border-primary/30 rounded-lg p-4 bg-card hover:bg-card/80 transition-colors"
                >
                  {/* Header da dupla */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-base">{pair.nome_chip1}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-base">{pair.nome_chip2}</span>
                      
                      <div className="ml-3">
                        {pair.is_active ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            Em Execução
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Parado</Badge>
                        )}
                      </div>
                    </div>
                    
                    <span className="text-lg font-semibold">
                      {pair.messages_count} mensagens
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    {pair.started_at && (
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        <span>Iniciado em: {new Date(pair.started_at).toLocaleString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      <span>Cada chip usa seu prompt individual</span>
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleTogglePair(pair.id)}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      {pair.is_active ? (
                        <>
                          <Square className="w-3 h-3 mr-1" />
                          Parar
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          Iniciar
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleTogglePair(pair.id)}
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={!pair.is_active}
                    >
                      <Square className="w-3 h-3 mr-1" />
                      Pausar
                    </Button>

                    <Button
                      onClick={() => handleRemovePair(pair.id)}
                      variant="destructive"
                      size="sm"
                      className="h-8"
                      disabled={isRunning}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {activeConnections.length < 2 && dbPairs.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma Conexão Ativa</h3>
            <p className="text-muted-foreground mb-4">
              Para usar o maturador, você precisa ter pelo menos duas conexões ativas.
            </p>
            <Button 
              onClick={() => {
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