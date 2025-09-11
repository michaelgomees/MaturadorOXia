import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Clock, MessageSquare, Smile, RefreshCw } from "lucide-react";
import { usePrompts } from "@/hooks/usePrompts";
import { useChipMaturation } from "@/hooks/useChipMaturation";
import { useToast } from "@/hooks/use-toast";

interface MaturationConfig {
  maxLines: number;
  maxTokens: number;
  responseDelay: number;
  useEmojis: boolean;
  customRules: string;
}

export const MaturationSettings = () => {
  const { prompts, getGlobalPrompt } = usePrompts();
  const { resetActiveChipsMemory } = useChipMaturation();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<MaturationConfig>({
    maxLines: 3,
    maxTokens: 100,
    responseDelay: 45,
    useEmojis: true,
    customRules: ""
  });

  const globalPrompt = getGlobalPrompt();

  const handleResetMemories = async () => {
    try {
      await resetActiveChipsMemory(true);
      toast({
        title: "🧠 Memórias Resetadas",
        description: "Todas as conversas dos chips foram limpar para usar o prompt atual.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao resetar memórias dos chips.",
        variant: "destructive"
      });
    }
  };

  const generateSystemPrompt = () => {
    const basePrompt = globalPrompt?.conteudo || "Participe de uma conversa natural";
    
    const rules = `
CONFIGURAÇÕES DE HUMANIZAÇÃO:
- Máximo ${config.maxLines} linhas por mensagem
- Máximo ${config.maxTokens} tokens por resposta
- Delay de resposta: ${config.responseDelay}s (±15s)
- Emojis: ${config.useEmojis ? 'Permitidos (1-2 por mensagem)' : 'Não usar'}
- Linguagem: Casual, WhatsApp-style

REGRAS EXTRAS:
${config.customRules || 'Nenhuma regra extra definida'}

PROMPT BASE:
${basePrompt}`;

    return rules;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações de Humanização
          </CardTitle>
          <CardDescription>
            Controle fino para tornar as conversas mais naturais e humanas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview do Prompt Ativo */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">📝 Prompt Global Ativo</Label>
            {globalPrompt ? (
              <div className="p-3 bg-muted rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{globalPrompt.nome}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Atualizado: {new Date(globalPrompt.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {globalPrompt.conteudo.substring(0, 200)}...
                </p>
              </div>
            ) : (
              <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <p className="text-sm text-yellow-600">
                  ⚠️ Nenhum prompt global ativo. Configure um prompt na aba Prompts.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Configurações de Resposta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Máximo de Linhas
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={config.maxLines}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxLines: parseInt(e.target.value) || 3 }))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Mensagens serão cortadas se ultrapassar este limite
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Máximo de Tokens
                </Label>
                <Input
                  type="number"
                  min="50"
                  max="200"
                  value={config.maxTokens}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 100 }))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Controla o tamanho da resposta da IA
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Delay de Resposta (segundos)
                </Label>
                <Input
                  type="number"
                  min="10"
                  max="300"
                  value={config.responseDelay}
                  onChange={(e) => setConfig(prev => ({ ...prev, responseDelay: parseInt(e.target.value) || 45 }))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Tempo médio entre mensagens (±15s de variação)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.useEmojis}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, useEmojis: checked }))}
                />
                <Label className="flex items-center gap-2">
                  <Smile className="w-4 h-4" />
                  Permitir Emojis nas Respostas
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Regras Customizadas */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Regras Customizadas (Opcional)</Label>
            <Textarea
              placeholder="Ex: Use gírias brasileiras, evite palavrões, fale sobre futebol quando apropriado..."
              value={config.customRules}
              onChange={(e) => setConfig(prev => ({ ...prev, customRules: e.target.value }))}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Adicione regras específicas que serão incluídas no prompt de sistema
            </p>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex gap-3">
            <Button onClick={handleResetMemories} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Resetar Memórias dos Chips
            </Button>
            <Button variant="outline" disabled>
              Salvar Configurações
            </Button>
          </div>

          {/* Preview do Prompt Final */}
          <details className="space-y-2">
            <summary className="cursor-pointer text-sm font-medium">
              🔍 Preview do Prompt Final de Sistema
            </summary>
            <div className="p-3 bg-muted rounded-lg border text-xs font-mono whitespace-pre-wrap">
              {generateSystemPrompt()}
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
};