import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Play, Square, Settings, MessageCircle, Users, Activity, Zap, ArrowRight, Plus, FileText, Brain, Info, Database, Image } from 'lucide-react';
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
      // Usar o modo global ao criar o par
      await createPair(firstChip.name, secondChip.name);
      
      setNewPair({ 
        firstChipId: '', 
        secondChipId: '',
        maturationMode: globalMaturationMode,
        messageFileId: '',
        loopMessages: true
      });
      
      toast({
        title: "Par Configurado",
        description: `${firstChip.name} <-> ${secondChip.name} (Modo: ${globalMaturationMode === 'prompts' ? '🧠 Prompts IA' : '💬 Mensagens + Dados'})`,
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
      {/* Header com Toggle */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold">Sistema de Maturação</h2>
          <p className="text-sm text-muted-foreground">
            Configure conversas automáticas entre conexões ativas ({activeConnections.length} disponíveis)
          </p>
        </div>

        {/* Toggle de Modo - SEMPRE VISÍVEL */}
        <div className="border-2 border-[hsl(var(--primary))] rounded-lg px-5 py-3 flex items-center gap-4 bg-[hsl(var(--background))] shadow-md">
          <div className={`flex items-center gap-2 ${globalMaturationMode === 'prompts' ? 'text-[hsl(var(--primary))] font-bold' : 'text-muted-foreground'}`}>
            <Brain className="w-4 h-4" />
            <span className="text-sm whitespace-nowrap">Prompts IA</span>
          </div>
          
          <Switch
            checked={globalMaturationMode === 'messages'}
            onCheckedChange={(checked) => {
              const newMode = checked ? 'messages' : 'prompts';
              setGlobalMaturationMode(newMode);
              toast({
                title: "Modo Alterado",
                description: checked 
                  ? "💬 Usando Mensagens + Dados" 
                  : "🧠 Usando Prompts IA",
              });
            }}
            disabled={isRunning}
          />
          
          <div className={`flex items-center gap-2 ${globalMaturationMode === 'messages' ? 'text-[hsl(var(--primary))] font-bold' : 'text-muted-foreground'}`}>
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm whitespace-nowrap">Mensagens + Dados</span>
          </div>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
          title="Recursos Multimídia"
          value={mediaItems.filter(item => item.isActive).length.toString()}
          icon={<Image className="w-5 h-5" />}
          description="Itens ativos da aba Dados"
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

              {/* Info sobre modo global */}
              <div className="border-t pt-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-400 mb-1">
                        Modo Global Ativo: {globalMaturationMode === 'prompts' ? '🧠 Prompts IA' : '💬 Mensagens + Dados'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {globalMaturationMode === 'prompts' 
                          ? 'Todas as duplas usarão prompts configurados na aba "Prompts de IA"' 
                          : 'Todas as duplas usarão mensagens da aba "Mensagens" e recursos da aba "Dados"'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seletor de Arquivo de Mensagens (apenas se modo global = messages) */}
              {globalMaturationMode === 'messages' && (
                <>
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
                            Nenhum arquivo ativo encontrado
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
                    {messageFiles.filter(f => f.is_active).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Configure arquivos na aba "Mensagens de Maturação"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="loop-messages"
                      checked={newPair.loopMessages}
                      onCheckedChange={(checked) => setNewPair(prev => ({ ...prev, loopMessages: checked }))}
                    />
                    <Label htmlFor="loop-messages" className="text-sm cursor-pointer">
                      Reiniciar mensagens quando acabar
                    </Label>
                  </div>
                </>
              )}
              
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

          {/* Info sobre Prompts e Recursos Multimídia */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary mt-0.5" />
                <div className="w-full space-y-4">
                  <div>
                    <h3 className="font-semibold mb-1">Dois Modos de Maturação</h3>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>
                        <strong className="text-primary">🧠 Prompts Individuais:</strong> Cada chip usa IA para gerar mensagens naturais e variadas (consome tokens da Groq/OpenAI).
                      </p>
                      <p>
                        <strong className="text-secondary">💬 Mensagens Definidas:</strong> Usa sequência de mensagens pré-definidas de arquivo (maturação offline, sem tokens).
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-500" />
                      Recursos Multimídia (Automático)
                    </h3>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>
                        Durante a maturação, os chips usarão automaticamente os recursos configurados na aba "Dados":
                      </p>
                      <ul className="space-y-1 ml-4">
                        <li>• 📷 Imagens: enviadas conforme frequência configurada (máx. {mediaConfig.maxImagesPerHour}/hora)</li>
                        <li>• 🔗 Links: compartilhados respeitando limites (máx. {mediaConfig.maxLinksPerConversation}/conversa)</li>
                        <li>• 🔊 Áudios: incluídos quando disponíveis</li>
                        <li>• {mediaConfig.randomizeSelection ? '🎲 Seleção aleatória ativa' : '📋 Seleção sequencial'}</li>
                      </ul>
                      {mediaItems.filter(item => item.isActive).length === 0 && (
                        <p className="text-xs text-amber-500 mt-2">
                          ⚠️ Nenhum recurso multimídia ativo. Configure na aba "Dados" para enriquecer as conversas.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Lista de Pares Configurados */}
        {dbPairs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Duplas Configuradas ({dbPairs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] w-full">
                <div className="space-y-4 p-6">
                  {dbPairs.map((pair) => {
                    const messageFile = pair.message_file_id 
                      ? messageFiles.find(f => f.id === pair.message_file_id)
                      : null;
                    
                    return (
                      <div key={pair.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={pair.is_active}
                                onCheckedChange={() => handleTogglePair(pair.id)}
                                disabled={isRunning}
                              />
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {pair.nome_chip1} 
                                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                  {pair.nome_chip2}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                                  {pair.messages_count} mensagens • {getStatusBadge(pair.status)}
                                  {pair.maturation_mode === 'messages' ? (
                                    <Badge variant="secondary" className="text-xs">
                                      <FileText className="w-3 h-3 mr-1" />
                                      Mensagens Definidas
                                    </Badge>
                                  ) : (
                                    <Badge variant="default" className="text-xs">
                                      <Brain className="w-3 h-3 mr-1" />
                                      Prompts IA
                                    </Badge>
                                  )}
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

                          {/* Informações específicas do modo */}
                          {pair.maturation_mode === 'messages' && messageFile ? (
                            <div className="bg-secondary/20 border border-secondary/30 rounded p-2">
                              <p className="text-xs text-secondary-foreground">
                                📄 Arquivo: <strong>{messageFile.nome}</strong> • 
                                {messageFile.total_mensagens} mensagens • 
                                {pair.loop_messages ? 'Loop ativado' : 'Sem loop'}
                                {pair.current_message_index !== undefined && 
                                  ` • Mensagem atual: ${pair.current_message_index + 1}/${messageFile.total_mensagens}`
                                }
                              </p>
                            </div>
                          ) : pair.maturation_mode === 'prompts' ? (
                            <div className="bg-primary/10 border border-primary/20 rounded p-2">
                              <p className="text-xs text-primary">
                                💡 Cada chip usará seu próprio prompt configurado na aba "Prompts de IA"
                              </p>
                            </div>
                          ) : null}
                          
                          {/* Indicador de uso de dados multimídia */}
                          {mediaItems.filter(item => item.isActive).length > 0 && (
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded p-2">
                              <div className="flex items-start gap-2">
                                <Database className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-purple-400 mb-1">
                                    Usando Recursos Multimídia da Aba "Dados"
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    📷 {mediaItems.filter(item => item.isActive && item.type === 'image').length} imgs (máx {mediaConfig.maxImagesPerHour}/h) • 
                                    🔗 {mediaItems.filter(item => item.isActive && item.type === 'link').length} links (máx {mediaConfig.maxLinksPerConversation}/conv) •
                                    {mediaConfig.randomizeSelection ? ' 🎲 Aleatório' : ' 📋 Sequencial'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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