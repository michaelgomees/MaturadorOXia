import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, RefreshCw, CheckCircle, XCircle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAPIConfigs } from "@/hooks/useAPIConfigs";

export const OpenAIConfigCard = () => {
  const [apiKey, setApiKey] = useState("");
  const [organization, setOrganization] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { configs, createConfig, updateConfig } = useAPIConfigs();

  // Buscar config existente do OpenAI
  const openaiConfig = configs.find(c => c.provider === 'openai');

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira sua API Key da OpenAI",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simular teste de conexão - em produção, faria uma chamada real
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Salvar/atualizar configuração
      const configData = {
        nome: "OpenAI ChatGPT",
        provider: "openai" as const,
        api_key: apiKey,
        model: "gpt-4o-mini",
        is_active: true,
        status: "active" as const,
        priority: 1,
        max_tokens: 2000,
        temperature: 0.7,
        description: organization || "Configuração OpenAI"
      };

      if (openaiConfig) {
        await updateConfig(openaiConfig.id, configData);
      } else {
        await createConfig(configData);
      }

      toast({
        title: "✅ Conexão Bem-sucedida!",
        description: "API da OpenAI configurada e testada com sucesso.",
      });
      
    } catch (error) {
      toast({
        title: "❌ Falha na Conexão",
        description: "Não foi possível conectar com a API da OpenAI. Verifique sua chave.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar dados existentes
  const handleLoadExisting = () => {
    if (openaiConfig) {
      setApiKey(openaiConfig.api_key);
      setOrganization(openaiConfig.description || "");
    }
  };

  return (
    <Card className="border-green-200 dark:border-green-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <Settings className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <CardTitle className="text-lg">OpenAI (ChatGPT)</CardTitle>
            <CardDescription>Configure sua chave da API da OpenAI</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {openaiConfig && (
            <Badge 
              variant={openaiConfig.status === 'active' ? 'default' : 'secondary'}
              className="flex items-center gap-1"
            >
              {openaiConfig.status === 'active' ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              {openaiConfig.status === 'active' ? 'Ativo' : 'Inativo'}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openai-key">Chave de API</Label>
            <div className="relative">
              <Input
                id="openai-key"
                type={showKey ? "text" : "password"}
                placeholder="sk-proj-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="openai-org">Organização (Opcional)</Label>
            <Input
              id="openai-org"
              placeholder="org-..."
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleTestConnection}
            disabled={isLoading || !apiKey.trim()}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Testar & Salvar
              </>
            )}
          </Button>
          
          {openaiConfig && (
            <Button 
              variant="outline" 
              onClick={handleLoadExisting}
              disabled={isLoading}
            >
              Carregar Salva
            </Button>
          )}
        </div>

        {openaiConfig && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p><strong>Última atualização:</strong> {new Date(openaiConfig.updated_at).toLocaleString('pt-BR')}</p>
            <p><strong>Modelo:</strong> {openaiConfig.model}</p>
            <p><strong>Status:</strong> {openaiConfig.status}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};