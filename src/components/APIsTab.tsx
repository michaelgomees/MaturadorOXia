import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, CheckCircle, XCircle, RefreshCw, Save, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OpenAIConfigCard } from "@/components/OpenAIConfigCard";
import { supabase } from "@/integrations/supabase/client";

interface EvolutionAPI {
  endpoint: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  lastTest: string;
}

interface AIProviderConfig {
  openai_api_key: string;
  anthropic_api_key: string;
  google_api_key: string;
  openai_organization?: string;
  default_model: string;
  max_tokens: number;
  temperature: number;
}

interface NgrokConfig {
  auth_token: string;
  endpoint: string;
  status: 'connected' | 'disconnected';
}

// Interface removida - usando a do contexto

interface APIsTabProps {
  isAdmin?: boolean;
}

export const APIsTab = ({ isAdmin = false }: APIsTabProps) => {
  const [evolutionAPI, setEvolutionAPI] = useState<EvolutionAPI>({
    endpoint: '',
    apiKey: '',
    status: 'disconnected',
    lastTest: ''
  });

  const [aiConfig, setAiConfig] = useState<AIProviderConfig>({
    openai_api_key: '',
    anthropic_api_key: '',
    google_api_key: '',
    openai_organization: '',
    default_model: 'gpt-5-2025-08-07',
    max_tokens: 2000,
    temperature: 0.7
  });

  const [ngrokConfig, setNgrokConfig] = useState<NgrokConfig>({
    auth_token: '',
    endpoint: '',
    status: 'disconnected'
  });
  
  const { toast } = useToast();

  // Carregar dados do localStorage
  useEffect(() => {
    const savedAPI = localStorage.getItem('ox-evolution-api');
    if (savedAPI) {
      setEvolutionAPI(JSON.parse(savedAPI));
    }

    const savedAIConfig = localStorage.getItem('ox-ai-config');
    if (savedAIConfig) {
      setAiConfig(JSON.parse(savedAIConfig));
    }

    const savedNgrokConfig = localStorage.getItem('ox-ngrok-config');
    if (savedNgrokConfig) {
      setNgrokConfig(JSON.parse(savedNgrokConfig));
    }
    
    // Dados agora gerenciados pelo contexto
  }, []);

  // Salvar configurações
  const saveEvolutionAPI = (newConfig: EvolutionAPI) => {
    setEvolutionAPI(newConfig);
    localStorage.setItem('ox-evolution-api', JSON.stringify(newConfig));
  };

  const saveAIConfig = (newConfig: AIProviderConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('ox-ai-config', JSON.stringify(newConfig));
  };

  const saveNgrokConfig = (newConfig: NgrokConfig) => {
    setNgrokConfig(newConfig);
    localStorage.setItem('ox-ngrok-config', JSON.stringify(newConfig));
  };

  const handleSaveAPI = () => {
    if (!evolutionAPI.endpoint || !evolutionAPI.apiKey) {
      toast({
        title: "Erro",
        description: "Preencha o endpoint e a chave de API.",
        variant: "destructive"
      });
      return;
    }

    saveEvolutionAPI({
      ...evolutionAPI,
      lastTest: new Date().toISOString()
    });
    
    toast({
      title: "Configuração salva",
      description: "Evolution API configurada com sucesso."
    });
  };

  const handleTestAPI = async () => {
    if (!evolutionAPI.endpoint || !evolutionAPI.apiKey) {
      toast({
        title: "Erro",
        description: "Configure endpoint e chave de API primeiro.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Testando conexão...",
      description: "Verificando conexão com a Evolution API..."
    });

    try {
      console.log('🔍 Testando Evolution API com endpoint:', evolutionAPI.endpoint);
      console.log('🔍 API Key length:', evolutionAPI.apiKey.length);
      
      // Use the test-evolution edge function for better diagnostics
      const { data, error } = await supabase.functions.invoke('test-evolution', {
        body: {
          endpoint: evolutionAPI.endpoint,
          apiKey: evolutionAPI.apiKey
        }
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data.success) {
        console.error('❌ Test failed:', data);
        throw new Error(
          `${data.error}\n\nDetalhes:\n${data.suggestions?.join('\n') || data.message || 'Erro desconhecido'}`
        );
      }

      console.log('✅ Test success:', data);
      
      const updatedAPI = {
        ...evolutionAPI,
        status: 'connected' as const,
        lastTest: new Date().toISOString()
      };
      
      saveEvolutionAPI(updatedAPI);
      toast({
        title: "✅ Conexão bem-sucedida!",
        description: `Credenciais Evolution API válidas. ${Array.isArray(data.data) ? `Encontradas ${data.data.length} instância(s).` : ''}`
      });
    } catch (error) {
      console.error('❌ Test error:', error);
      const updatedAPI = {
        ...evolutionAPI,
        status: 'error' as const,
        lastTest: new Date().toISOString()
      };
      
      saveEvolutionAPI(updatedAPI);
      toast({
        title: "❌ Erro na conexão",
        description: error instanceof Error ? error.message : "Erro ao conectar",
        variant: "destructive",
        duration: 10000
      });
    }
  };

  const handleSaveAIConfig = () => {
    saveAIConfig(aiConfig);
    toast({
      title: "Configuração salva",
      description: "Configurações de IA foram salvas com sucesso."
    });
  };

  const handleSaveNgrokConfig = () => {
    if (!ngrokConfig.auth_token) {
      toast({
        title: "Erro", 
        description: "Token de autenticação do ngrok é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    const updatedConfig = {
      ...ngrokConfig,
      status: 'connected' as const
    };
    
    saveNgrokConfig(updatedConfig);
    toast({
      title: "Ngrok configurado",
      description: "Configuração do ngrok salva com sucesso."
    });
  };

  const getStatusIcon = (status: EvolutionAPI['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: EvolutionAPI['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Desconectado</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuração de APIs</h2>
          <p className="text-muted-foreground">
            Configure todas as APIs e serviços utilizados pelo sistema
          </p>
        </div>
      </div>

      {/* Evolution API Configuration - Apenas para Admin */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(evolutionAPI.status)}
                  Evolution API (Global)
                </CardTitle>
                <CardDescription>
                  Configure a API Evolution usada em todas as conexões
                </CardDescription>
              </div>
              {getStatusBadge(evolutionAPI.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endpoint">Endpoint Evolution</Label>
                <Input
                  id="endpoint"
                  placeholder="api.oxautomacoes.com.br"
                  value={evolutionAPI.endpoint}
                  onChange={(e) => setEvolutionAPI(prev => ({ ...prev, endpoint: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">Chave de API</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Sua chave de API do Evolution"
                  value={evolutionAPI.apiKey}
                  onChange={(e) => setEvolutionAPI(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleTestAPI}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Testar Conexão
              </Button>
              <Button onClick={handleSaveAPI}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configuração
              </Button>
            </div>

            {evolutionAPI.lastTest && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  Último teste: {new Date(evolutionAPI.lastTest).toLocaleString('pt-BR')}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* OpenAI Configuration */}
      <OpenAIConfigCard />

      {/* Ngrok Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Ngrok
          </CardTitle>
          <CardDescription>
            Configure o ngrok para exposição de túneis HTTP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ngrok-token">Token de Autenticação</Label>
              <Input
                id="ngrok-token"
                type="password"
                placeholder="2abc..."
                value={ngrokConfig.auth_token}
                onChange={(e) => setNgrokConfig(prev => ({ ...prev, auth_token: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ngrok-endpoint">Endpoint (Opcional)</Label>
              <Input
                id="ngrok-endpoint"
                placeholder="https://abc123.ngrok.io"
                value={ngrokConfig.endpoint}
                onChange={(e) => setNgrokConfig(prev => ({ ...prev, endpoint: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveNgrokConfig}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configuração Ngrok
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};