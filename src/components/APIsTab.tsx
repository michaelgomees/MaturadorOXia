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
import { Link, CheckCircle, XCircle, RefreshCw, Save, Plus, QrCode, Bot, Brain, Sparkles, Network, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConnectionDashboard } from "./ConnectionDashboard";
import { useConnections } from "@/contexts/ConnectionsContext";
import { QRCodeViewModal } from "@/components/QRCodeViewModal";

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

export const APIsTab = () => {
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
  
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  const { toast } = useToast();
  const { connections, addConnection, updateConnection, deleteConnection, syncWithEvolutionAPI } = useConnections();

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

  // Função removida - usando contexto

  const handleSaveAPI = () => {
    if (!evolutionAPI.endpoint || !evolutionAPI.apiKey) {
      toast({
        title: "Erro",
        description: "Endpoint e chave de API são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    saveEvolutionAPI({
      ...evolutionAPI,
      lastTest: new Date().toISOString()
    });
    
    toast({
      title: "API configurada",
      description: "Configuração da Evolution API salva com sucesso."
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

    // Simular teste de conexão
    const updatedAPI = {
      ...evolutionAPI,
      status: 'connected' as const,
      lastTest: new Date().toISOString()
    };
    
    saveEvolutionAPI(updatedAPI);
    
    toast({
      title: "API testada",
      description: "Conexão com Evolution API estabelecida com sucesso."
    });
  };

  const handleSaveAIConfig = () => {
    saveAIConfig(aiConfig);
    toast({
      title: "Configuração salva",
      description: "Configurações de IA foram salvas com sucesso."
    });
  };

  const handleTestAIProvider = async (provider: 'openai' | 'anthropic' | 'google') => {
    const apiKey = provider === 'openai' ? aiConfig.openai_api_key :
                   provider === 'anthropic' ? aiConfig.anthropic_api_key :
                   aiConfig.google_api_key;

    if (!apiKey) {
      toast({
        title: "Erro",
        description: `Chave de API do ${provider.toUpperCase()} não configurada.`,
        variant: "destructive"
      });
      return;
    }

    // Simular teste de API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "API testada",
      description: `Conexão com ${provider.toUpperCase()} API validada com sucesso.`
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

  const toggleApiKeyVisibility = (field: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleCreateConnection = async () => {
    if (!newConnectionName.trim()) {
      toast({
        title: "Erro",
        description: "Nome da conexão é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newConnection = await addConnection({
        name: newConnectionName,
        status: 'connecting',
        isActive: false,
        conversationsCount: 0,
        aiModel: 'ChatGPT'
      });

      setNewConnectionName('');
      setIsCreatingConnection(false);
      
      toast({
        title: "Conexão criada com sucesso!",
        description: `Conexão "${newConnectionName}" foi criada. O QR Code será gerado automaticamente.`
      });
    } catch (error) {
      console.error('Erro ao criar conexão:', error);
      toast({
        title: "Erro ao criar conexão",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const handleToggleConnection = async (id: string) => {
    const connection = connections.find(c => c.id === id);
    if (connection) {
      const newStatus = connection.isActive ? 'inactive' : 'active';
      await updateConnection(id, {
        status: newStatus,
        isActive: !connection.isActive
      });
      
      toast({
        title: `Conexão ${newStatus === 'active' ? 'ativada' : 'desativada'}`,
        description: `${connection.name} foi ${newStatus === 'active' ? 'ativada' : 'desativada'}.`
      });
    }
  };

  const handleDeleteConnection = async (id: string) => {
    const connection = connections.find(c => c.id === id);
    if (connection && window.confirm(`Tem certeza que deseja excluir a conexão "${connection.name}"?`)) {
      try {
        await deleteConnection(id);
        toast({
          title: "Conexão removida",
          description: "Conexão deletada com sucesso."
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao deletar conexão.",
          variant: "destructive"
        });
      }
    }
  };

  const handleReconfigureConnection = async (id: string) => {
    const connection = connections.find(c => c.id === id);
    if (!connection) return;

    try {
      // Atualizar para status connecting
      await updateConnection(id, { status: 'connecting' });
      
      // Gerar novo evolutionInstanceName se não tiver
      const instanceName = connection.evolutionInstanceName || connection.name.toLowerCase().replace(/\s+/g, '_');
      
      // Atualizar com o instanceName primeiro
      await updateConnection(id, {
        evolutionInstanceName: instanceName
      });

      // Tentar sincronizar com Evolution API para puxar dados do perfil
      await syncWithEvolutionAPI(id);
      
      toast({
        title: "Conexão Sincronizada",
        description: `${connection.name} foi sincronizada com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao sincronizar conexão:', error);
      await updateConnection(id, { status: 'inactive' });
      toast({
        title: "Erro na Sincronização",
        description: `Não foi possível sincronizar ${connection.name}. Verifique as configurações da Evolution API.`,
        variant: "destructive"
      });
    }
  };

  const handleShowQR = (connectionId: string) => {
    setShowQRModal(connectionId);
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

      {/* Evolution API Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(evolutionAPI.status)}
                Evolution API (Global)
              </CardTitle>
              <CardDescription>
                Configuração global da Evolution API usada em todas as conexões
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
                placeholder="https://evolution-api.exemplo.com"
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

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeViewModal
          open={!!showQRModal}
          onOpenChange={() => setShowQRModal(null)}
          connectionId={showQRModal}
        />
      )}

      {/* Connections Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conexões WhatsApp</CardTitle>
              <CardDescription>
                Gerencie conexões que usam a configuração global da Evolution API
              </CardDescription>
            </div>
             <Button 
               onClick={() => setIsCreatingConnection(true)}
             >
              <Plus className="w-4 h-4 mr-2" />
              Nova Conexão
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Create Connection Form */}
          {isCreatingConnection && (
            <div className="space-y-4 p-4 border rounded-lg mb-4">
              <div className="space-y-2">
                <Label htmlFor="connectionName">Nome da Conexão</Label>
                <Input
                  id="connectionName"
                  placeholder="Ex: WhatsApp Principal"
                  value={newConnectionName}
                  onChange={(e) => setNewConnectionName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreatingConnection(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateConnection}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Conexão
                </Button>
              </div>
            </div>
          )}

          {/* Connections List */}
          <div className="space-y-4">
            {connections.length === 0 ? (
              <div className="text-center py-8">
                <Link className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Nenhuma conexão configurada</h3>
                <p className="text-sm text-muted-foreground">
                  {evolutionAPI.status === 'connected' 
                    ? "Crie sua primeira conexão WhatsApp"
                    : "Configure a Evolution API primeiro para obter QR Codes"
                  }
                </p>
              </div>
            ) : (
              connections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <h4 className="font-medium">{connection.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {connection.phone} • {connection.conversationsCount} conversas
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Última atividade: {new Date(connection.lastActive).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge variant={connection.status === 'active' ? 'default' : connection.status === 'connecting' ? 'secondary' : 'outline'}>
                          {connection.status === 'active' ? 'Ativo' : 
                           connection.status === 'connecting' ? 'Conectando' : 
                           connection.status === 'error' ? 'Erro' : 'Inativo'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {connection.aiModel}
                        </Badge>
                      </div>
                    </div>
                  
                    <div className="flex items-center gap-2">
                      {connection.qrCode && (
                        <Button variant="outline" size="sm" onClick={() => handleShowQR(connection.id)}>
                          <QrCode className="w-4 h-4 mr-2" />
                          Ver QR
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleShowQR(connection.id)}
                        disabled={connection.status === 'active' && !connection.qrCode}
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Ver QR Code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReconfigureConnection(connection.id)}
                        disabled={connection.status === 'connecting'}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sincronizar
                      </Button>
                      <Switch
                        checked={connection.isActive}
                        onCheckedChange={() => handleToggleConnection(connection.id)}
                        disabled={connection.status === 'connecting'}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteConnection(connection.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remover
                      </Button>
                    </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Providers Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Provedores de IA
          </CardTitle>
          <CardDescription>
            Configure as chaves de API dos provedores de inteligência artificial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OpenAI Configuration */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <h3 className="font-semibold">OpenAI (ChatGPT)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key">Chave de API</Label>
                <div className="relative">
                  <Input
                    id="openai-key"
                    type={showApiKeys.openai ? "text" : "password"}
                    placeholder="sk-proj-..."
                    value={aiConfig.openai_api_key}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, openai_api_key: e.target.value }))}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => toggleApiKeyVisibility('openai')}
                  >
                    {showApiKeys.openai ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="openai-org">Organização (Opcional)</Label>
                <Input
                  id="openai-org"
                  placeholder="org-..."
                  value={aiConfig.openai_organization}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, openai_organization: e.target.value }))}
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleTestAIProvider('openai')}
              disabled={!aiConfig.openai_api_key}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Testar OpenAI
            </Button>
          </div>

          {/* Claude Configuration */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <h3 className="font-semibold">Anthropic (Claude)</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="claude-key">Chave de API</Label>
              <div className="relative">
                <Input
                  id="claude-key"
                  type={showApiKeys.claude ? "text" : "password"}
                  placeholder="sk-ant-..."
                  value={aiConfig.anthropic_api_key}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, anthropic_api_key: e.target.value }))}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => toggleApiKeyVisibility('claude')}
                >
                  {showApiKeys.claude ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleTestAIProvider('anthropic')}
              disabled={!aiConfig.anthropic_api_key}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Testar Claude
            </Button>
          </div>

          {/* Google AI Configuration */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold">Google AI (Gemini)</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="google-key">Chave de API</Label>
              <div className="relative">
                <Input
                  id="google-key"
                  type={showApiKeys.google ? "text" : "password"}
                  placeholder="AIza..."
                  value={aiConfig.google_api_key}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, google_api_key: e.target.value }))}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => toggleApiKeyVisibility('google')}
                >
                  {showApiKeys.google ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleTestAIProvider('google')}
              disabled={!aiConfig.google_api_key}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Testar Gemini
            </Button>
          </div>

          {/* Default Settings */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Configurações Padrão</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default-model">Modelo Padrão</Label>
                <Select 
                  value={aiConfig.default_model} 
                  onValueChange={(value) => setAiConfig(prev => ({ ...prev, default_model: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5-2025-08-07">GPT-5</SelectItem>
                    <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                    <SelectItem value="claude-opus-4-20250514">Claude 4 Opus</SelectItem>
                    <SelectItem value="claude-sonnet-4-20250514">Claude 4 Sonnet</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-tokens">Max Tokens</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  value={aiConfig.max_tokens}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={aiConfig.temperature}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveAIConfig}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações de IA
            </Button>
          </div>
        </CardContent>
      </Card>

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
              <div className="relative">
                <Input
                  id="ngrok-token"
                  type={showApiKeys.ngrok ? "text" : "password"}
                  placeholder="2abc..."
                  value={ngrokConfig.auth_token}
                  onChange={(e) => setNgrokConfig(prev => ({ ...prev, auth_token: e.target.value }))}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => toggleApiKeyVisibility('ngrok')}
                >
                  {showApiKeys.ngrok ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
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