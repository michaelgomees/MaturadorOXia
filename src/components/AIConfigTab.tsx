import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Star, Save, Plus } from "lucide-react";
import { usePrompts } from "@/hooks/usePrompts";

export const AIConfigTab = () => {
  const { 
    loading: promptsLoading, 
    createPrompt: createBasePrompt,
    getGlobalPrompt 
  } = usePrompts();
  
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    nome: '',
    conteudo: ''
  });

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

  const globalPrompt = getGlobalPrompt();
  const loading = promptsLoading;

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
          <h2 className="text-2xl font-bold">Configuração de Prompts</h2>
          <p className="text-muted-foreground">
            Configure o prompt base que define o estilo das conversas
          </p>
        </div>
        <Button onClick={() => setIsCreatingPrompt(true)} variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Novo Prompt Base
        </Button>
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
    </div>
  );
};