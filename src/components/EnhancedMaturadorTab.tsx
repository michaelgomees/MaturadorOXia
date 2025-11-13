import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Play, Square, Settings, MessageCircle, Users, Activity, Zap, ArrowRight, Plus, FileText, Brain, Info, Database, Image, Trash2 } from 'lucide-react';
import { StatsCard } from './StatsCard';
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
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Maturador de Chips</h2>
        <p className="text-muted-foreground">
          Configure conversas automáticas inteligentes entre chips usando OpenAI
        </p>
      </div>

      {/* Controles Principais - Simplificado */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="font-medium">
            Status: {isRunning ? 'Parado' : 'Parado'}
          </span>
        </div>
        
        <Button 
          onClick={handleStartMaturador}
          className="bg-primary hover:bg-primary/90 px-8 h-11"
          disabled={dbPairs.filter(pair => pair.is_active).length === 0}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Parar Maturador
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Iniciar Maturador
            </>
          )}
        </Button>

        {/* Toggle Global de Modo */}
        <Card className="border-2 border-primary/50 ml-auto">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Label className={`text-sm font-medium ${globalMaturationMode === 'prompts' ? 'text-primary' : 'text-muted-foreground'}`}>
                🧠 Prompts IA
              </Label>
              
              <Switch
                checked={globalMaturationMode === 'messages'}
                onCheckedChange={(checked) => {
                  const newMode = checked ? 'messages' : 'prompts';
                  setGlobalMaturationMode(newMode);
                  toast({
                    title: "Modo Alterado",
                    description: checked 
                      ? "💬 Mensagens + Dados" 
                      : "🧠 Prompts IA",
                  });
                }}
                className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-primary"
                disabled={isRunning}
              />

              <Label className={`text-sm font-medium ${globalMaturationMode === 'messages' ? 'text-blue-500' : 'text-muted-foreground'}`}>
                💬 Mensagens + Dados
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Status - Ícones Coloridos */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <StatsCard
          title="Pares Configurados"
          value={chipPairs.length.toString()}
          icon={<Settings className="w-5 h-5 text-orange-500" />}
          description="Total de duplas"
        />
        <StatsCard
          title="Pares Ativos"
          value={stats.activePairs.toString()}
          icon={<Users className="w-5 h-5 text-green-500" />}
          description={`${stats.activePairs} de ${chipPairs.length}`}
          trend={stats.activePairs > 0 ? 'up' : undefined}
        />
        <StatsCard
          title="Mensagens Trocadas"
          value={stats.totalMessages.toString()}
          icon={<MessageCircle className="w-5 h-5 text-blue-500" />}
          description="Total de mensagens"
          trend={stats.totalMessages > 0 ? 'up' : undefined}
        />
        <StatsCard
          title="Recursos Multimídia"
          value={mediaItems.filter(item => item.isActive).length.toString()}
          icon={<Image className="w-5 h-5 text-purple-500" />}
          description="Itens ativos da aba Dados"
        />
        <StatsCard
          title="Status do Sistema"
          value={isRunning ? 'ON' : 'OFF'}
          icon={<Activity className="w-5 h-5 text-red-500" />}
          description={isRunning ? "Maturação em andamento" : "Sistema parado"}
          trend={isRunning ? 'up' : undefined}
        />
      </div>

      {activeConnections.length > 0 ? (
        <>
          {/* Configuração de Nova Dupla - Card Format */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Configurar Nova Dupla
              </CardTitle>
              <CardDescription>
                Selecione duas conexões ativas para iniciar maturação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primeiro Chip</Label>
                  <Select 
                    value={newPair.firstChipId} 
                    onValueChange={(value) => setNewPair(prev => ({ ...prev, firstChipId: value }))}
                  >
                    <SelectTrigger>
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
                  <Label>Segundo Chip</Label>
                  <Select 
                    value={newPair.secondChipId} 
                    onValueChange={(value) => setNewPair(prev => ({ ...prev, secondChipId: value }))}
                    disabled={!newPair.firstChipId}
                  >
                    <SelectTrigger>
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

              {/* Info sobre modo ativo */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  {globalMaturationMode === 'prompts' ? (
                    <>
                      <Brain className="w-4 h-4 text-blue-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-blue-400 font-medium">Prompts Individuais</p>
                        <p className="text-muted-foreground text-xs">
                          Cada chip usará seu próprio prompt configurado na aba "Prompts de IA". Configure os prompts para criar personalidades únicas.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-purple-400 font-medium">Mensagens Definidas</p>
                        <p className="text-muted-foreground text-xs">
                          Dupla usará mensagens do arquivo selecionado. Configure arquivos na aba "Mensagens".
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Seletor de arquivo para modo messages */}
              {globalMaturationMode === 'messages' && (
                <div className="space-y-2">
                  <Label>Arquivo de Mensagens</Label>
                  <Select 
                    value={newPair.messageFileId} 
                    onValueChange={(value) => setNewPair(prev => ({ ...prev, messageFileId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um arquivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {messageFiles.filter(f => f.is_active).length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum arquivo ativo
                        </SelectItem>
                      ) : (
                        messageFiles
                          .filter(f => f.is_active)
                          .map(file => (
                            <SelectItem key={file.id} value={file.id}>
                              {file.nome} ({file.total_mensagens} mensagens)
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button 
                onClick={handleAddPair}
                disabled={!newPair.firstChipId || !newPair.secondChipId || isRunning}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Users className="w-4 h-4 mr-2" />
                Adicionar Dupla
              </Button>
            </CardContent>
          </Card>

        {/* Lista de Pares Configurados - Simplificada */}
        {dbPairs.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">
                Duplas Configuradas ({dbPairs.length})
              </CardTitle>
              
              {/* Botões de Ação em Massa - Mais Largos e Laranja */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleStopAll}
                  variant="outline"
                  className="px-6 h-10"
                  disabled={dbPairs.filter(p => p.is_active).length === 0 || isRunning}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Parar Todos
                </Button>
                
                <Button
                  onClick={handleDeleteAll}
                  variant="destructive"
                  className="px-6 h-10"
                  disabled={isRunning}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Todas
                </Button>

                <Button
                  onClick={async () => {
                    const inactivePairs = dbPairs.filter(p => !p.is_active);
                    for (const pair of inactivePairs) {
                      await togglePairActive(pair.id);
                    }
                    toast({
                      title: "Duplas Iniciadas",
                      description: `${inactivePairs.length} dupla(s) foram ativadas`
                    });
                  }}
                  className="bg-primary hover:bg-primary/90 px-6 h-10"
                  disabled={isRunning || dbPairs.filter(p => !p.is_active).length === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Todos
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] w-full">
                <div className="space-y-2 p-4">
                  {dbPairs.map((pair) => (
                    <div key={pair.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={pair.is_active}
                          onCheckedChange={() => handleTogglePair(pair.id)}
                          disabled={isRunning}
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pair.nome_chip1}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{pair.nome_chip2}</span>
                        </div>
                        <Badge className={pair.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20"}>
                          {pair.is_active ? 'Em Execução' : 'Parado'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {pair.messages_count} mensagens
                        </span>
                        {pair.maturation_mode === 'prompts' ? (
                          <Brain className="w-4 h-4 text-blue-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-purple-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTogglePair(pair.id)}
                          disabled={isRunning}
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
                              Pausar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemovePair(pair.id)}
                          disabled={isRunning}
                          className="h-8"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
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