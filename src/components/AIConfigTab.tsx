import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Brain, CheckCircle, XCircle, Star, Trash2, Save, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'other';
  apiKey: string;
  model: string;
  isActive: boolean;
  priority: number;
  maxTokens: number;
  temperature: number;
  description: string;
  status: 'active' | 'inactive' | 'error';
}

interface BasePrompt {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI (ChatGPT)', icon: '🤖' },
  { value: 'anthropic', label: 'Anthropic (Claude)', icon: '🧠' },
  { value: 'google', label: 'Google (Gemini)', icon: '✨' },
  { value: 'other', label: 'Outro', icon: '🔧' }
];

const OPENAI_MODELS = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
const ANTHROPIC_MODELS = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
const GOOGLE_MODELS = ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'];

export const AIConfigTab = () => {
  const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);
  const [basePrompts, setBasePrompts] = useState<BasePrompt[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: '',
    provider: 'openai' as const,
    apiKey: '',
    model: '',
    maxTokens: 2000,
    temperature: 0.7,
    description: ''
  });
  const [newPrompt, setNewPrompt] = useState({
    name: '',
    content: ''
  });
  const { toast } = useToast();

  // Carregar configurações do localStorage
  useEffect(() => {
    const savedConfigs = localStorage.getItem('ox-ai-configs');
    if (savedConfigs) {
      setAiConfigs(JSON.parse(savedConfigs));
    }
    
    const savedPrompts = localStorage.getItem('ox-base-prompts');
    if (savedPrompts) {
      setBasePrompts(JSON.parse(savedPrompts));
    }
  }, []);

  // Salvar configurações no localStorage
  const saveConfigs = (newConfigs: AIConfig[]) => {
    setAiConfigs(newConfigs);
    localStorage.setItem('ox-ai-configs', JSON.stringify(newConfigs));
  };

  // Salvar prompts no localStorage
  const savePrompts = (newPrompts: BasePrompt[]) => {
    setBasePrompts(newPrompts);
    localStorage.setItem('ox-base-prompts', JSON.stringify(newPrompts));
  };

  const handleCreateConfig = () => {
    if (!newConfig.name || !newConfig.apiKey || !newConfig.model) {
      toast({
        title: "Erro",
        description: "Nome, chave de API e modelo são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const config: AIConfig = {
      id: Date.now().toString(),
      ...newConfig,
      isActive: true,
      priority: aiConfigs.length + 1,
      status: 'inactive'
    };

    saveConfigs([...aiConfigs, config]);
    setNewConfig({
      name: '',
      provider: 'openai',
      apiKey: '',
      model: '',
      maxTokens: 2000,
      temperature: 0.7,
      description: ''
    });
    setIsCreating(false);
    
    toast({
      title: "IA configurada",
      description: "Nova configuração de IA adicionada com sucesso."
    });
  };

  const handleTestConfig = async (id: string) => {
    const config = aiConfigs.find(c => c.id === id);
    if (!config) return;

    // Simular teste de conexão
    const updatedConfigs = aiConfigs.map(c => 
      c.id === id ? { ...c, status: 'active' as const } : c
    );
    
    saveConfigs(updatedConfigs);
    
    toast({
      title: "IA testada",
      description: `Configuração ${config.name} validada com sucesso.`
    });
  };

  const handleToggleActive = (id: string) => {
    const updatedConfigs = aiConfigs.map(c => 
      c.id === id ? { ...c, isActive: !c.isActive } : c
    );
    saveConfigs(updatedConfigs);
  };

  const handleSetPriority = (id: string, priority: number) => {
    const updatedConfigs = aiConfigs.map(c => 
      c.id === id ? { ...c, priority } : c
    );
    saveConfigs(updatedConfigs);
  };

  const handleDeleteConfig = (id: string) => {
    const updatedConfigs = aiConfigs.filter(c => c.id !== id);
    saveConfigs(updatedConfigs);
    
    toast({
      title: "IA removida",
      description: "Configuração de IA deletada com sucesso."
    });
  };

  const handleCreatePrompt = () => {
    if (!newPrompt.name || !newPrompt.content) {
      toast({
        title: "Erro",
        description: "Nome e conteúdo do prompt são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    // Desativar todos os prompts existentes
    const updatedPrompts = basePrompts.map(p => ({ ...p, isActive: false }));

    const prompt: BasePrompt = {
      id: Date.now().toString(),
      name: newPrompt.name,
      content: newPrompt.content,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    savePrompts([...updatedPrompts, prompt]);
    setNewPrompt({ name: '', content: '' });
    setIsCreatingPrompt(false);
    
    toast({
      title: "Prompt criado",
      description: "Novo prompt base configurado e ativado."
    });
  };

  const handleActivatePrompt = (id: string) => {
    const updatedPrompts = basePrompts.map(p => ({
      ...p,
      isActive: p.id === id,
      updatedAt: p.id === id ? new Date().toISOString() : p.updatedAt
    }));
    savePrompts(updatedPrompts);
    
    toast({
      title: "Prompt ativado",
      description: "Prompt base foi ativado com sucesso."
    });
  };

  const handleDeletePrompt = (id: string) => {
    const updatedPrompts = basePrompts.filter(p => p.id !== id);
    savePrompts(updatedPrompts);
    
    toast({
      title: "Prompt removido",
      description: "Prompt base deletado com sucesso."
    });
  };

  const getModelOptions = (provider: string) => {
    switch (provider) {
      case 'openai':
        return OPENAI_MODELS;
      case 'anthropic':
        return ANTHROPIC_MODELS;
      case 'google':
        return GOOGLE_MODELS;
      default:
        return [];
    }
  };

  const getStatusBadge = (status: AIConfig['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Inativo</Badge>;
    }
  };

  const getProviderIcon = (provider: string) => {
    return AI_PROVIDERS.find(p => p.value === provider)?.icon || '🤖';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuração de APIs de IA</h2>
          <p className="text-muted-foreground">
            Gerencie modelos de IA e configure prioridades de uso
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreatingPrompt(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Novo Prompt Base
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Brain className="w-4 h-4 mr-2" />
            Nova IA
          </Button>
        </div>
      </div>

      {/* Prompts Base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Prompts Base do Maturador
            <Badge variant="secondary">
              {basePrompts.filter(p => p.isActive).length} ativo
            </Badge>
          </CardTitle>
          <CardDescription>
            Configure prompts base que guiam o estilo de conversação de todos os chips
          </CardDescription>
        </CardHeader>
        <CardContent>
          {basePrompts.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhum prompt base configurado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure o primeiro prompt base para definir o estilo das conversas
              </p>
              <Button onClick={() => setIsCreatingPrompt(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Prompt
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {basePrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className={`p-4 border rounded-lg ${
                    prompt.isActive ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {prompt.name}
                        {prompt.isActive && <Star className="w-4 h-4 text-yellow-500" />}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Criado em: {new Date(prompt.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!prompt.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActivatePrompt(prompt.id)}
                        >
                          Ativar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePrompt(prompt.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                    {prompt.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário de novo prompt */}
      {isCreatingPrompt && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Prompt Base</CardTitle>
            <CardDescription>
              Defina o estilo e comportamento padrão para todas as conversas do maturador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="promptName">Nome do Prompt</Label>
              <Input
                id="promptName"
                placeholder="Ex: Estilo Profissional, Casual Amigável..."
                value={newPrompt.name}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="promptContent">Conteúdo do Prompt</Label>
              <Textarea
                id="promptContent"
                placeholder="Defina como os chips devem conversar, o tom, estilo, diretrizes..."
                rows={6}
                value={newPrompt.content}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreatingPrompt(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreatePrompt}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Prompt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de nova configuração */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Configuração de IA</CardTitle>
            <CardDescription>
              Configure uma nova API de inteligência artificial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Configuração</Label>
                <Input
                  id="name"
                  placeholder="Ex: ChatGPT Principal"
                  value={newConfig.name}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider">Provedor</Label>
                <Select 
                  value={newConfig.provider} 
                  onValueChange={(value: any) => setNewConfig(prev => ({ ...prev, provider: value, model: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o provedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_PROVIDERS.map(provider => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.icon} {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Select 
                  value={newConfig.model} 
                  onValueChange={(value) => setNewConfig(prev => ({ ...prev, model: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {getModelOptions(newConfig.provider).map(model => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">Chave de API</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Sua chave de API"
                  value={newConfig.apiKey}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={newConfig.maxTokens}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (0-1)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={newConfig.temperature}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição da configuração..."
                value={newConfig.description}
                onChange={(e) => setNewConfig(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateConfig}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configuração
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de configurações */}
      <div className="grid gap-4">
        {aiConfigs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Brain className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhuma IA configurada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure sua primeira API de inteligência artificial
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Configurar Primeira IA
              </Button>
            </CardContent>
          </Card>
        ) : (
          aiConfigs
            .sort((a, b) => a.priority - b.priority)
            .map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getProviderIcon(config.provider)}</span>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {config.name}
                          {config.priority === 1 && <Star className="w-4 h-4 text-yellow-500" />}
                        </CardTitle>
                        <CardDescription>{config.model}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(config.status)}
                      <Badge variant="outline">Prioridade {config.priority}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConfig(config.id)}
                      >
                        Testar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`active-${config.id}`}>Ativo</Label>
                        <Switch
                          id={`active-${config.id}`}
                          checked={config.isActive}
                          onCheckedChange={() => handleToggleActive(config.id)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>Prioridade:</Label>
                        <Select
                          value={config.priority.toString()}
                          onValueChange={(value) => handleSetPriority(config.id, parseInt(value))}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Max Tokens</Label>
                        <p>{config.maxTokens}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Temperature</Label>
                        <p>{config.temperature}</p>
                      </div>
                    </div>

                    {config.description && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-sm font-medium">Descrição:</Label>
                          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                        </div>
                      </>
                    )}

                    <Separator />
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteConfig(config.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
};