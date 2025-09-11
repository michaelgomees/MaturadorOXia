import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Star, Trash2, Save, Plus } from "lucide-react";
import { useAPIConfigs, APIConfig } from "@/hooks/useAPIConfigs";
import { usePrompts } from "@/hooks/usePrompts";

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
  const { 
    configs: aiConfigs, 
    loading: configsLoading, 
    createConfig, 
    updateConfig, 
    deleteConfig, 
    testConfig 
  } = useAPIConfigs();
  
  const { 
    prompts: basePrompts, 
    loading: promptsLoading, 
    createPrompt: createBasePrompt,
    getGlobalPrompt 
  } = usePrompts();
  
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [newConfig, setNewConfig] = useState({
    nome: '',
    provider: 'openai' as const,
    api_key: '',
    model: '',
    max_tokens: 2000,
    temperature: 0.7,
    description: ''
  });
  const [newPrompt, setNewPrompt] = useState({
    nome: '',
    conteudo: ''
  });

  const handleCreateConfig = async () => {
    if (!newConfig.nome || !newConfig.api_key || !newConfig.model) {
      return;
    }

    try {
      await createConfig({
        nome: newConfig.nome,
        provider: newConfig.provider,
        api_key: newConfig.api_key,
        model: newConfig.model,
        is_active: true,
        priority: aiConfigs.length + 1,
        max_tokens: newConfig.max_tokens,
        temperature: newConfig.temperature,
        description: newConfig.description,
        status: 'inactive'
      });

      setNewConfig({
        nome: '',
        provider: 'openai',
        api_key: '',
        model: '',
        max_tokens: 2000,
        temperature: 0.7,
        description: ''
      });
      setIsCreating(false);
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const handleCreatePrompt = async () => {
    if (!newPrompt.nome || !newPrompt.conteudo) {
      return;
    }

    try {
      await createBasePrompt({
        nome: newPrompt.nome,
        conteudo: newPrompt.conteudo,
        categoria: 'conversacao',
        is_active: false,
        is_global: true
      });

      setNewPrompt({ nome: '', conteudo: '' });
      setIsCreatingPrompt(false);
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const handleTestConfig = async (id: string) => {
    try {
      await testConfig(id);
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const handleDeleteConfig = async (id: string) => {
    try {
      await deleteConfig(id);
    } catch (error) {
      // Error já tratado no hook
    }
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

  const getStatusBadge = (status: APIConfig['status']) => {
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

  const globalPrompt = getGlobalPrompt();
  const loading = configsLoading || promptsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

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

      {/* Prompt Base Ativo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Prompt Base Ativo
            <Badge variant="secondary">
              {globalPrompt ? '1 ativo' : '0 ativo'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Prompt base que guia o estilo de conversação de todos os chips
          </CardDescription>
        </CardHeader>
        <CardContent>
          {globalPrompt ? (
            <div className="p-4 border rounded-lg border-primary bg-primary/5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    {globalPrompt.nome}
                    <Star className="w-4 h-4 text-yellow-500" />
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Criado em: {new Date(globalPrompt.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                {globalPrompt.conteudo}
              </p>
            </div>
          ) : (
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
                value={newPrompt.nome}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="promptContent">Conteúdo do Prompt</Label>
              <Textarea
                id="promptContent"
                placeholder="Defina como os chips devem conversar, o tom, estilo, diretrizes..."
                rows={6}
                value={newPrompt.conteudo}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, conteudo: e.target.value }))}
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
                  value={newConfig.nome}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, nome: e.target.value }))}
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
                  value={newConfig.api_key}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, api_key: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={newConfig.max_tokens}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
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

      {/* Lista de Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de IA ({aiConfigs.length})</CardTitle>
          <CardDescription>
            Gerencie todas as configurações de APIs de IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aiConfigs.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhuma configuração</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure a primeira API de IA para começar
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Configuração
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {aiConfigs.map((config) => (
                <Card key={config.id} className="border-l-4 border-l-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium flex items-center gap-2">
                            {getProviderIcon(config.provider)} {config.nome}
                          </h4>
                          {getStatusBadge(config.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {config.model} - {config.max_tokens} tokens
                        </p>
                        {config.description && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {config.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Criado: {new Date(config.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestConfig(config.id)}
                        >
                          Testar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteConfig(config.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Deletar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};