import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Brain, Star, Trash2, Save, Plus, Edit } from "lucide-react";
import { usePrompts, AIPrompt } from "@/hooks/usePrompts";

const PROMPT_CATEGORIES = [
  { value: 'conversacao', label: 'Conversação Geral', icon: '💬' },
  { value: 'vendas', label: 'Vendas', icon: '💰' },
  { value: 'suporte', label: 'Suporte', icon: '🎧' },
  { value: 'personalizado', label: 'Personalizado', icon: '⚙️' }
];

export const PromptsTab = () => {
  const {
    prompts,
    loading,
    createPrompt,
    updatePrompt,
    deletePrompt,
    setGlobalPrompt,
    getGlobalPrompt
  } = usePrompts();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null);
  const [newPrompt, setNewPrompt] = useState<{
    nome: string;
    conteudo: string;
    categoria: AIPrompt['categoria'];
    is_global: boolean;
  }>({
    nome: '',
    conteudo: '',
    categoria: 'conversacao',
    is_global: false
  });

  const handleCreatePrompt = async () => {
    if (!newPrompt.nome || !newPrompt.conteudo) {
      return;
    }

    try {
      await createPrompt({
        nome: newPrompt.nome,
        conteudo: newPrompt.conteudo,
        categoria: newPrompt.categoria,
        is_active: true,
        is_global: newPrompt.is_global
      });

      setNewPrompt({ nome: '', conteudo: '', categoria: 'conversacao', is_global: false });
      setIsCreating(false);
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const handleUpdatePrompt = async () => {
    if (!editingPrompt) return;

    try {
      await updatePrompt(editingPrompt.id, {
        nome: editingPrompt.nome,
        conteudo: editingPrompt.conteudo,
        categoria: editingPrompt.categoria,
        is_global: editingPrompt.is_global
      });

      setEditingPrompt(null);
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const handleSetGlobalPrompt = async (id: string) => {
    try {
      await setGlobalPrompt(id);
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const handleDeletePrompt = async (id: string) => {
    try {
      await deletePrompt(id);
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const getCategoryIcon = (categoria: string) => {
    return PROMPT_CATEGORIES.find(c => c.value === categoria)?.icon || '💬';
  };

  const getCategoryLabel = (categoria: string) => {
    return PROMPT_CATEGORIES.find(c => c.value === categoria)?.label || 'Conversação';
  };

  const globalPrompt = getGlobalPrompt();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prompts de IA</h2>
          <p className="text-muted-foreground">
            Configure prompts para guiar o comportamento dos chips de IA
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Prompt
        </Button>
      </div>

      {/* Global Prompt Status */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Prompt Global Ativo
          </CardTitle>
          <CardDescription>
            Este prompt é usado como padrão em todas as conversas do maturador
          </CardDescription>
        </CardHeader>
        <CardContent>
          {globalPrompt ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{globalPrompt.nome}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getCategoryIcon(globalPrompt.categoria)} {getCategoryLabel(globalPrompt.categoria)}
                  </p>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                  Global
                </Badge>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm">{globalPrompt.conteudo}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Nenhum prompt global definido</p>
              <p className="text-xs text-muted-foreground mt-1">
                Configure um prompt para usar como padrão em todas as conversas
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Prompt Form */}
      {(isCreating || editingPrompt) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPrompt ? 'Editar Prompt' : 'Novo Prompt de IA'}</CardTitle>
            <CardDescription>
              Configure o comportamento e estilo de conversação da IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promptName">Nome do Prompt</Label>
                <Input
                  id="promptName"
                  placeholder="Ex: Vendedor Persuasivo, Suporte Atencioso..."
                  value={editingPrompt ? editingPrompt.nome : newPrompt.nome}
                  onChange={(e) => {
                    if (editingPrompt) {
                      setEditingPrompt({ ...editingPrompt, nome: e.target.value });
                    } else {
                      setNewPrompt(prev => ({ ...prev, nome: e.target.value }));
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingPrompt ? editingPrompt.categoria : newPrompt.categoria}
                  onChange={(e) => {
                    const value = e.target.value as AIPrompt['categoria'];
                    if (editingPrompt) {
                      setEditingPrompt({ ...editingPrompt, categoria: value });
                    } else {
                      setNewPrompt(prev => ({ ...prev, categoria: value }));
                    }
                  }}
                >
                  {PROMPT_CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="promptContent">Conteúdo do Prompt</Label>
              <Textarea
                id="promptContent"
                placeholder="Descreva como a IA deve se comportar, o tom de voz, diretrizes específicas..."
                rows={8}
                value={editingPrompt ? editingPrompt.conteudo : newPrompt.conteudo}
                onChange={(e) => {
                  if (editingPrompt) {
                    setEditingPrompt({ ...editingPrompt, conteudo: e.target.value });
                  } else {
                    setNewPrompt(prev => ({ ...prev, conteudo: e.target.value }));
                  }
                }}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isGlobal"
                checked={editingPrompt ? editingPrompt.is_global : newPrompt.is_global}
                onChange={(e) => {
                  if (editingPrompt) {
                    setEditingPrompt({ ...editingPrompt, is_global: e.target.checked });
                  } else {
                    setNewPrompt(prev => ({ ...prev, is_global: e.target.checked }));
                  }
                }}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isGlobal">Definir como prompt global</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreating(false);
                  setEditingPrompt(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={editingPrompt ? handleUpdatePrompt : handleCreatePrompt}>
                <Save className="w-4 h-4 mr-2" />
                {editingPrompt ? 'Atualizar' : 'Salvar'} Prompt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompts List */}
      <Card>
        <CardHeader>
          <CardTitle>Prompts Configurados ({prompts.length})</CardTitle>
          <CardDescription>
            Gerencie todos os prompts disponíveis para os chips de IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          {prompts.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhum prompt configurado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure o primeiro prompt para definir o comportamento da IA
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Prompt
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {prompts.map((prompt) => (
                <Card key={prompt.id} className={`border-l-4 ${prompt.is_global ? 'border-l-yellow-500' : 'border-l-primary/30'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{prompt.nome}</h4>
                          {prompt.is_global && <Star className="w-4 h-4 text-yellow-500" />}
                          <Badge variant={prompt.is_active ? 'default' : 'secondary'} className="text-xs">
                            {prompt.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {getCategoryIcon(prompt.categoria)} {getCategoryLabel(prompt.categoria)}
                        </p>
                        <div className="bg-muted/50 rounded p-3 mb-2">
                          <p className="text-sm">{prompt.conteudo}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Criado: {new Date(prompt.created_at).toLocaleString('pt-BR')} | 
                          Atualizado: {new Date(prompt.updated_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        {!prompt.is_global && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetGlobalPrompt(prompt.id)}
                          >
                            <Star className="w-4 h-4 mr-1" />
                            Definir Global
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingPrompt(prompt)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePrompt(prompt.id)}
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