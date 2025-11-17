import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Play, Square, RefreshCw, Users, CheckSquare, Search, MessageSquare, Pause, Trash2 } from "lucide-react";
import { useMaturadorPairs } from "@/hooks/useMaturadorPairs";
import { useMaturationMessages } from "@/hooks/useMaturationMessages";

interface EvolutionInstance {
  instanceName: string;
  status: string;
  phoneNumber?: string;
  displayName?: string;
}

export const GlobalMaturationTab = () => {
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMaturing, setIsMaturing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { createPair, pairs, togglePairActive, deletePair, refreshPairs, loading: pairsLoading, updatePair } = useMaturadorPairs();
  const { messages: maturationMessages } = useMaturationMessages();

  // Carregar pares ao montar o componente
  useEffect(() => {
    refreshPairs();
  }, []);

  // Calcular total de mensagens enviadas de todos os pares
  const totalMessagesSent = pairs.reduce((sum, pair) => sum + (pair.messages_count || 0), 0);
  
  // Filtrar pares ativos/em execução
  const activePairs = pairs.filter(pair => pair.is_active && pair.status === 'running');
  const pausedPairs = pairs.filter(pair => pair.is_active && pair.status === 'stopped');

  // Buscar todas as instâncias diretamente da Evolution API
  const fetchAllInstances = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Buscando instâncias da Evolution API...');
      
      // Fazer requisição com query params
      const supabaseUrl = 'https://rltkxwswlvuzwmmbqwkr.supabase.co';
      const url = new URL(`${supabaseUrl}/functions/v1/evolution-api`);
      url.searchParams.set('action', 'fetchAll');

      const session = await supabase.auth.getSession();
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsdGt4d3N3bHZ1endtbWJxd2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzg1MTUsImV4cCI6MjA3MjYxNDUxNX0.CFvBnfnzS7GD8ksbDprZ3sbFE1XHRhtrJJpBUaGCQlM',
          'Authorization': `Bearer ${session.data.session?.access_token || ''}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro na requisição:', errorData);
        throw new Error(errorData.error || 'Failed to fetch instances');
      }

      const apiData = await response.json();
      console.log('📥 Resposta da API:', apiData);

      if (apiData.success && apiData.instances && apiData.instances.length > 0) {
        const instancesList: EvolutionInstance[] = apiData.instances.map((inst: any) => ({
          instanceName: inst.instanceName,
          status: inst.connectionStatus,
          phoneNumber: inst.phoneNumber || '',
          displayName: inst.displayName || inst.instanceName
        }));

        setInstances(instancesList);
        toast({
          title: "✅ Instâncias Carregadas",
          description: `${instancesList.length} instâncias conectadas encontradas na Evolution API`,
        });
      } else {
        setInstances([]);
        toast({
          title: "⚠️ Nenhuma Instância",
          description: "Nenhuma instância conectada encontrada na Evolution API",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Erro ao buscar instâncias:', error);
      setInstances([]);
      toast({
        title: "❌ Erro",
        description: "Não foi possível carregar as instâncias da Evolution API",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllInstances();
  }, []);

  // Selecionar/Desselecionar instância
  const toggleInstance = (instanceName: string) => {
    setSelectedInstances(prev => {
      if (prev.includes(instanceName)) {
        return prev.filter(name => name !== instanceName);
      } else {
        return [...prev, instanceName];
      }
    });
  };

  // Selecionar/Desselecionar todas
  const toggleAllInstances = () => {
    if (selectedInstances.length === instances.length) {
      setSelectedInstances([]);
    } else {
      setSelectedInstances(instances.map(i => i.instanceName));
    }
  };

  // Criar todos os pares possíveis entre as instâncias selecionadas
  const startGlobalMaturation = async () => {
    if (selectedInstances.length < 2) {
      toast({
        title: "⚠️ Seleção Insuficiente",
        description: "Selecione pelo menos 2 instâncias para iniciar a maturação global",
        variant: "destructive",
      });
      return;
    }

    // Buscar arquivo de mensagens ativo
    const activeMessageFile = maturationMessages.find(msg => msg.is_active);
    if (!activeMessageFile) {
      toast({
        title: "⚠️ Nenhum Arquivo de Mensagens Ativo",
        description: "Por favor, ative um arquivo de mensagens na aba 'Mensagens' antes de iniciar a maturação global",
        variant: "destructive",
      });
      return;
    }

    setIsMaturing(true);
    let createdPairs = 0;
    let skippedPairs = 0;

    try {
      console.log('🚀 Iniciando maturação global com arquivo:', activeMessageFile.nome);
      
      // Criar todos os pares possíveis (combinações sem repetição)
      for (let i = 0; i < selectedInstances.length; i++) {
        for (let j = i + 1; j < selectedInstances.length; j++) {
          const chip1 = selectedInstances[i];
          const chip2 = selectedInstances[j];

          // Verificar se o par já existe
          const pairExists = pairs.some(
            pair => 
              (pair.nome_chip1 === chip1 && pair.nome_chip2 === chip2) ||
              (pair.nome_chip1 === chip2 && pair.nome_chip2 === chip1)
          );

          if (!pairExists) {
            try {
              // Criar par no modo 'messages' com o arquivo ativo
              await createPair(chip1, chip2, 'messages', activeMessageFile.id);
              createdPairs++;
              
              // Pequeno delay para não sobrecarregar
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              console.error(`Erro ao criar par ${chip1} <-> ${chip2}:`, error);
              skippedPairs++;
            }
          } else {
            console.log(`Par ${chip1} <-> ${chip2} já existe`);
            skippedPairs++;
          }
        }
      }

      toast({
        title: "🎉 Maturação Global Iniciada!",
        description: `${createdPairs} novos pares criados, ${skippedPairs} já existiam. Usando arquivo: ${activeMessageFile.nome}`,
      });
    } catch (error) {
      console.error('Erro na maturação global:', error);
      toast({
        title: "❌ Erro",
        description: "Erro ao criar pares de maturação",
        variant: "destructive",
      });
    } finally {
      setIsMaturing(false);
    }
  };

  // Pausar todas as duplas configuradas
  const pauseAllPairs = async () => {
    try {
      const runningPairs = pairs.filter(p => p.status === 'running');
      
      if (runningPairs.length === 0) {
        toast({
          title: "ℹ️ Info",
          description: "Não há duplas ativas para pausar",
        });
        return;
      }

      setIsLoading(true);

      // Pausar todos os pares em paralelo
      await Promise.all(
        runningPairs.map(pair => 
          updatePair(pair.id, { 
            status: 'stopped' as const,
            is_active: false 
          })
        )
      );

      await refreshPairs();

      toast({
        title: "⏸️ Todas as Duplas Pausadas",
        description: `${runningPairs.length} duplas foram pausadas com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao pausar todas as duplas:', error);
      toast({
        title: "❌ Erro",
        description: "Erro ao pausar duplas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar todas as duplas pausadas
  const startAllPairs = async () => {
    try {
      const stoppedPairs = pairs.filter(p => p.status === 'stopped');
      
      if (stoppedPairs.length === 0) {
        toast({
          title: "ℹ️ Info",
          description: "Não há duplas pausadas para iniciar",
        });
        return;
      }

      setIsLoading(true);

      // Verificar status das instâncias primeiro
      const { disconnected } = await checkInstancesStatus();
      
      if (disconnected.length > 0) {
        toast({
          title: "❌ Instâncias Desconectadas",
          description: `Não é possível iniciar. Instâncias offline: ${disconnected.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Iniciar todos os pares em paralelo
      await Promise.all(
        stoppedPairs.map(pair => 
          updatePair(pair.id, { 
            status: 'running' as const,
            is_active: true,
            started_at: new Date().toISOString()
          })
        )
      );

      await refreshPairs();

      // Forçar chamada imediata da maturação
      await supabase.functions.invoke('force-maturation');

      toast({
        title: "▶️ Todas as Duplas Iniciadas",
        description: `${stoppedPairs.length} duplas foram iniciadas com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao iniciar todas as duplas:', error);
      toast({
        title: "❌ Erro",
        description: "Erro ao iniciar duplas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar status das instâncias via Evolution API
  const checkInstancesStatus = async () => {
    try {
      const supabaseUrl = 'https://rltkxwswlvuzwmmbqwkr.supabase.co';
      const url = new URL(`${supabaseUrl}/functions/v1/evolution-api`);
      url.searchParams.set('action', 'fetchAll');

      const session = await supabase.auth.getSession();
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsdGt4d3N3bHZ1endtbWJxd2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzg1MTUsImV4cCI6MjA3MjYxNDUxNX0.CFvBnfnzS7GD8ksbDprZ3sbFE1XHRhtrJJpBUaGCQlM',
          'Authorization': `Bearer ${session.data.session?.access_token || ''}`
        }
      });

      if (!response.ok) {
        return { disconnected: [] };
      }

      const apiData = await response.json();
      
      if (!apiData.success || !apiData.instances) {
        return { disconnected: [] };
      }

      // Coletar todas as instâncias dos pares ativos
      const activePairInstances = new Set<string>();
      activePairs.forEach(pair => {
        activePairInstances.add(pair.nome_chip1);
        activePairInstances.add(pair.nome_chip2);
      });

      // Verificar quais estão desconectadas
      const disconnectedInstances: string[] = [];
      activePairInstances.forEach(instanceName => {
        const instance = apiData.instances.find((i: any) => i.instanceName === instanceName);
        if (!instance || instance.connectionStatus !== 'open') {
          disconnectedInstances.push(instanceName);
        }
      });

      return { disconnected: disconnectedInstances };
    } catch (error) {
      console.error('Erro ao verificar status das instâncias:', error);
      return { disconnected: [] };
    }
  };

  // Sincronização automática a cada 2 minutos
  useEffect(() => {
    if (activePairs.length === 0) return;

    const syncInterval = setInterval(async () => {
      console.log('🔄 Sincronização automática: verificando instâncias...');
      
      const { disconnected } = await checkInstancesStatus();
      
      if (disconnected.length > 0) {
        console.error('❌ Instâncias desconectadas detectadas:', disconnected);
        
        // Pausar todos os pares que usam instâncias desconectadas
        const pairsToStop = activePairs.filter(pair => 
          disconnected.includes(pair.nome_chip1) || disconnected.includes(pair.nome_chip2)
        );

        if (pairsToStop.length > 0) {
          await Promise.all(
            pairsToStop.map(pair => 
              updatePair(pair.id, { 
                status: 'stopped' as const,
                is_active: false 
              })
            )
          );

          await refreshPairs();

          toast({
            title: "⚠️ Maturação Pausada Automaticamente",
            description: `Instâncias desconectadas: ${disconnected.join(', ')}. Reconecte para continuar.`,
            variant: "destructive",
          });
        }
      } else {
        console.log('✅ Todas as instâncias estão conectadas');
      }
    }, 120000); // 2 minutos = 120000ms

    return () => clearInterval(syncInterval);
  }, [activePairs]);

  // Filtrar instâncias por busca
  // Buscar todas as conexões existentes no banco para validação
  const [validConnections, setValidConnections] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchConnections = async () => {
      const { data } = await supabase
        .from('saas_conexoes')
        .select('nome')
        .eq('status', 'ativo');
      
      if (data) {
        setValidConnections(data.map(c => c.nome));
      }
    };
    
    fetchConnections();
  }, [instances]);

  const filteredInstances = instances.filter(instance => {
    // Apenas mostrar instâncias que existem no banco de dados
    const existsInDB = validConnections.includes(instance.instanceName);
    const matchesSearch = instance.instanceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.phoneNumber?.includes(searchTerm);
    
    return existsInDB && matchesSearch;
  });

  const totalPossiblePairs = selectedInstances.length >= 2 
    ? (selectedInstances.length * (selectedInstances.length - 1)) / 2 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Maturação Global</CardTitle>
                <CardDescription>
                  Gerencie e inicie maturação entre todas as instâncias da Evolution API
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={fetchAllInstances}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Instâncias</p>
                <p className="text-2xl font-bold">{instances.length}</p>
              </div>
              <Globe className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selecionadas</p>
                <p className="text-2xl font-bold text-primary">{selectedInstances.length}</p>
              </div>
              <CheckSquare className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pares a Criar</p>
                <p className="text-2xl font-bold text-green-600">{totalPossiblePairs}</p>
              </div>
              <Users className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                <p className="text-2xl font-bold text-primary">{totalMessagesSent}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-bold">
                  {isMaturing ? (
                    <Badge variant="default" className="animate-pulse">
                      Criando Pares
                    </Badge>
                  ) : activePairs.length > 0 ? (
                    <Badge className="bg-green-600">
                      {activePairs.length} Maturando
                    </Badge>
                  ) : (
                    <Badge variant="outline">Aguardando</Badge>
                  )}
                </p>
              </div>
              <Play className="w-8 h-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Instâncias Disponíveis</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={toggleAllInstances}
                variant="outline"
                size="sm"
                disabled={instances.length === 0}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                {selectedInstances.length === instances.length ? 'Desselecionar Todas' : 'Selecionar Todas'}
              </Button>
              <Button
                onClick={startGlobalMaturation}
                disabled={selectedInstances.length < 2 || isMaturing}
                size="sm"
                className="bg-gradient-to-r from-primary to-secondary"
              >
                {isMaturing ? (
                  <>
                    <Square className="w-4 h-4 mr-2 animate-pulse" />
                    Criando Pares...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar Maturação Global
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar instância..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredInstances.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Globe className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhuma instância encontrada' : 'Nenhuma instância disponível'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredInstances.map((instance) => (
                  <div
                    key={instance.instanceName}
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                      selectedInstances.includes(instance.instanceName)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedInstances.includes(instance.instanceName)}
                      onCheckedChange={() => toggleInstance(instance.instanceName)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{instance.instanceName}</p>
                        <Badge variant={instance.status === 'active' ? 'default' : 'secondary'}>
                          {instance.status}
                        </Badge>
                      </div>
                      {instance.displayName && (
                        <p className="text-sm text-muted-foreground">{instance.displayName}</p>
                      )}
                      {instance.phoneNumber && (
                        <p className="text-xs text-muted-foreground">{instance.phoneNumber}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pares em Maturação */}
      {pairs.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Duplas Configuradas ({pairs.length})
                </CardTitle>
                <CardDescription>
                  Pares criados e gerenciados pela maturação global
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {pausedPairs.length > 0 && (
                  <Button
                    onClick={startAllPairs}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                    disabled={isLoading}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar Todas
                  </Button>
                )}
                {activePairs.length > 0 && (
                  <Button
                    onClick={pauseAllPairs}
                    variant="outline"
                    size="sm"
                    className="text-orange-600 border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                    disabled={isLoading}
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pausar Todas
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {pairs.map((pair) => (
                  <div
                    key={pair.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                      pair.status === 'running' && pair.is_active
                        ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {pair.nome_chip1} ↔️ {pair.nome_chip2}
                        </p>
                        {pair.status === 'running' && pair.is_active && (
                          <Badge className="bg-green-600 text-xs">
                            Maturando
                          </Badge>
                        )}
                        {pair.status === 'stopped' && (
                          <Badge variant="outline" className="text-xs">
                            Pausado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {pair.messages_count || 0} mensagens
                        </span>
                        <span>Modo: {pair.maturation_mode}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePairActive(pair.id)}
                      >
                        {pair.status === 'running' ? (
                          <>
                            <Pause className="w-4 h-4 mr-1" />
                            Pausar
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Iniciar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Deseja remover a dupla ${pair.nome_chip1} ↔️ ${pair.nome_chip2}?`)) {
                            deletePair(pair.id);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold">Como Funciona a Maturação Global</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>✅ Automático:</strong> Selecione as instâncias e o sistema criará automaticamente todos os pares possíveis entre elas.
                </p>
                <p>
                  <strong>🔄 Sem Interrupção:</strong> Novas instâncias podem ser adicionadas durante a maturação sem precisar parar o processo.
                </p>
                <p>
                  <strong>💬 Conversas Cruzadas:</strong> Todas as instâncias selecionadas conversarão entre si usando as mensagens configuradas na aba "Mensagens".
                </p>
                <p>
                  <strong>⚡ Inteligente:</strong> O sistema detecta pares já existentes e não os duplica.
                </p>
                <p>
                  <strong>📊 Dados e Mensagens:</strong> Respeita fortemente as configurações das abas "Mensagens" e "Dados" para envio de mídias e textos.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
