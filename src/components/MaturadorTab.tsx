import { useState, useEffect } from "react";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Play, Pause, Square, Users, MessageCircle, ArrowRight, 
  Settings, Activity, Wifi, Bot, Clock, Brain, Trash2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConnections } from "@/contexts/ConnectionsContext";
import { useMaturadorPairs } from "@/hooks/useMaturadorPairs";
import { usePrompts } from "@/hooks/usePrompts";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChipPair {
  id: string;
  chip1: string;
  chip2: string;
  isActive: boolean;
  messagesExchanged: number;
  lastActivity: string;
  startedAt?: string;
  status: 'running' | 'paused' | 'stopped';
  useInstancePrompt?: boolean;
  instancePrompt?: string | null;
  maturationMode?: 'prompts' | 'messages';
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
  const { pairs: dbPairs, updatePair, deletePair, togglePairActive, refreshPairs: loadPairs } = useMaturadorPairs();
  const { prompts } = usePrompts();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado global para controlar o modo de maturação
  const [globalMaturationMode, setGlobalMaturationMode] = useState<'prompts' | 'messages'>(() => {
    const saved = localStorage.getItem('ox-global-maturation-mode');
    console.log('🔍 Modo salvo no localStorage:', saved);
    return (saved as 'prompts' | 'messages') || 'prompts';
  });
  
  console.log('🎯 Modo atual no estado:', globalMaturationMode);
  
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
  
  // Filtrar pares baseado no termo de busca
  const filteredPairs = config.selectedPairs.filter(pair => 
    pair.chip1.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pair.chip2.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Salvar modo global no localStorage
  useEffect(() => {
    console.log('💾 Salvando modo no localStorage:', globalMaturationMode);
    localStorage.setItem('ox-global-maturation-mode', globalMaturationMode);
  }, [globalMaturationMode]);

  // Sincronizar configuração com dados do Supabase
  useEffect(() => {
    const mappedPairs = dbPairs.map(pair => ({
      id: pair.id,
      chip1: pair.nome_chip1,
      chip2: pair.nome_chip2,
      isActive: pair.is_active,
      messagesExchanged: pair.messages_count,
      lastActivity: pair.last_activity,
      startedAt: pair.started_at,
      status: pair.status,
      maturationMode: pair.maturation_mode || 'prompts' // Incluir modo de maturação
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
      // Criar par com o modo global atual
      const { data: pairData, error: createError } = await supabase
        .from('saas_pares_maturacao')
        .insert([{
          nome_chip1: newPair.chip1,
          nome_chip2: newPair.chip2,
          is_active: true,
          status: 'stopped',
          messages_count: 0,
          maturation_mode: globalMaturationMode,
          use_instance_prompt: false,
          usuario_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (createError) throw createError;

      await loadPairs();
      setNewPair({ chip1: '', chip2: '', promptId: '' });
      
      toast({
        title: "Par adicionado",
        description: `${newPair.chip1} <-> ${newPair.chip2} (Modo: ${globalMaturationMode === 'prompts' ? '🧠 Prompts IA' : '💬 Mensagens + Dados'})`
      });
    } catch (error: any) {
      console.error('Erro ao criar par:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o par",
        variant: "destructive"
      });
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
      await updatePair(pairId, { 
        status: 'running',
        started_at: new Date().toISOString()
      });
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
        await updatePair(pair.id, { 
          status: 'running',
          started_at: new Date().toISOString()
        });
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

  const handleRemoveAll = async () => {
    try {
      // Remover todas as duplas do banco de dados
      const { error } = await supabase
        .from('saas_pares_maturacao')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Remove tudo (condição sempre verdadeira)

      if (error) throw error;

      // Recarregar pares
      await loadPairs();
      
      toast({
        title: "✅ Todas as Duplas Removidas",
        description: "Todas as duplas foram removidas com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao remover todas as duplas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover todas as duplas.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: ChipPair['status'], startedAt?: string) => {
    switch (status) {
      case 'running': 
        const startDate = startedAt ? new Date(startedAt).toLocaleDateString('pt-BR') : 'Hoje';
        const startTime = startedAt ? new Date(startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        return (
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Em Execução</Badge>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Iniciado em: {startDate} {startTime}
            </div>
          </div>
        );
      case 'paused': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pausado</Badge>;
      default: return <Badge variant="secondary">Parado</Badge>;
    }
  };

  const getAvailableChipsForSecond = (selectedFirst: string) => {
    return whatsappConnections
      .filter(connection => 
        connection.status === 'active' && connection.name !== selectedFirst
      )
      .sort((a, b) => {
        const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
        
        if (numA !== numB) {
          return numA - numB;
        }
        
        return a.name.localeCompare(b.name);
      });
  };

  // Conexões ativas formatadas e ordenadas numericamente
  const activeConnections: ActiveConnection[] = whatsappConnections
    .filter(conn => conn.status === 'active')
    .map(conn => ({
      id: conn.id,
      name: conn.name,
      status: 'connected' as const,
      lastSeen: conn.lastActive,
      platform: 'WhatsApp'
    }))
    .sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
      
      if (numA !== numB) {
        return numA - numB;
      }
      
      return a.name.localeCompare(b.name);
    });

  const loading = false;
  const activePairs = config.selectedPairs.filter(pair => pair.isActive);
  const runningPairs = config.selectedPairs.filter(pair => pair.status === 'running');
  const totalMessages = config.selectedPairs.reduce((acc, pair) => acc + pair.messagesExchanged, 0);
  const isConfigValid = config.selectedPairs.length > 0;

  return (
    <div className="space-y-6">
      {/* Header com Toggle */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Sistema de Maturação</h2>
            <p className="text-muted-foreground">
              Configure conversas automáticas entre conexões ativas ({activeConnections.length} disponíveis)
            </p>
          </div>

          {/* Toggle de Modo - SIMPLIFICADO */}
          <div className="border-2 border-primary rounded-lg px-5 py-3 flex items-center gap-4 bg-background shadow-md">
            <button
              onClick={() => {
                console.log('❌ Clique no botão PROMPTS');
                setGlobalMaturationMode('prompts');
                toast({
                  title: "Modo Alterado",
                  description: "🧠 Usando Prompts IA",
                });
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer ${
                globalMaturationMode === 'prompts' 
                  ? 'bg-primary text-primary-foreground font-bold' 
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span className="text-sm whitespace-nowrap">Prompts IA</span>
            </button>
            
            <div className="h-8 w-px bg-border" />
            
            <button
              onClick={() => {
                console.log('❌ Clique no botão MENSAGENS');
                setGlobalMaturationMode('messages');
                toast({
                  title: "Modo Alterado",
                  description: "💬 Usando Mensagens + Dados",
                });
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer ${
                globalMaturationMode === 'messages' 
                  ? 'bg-primary text-primary-foreground font-bold' 
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm whitespace-nowrap">Mensagens + Dados</span>
            </button>
          </div>
        </div>

        {/* Info sobre modo atual */}
        <div className={`border rounded-lg p-3 ${globalMaturationMode === 'prompts' ? 'bg-primary/10 border-primary/20' : 'bg-secondary/10 border-secondary/20'}`}>
          <div className="flex items-start gap-2">
            {globalMaturationMode === 'prompts' ? (
              <>
                <Brain className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-primary">Modo Ativo: Prompts IA</p>
                  <p className="text-muted-foreground">
                    Novas duplas usarão prompts configurados na aba "Prompts de IA" para gerar mensagens naturais com IA.
                  </p>
                </div>
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-secondary">Modo Ativo: Mensagens + Dados</p>
                  <p className="text-muted-foreground">
                    Novas duplas usarão mensagens da aba "Mensagens" e recursos da aba "Dados" (offline, sem consumo de tokens).
                  </p>
                </div>
              </>
            )}
          </div>
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
                  {whatsappConnections
                    .filter(conn => conn.status === 'active')
                    .sort((a, b) => {
                      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
                      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
                      
                      if (numA !== numB) {
                        return numA - numB;
                      }
                      
                      return a.name.localeCompare(b.name);
                    })
                    .map(conn => (
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

      {/* Lista de Duplas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Duplas Configuradas ({config.selectedPairs.length})</CardTitle>
              <CardDescription>Gerencie as duplas</CardDescription>
            </div>
            {config.selectedPairs.length > 0 && (
              <div className="flex gap-2">
                <Button 
                  onClick={handleStartAll}
                  className="flex items-center gap-2"
                  disabled={activePairs.length === 0}
                >
                  <Play className="w-4 h-4" />
                  Iniciar Todos
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remover Todos
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover Todas as Duplas?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá remover permanentemente todas as {config.selectedPairs.length} duplas configuradas.
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemoveAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Remover Todos
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Barra de busca */}
          {config.selectedPairs.length > 0 && (
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Buscar dupla por nome do chip..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          )}
          
          {filteredPairs.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{searchTerm ? 'Nenhuma dupla encontrada' : 'Nenhuma dupla'}</h3>
              <p className="text-sm text-muted-foreground">{searchTerm ? 'Tente outro termo de busca' : 'Configure a primeira dupla para começar'}</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {filteredPairs.map(pair => (
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
                              {getStatusBadge(pair.status, pair.startedAt)}
                            </div>
                          </div>
                          
                          {/* Linha 3: Modo e Controles */}
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              {pair.maturationMode === 'messages' ? (
                                <>
                                  <MessageCircle className="w-4 h-4 text-secondary" />
                                  <Badge variant="secondary" className="text-xs">
                                    💬 Mensagens + Dados
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <Brain className="w-4 h-4 text-primary" />
                                  <Badge variant="default" className="text-xs">
                                    🧠 Prompts IA
                                  </Badge>
                                </>
                              )}
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