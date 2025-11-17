import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Play, Square, RefreshCw, Users, CheckSquare, Search } from "lucide-react";
import { useMaturadorPairs } from "@/hooks/useMaturadorPairs";

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
  const { createPair, pairs } = useMaturadorPairs();

  // Buscar todas as instâncias diretamente da Evolution API
  const fetchAllInstances = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Buscando instâncias da Evolution API...');
      
      const response = await fetch(
        `https://rltkxwswlvuzwmmbqwkr.supabase.co/functions/v1/evolution-api?action=fetchAll`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsdGt4d3N3bHZ1endtbWJxd2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzg1MTUsImV4cCI6MjA3MjYxNDUxNX0.CFvBnfnzS7GD8ksbDprZ3sbFE1XHRhtrJJpBUaGCQlM',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Resposta da API:', data);

      if (data.success && data.instances && data.instances.length > 0) {
        // Filtrar apenas instâncias conectadas
        const connectedInstances = data.instances.filter((inst: any) => 
          inst.instance?.state === 'open' || inst.connectionStatus === 'open'
        );

        const instancesList: EvolutionInstance[] = connectedInstances.map((inst: any) => ({
          instanceName: inst.instance?.instanceName || inst.instanceName,
          status: inst.instance?.state || inst.connectionStatus || 'unknown',
          phoneNumber: inst.instance?.ownerJid?.split('@')[0] || '',
          displayName: inst.instance?.profileName || inst.instanceName
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

    setIsMaturing(true);
    let createdPairs = 0;
    let skippedPairs = 0;

    try {
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
              await createPair(chip1, chip2, 'messages');
              createdPairs++;
              
              // Pequeno delay para não sobrecarregar
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              console.error(`Erro ao criar par ${chip1} <-> ${chip2}:`, error);
              skippedPairs++;
            }
          } else {
            skippedPairs++;
          }
        }
      }

      toast({
        title: "🎉 Maturação Global Iniciada!",
        description: `${createdPairs} pares criados, ${skippedPairs} já existiam`,
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

  // Filtrar instâncias por busca
  const filteredInstances = instances.filter(instance =>
    instance.instanceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instance.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instance.phoneNumber?.includes(searchTerm)
  );

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
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-bold">
                  {isMaturing ? (
                    <Badge variant="default" className="animate-pulse">
                      Criando Pares
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
