import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Save, MessageCircle } from "lucide-react";
import { useConnections } from "@/contexts/ConnectionsContext";
import { useToast } from "@/hooks/use-toast";

export const PromptsTab = () => {
  const { connections, updateConnection } = useConnections();
  const { toast } = useToast();
  const [editingChipId, setEditingChipId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string>('');

  const handleEditChip = (chipId: string, currentPrompt: string) => {
    setEditingChipId(chipId);
    setEditingPrompt(currentPrompt || 'Você é um assistente amigável e prestativo. Responda de forma natural, breve e humanizada. Use emojis ocasionalmente para dar mais naturalidade às conversas.');
  };

  const handleSavePrompt = async () => {
    if (!editingChipId) return;

    try {
      await updateConnection(editingChipId, { prompt: editingPrompt });
      
      toast({
        title: "Prompt Atualizado",
        description: "O prompt do chip foi configurado com sucesso",
      });
      
      setEditingChipId(null);
      setEditingPrompt('');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar prompt do chip",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingChipId(null);
    setEditingPrompt('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prompts dos Chips</h2>
          <p className="text-muted-foreground">
            Configure o comportamento individual de cada chip através do seu prompt personalizado
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Bot className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Como funciona?</h3>
              <p className="text-sm text-muted-foreground">
                Cada chip usa seu próprio prompt para definir sua personalidade e comportamento. 
                No maturador, quando dois chips conversam, cada um responde usando seu próprio prompt configurado aqui.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chips List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Conexões Disponíveis ({connections.length})
          </CardTitle>
          <CardDescription>
            Clique em um chip para configurar seu prompt personalizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhuma conexão criada</h3>
              <p className="text-sm text-muted-foreground">
                Crie conexões na aba APIs para começar a configurar prompts
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <Card 
                  key={connection.id} 
                  className={`border-l-4 transition-all ${
                    editingChipId === connection.id 
                      ? 'border-l-primary shadow-lg' 
                      : 'border-l-muted'
                  }`}
                >
                  <CardContent className="p-4">
                    {editingChipId === connection.id ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-lg">{connection.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {connection.phone || 'Sem telefone'}
                            </p>
                          </div>
                          <Badge variant={connection.status === 'active' ? 'default' : 'secondary'}>
                            {connection.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Prompt do Chip</Label>
                          <Textarea
                            value={editingPrompt}
                            onChange={(e) => setEditingPrompt(e.target.value)}
                            placeholder="Descreva como este chip deve se comportar..."
                            rows={8}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            💡 Dica: Seja específico sobre a personalidade, tom de voz e estilo de resposta
                          </p>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            onClick={handleCancelEdit}
                          >
                            Cancelar
                          </Button>
                          <Button onClick={handleSavePrompt}>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Prompt
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{connection.name}</h4>
                              <Badge variant={connection.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {connection.status === 'active' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              📱 {connection.phone || 'Sem telefone'} • 
                              🤖 {connection.aiModel || 'ChatGPT'}
                            </p>
                            {connection.prompt ? (
                              <div className="bg-muted/50 rounded p-3">
                                <p className="text-sm line-clamp-3">{connection.prompt}</p>
                              </div>
                            ) : (
                              <div className="bg-yellow-500/10 rounded p-3 border border-yellow-500/20">
                                <p className="text-sm text-yellow-600">
                                  ⚠️ Prompt padrão sendo usado. Configure um prompt personalizado.
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditChip(connection.id, connection.prompt || '')}
                            className="ml-4"
                          >
                            <Bot className="w-4 h-4 mr-1" />
                            Configurar
                          </Button>
                        </div>
                      </div>
                    )}
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