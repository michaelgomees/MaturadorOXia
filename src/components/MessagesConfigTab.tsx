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
import { GitBranch, Play, Pause, Trash2, Save, Plus, MessageCircle, Clock, Users, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MessageFlow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  instances: {
    sender: string;
    receiver: string;
  }[];
  triggers: {
    type: 'time' | 'keyword' | 'event';
    value: string;
    interval?: number;
  }[];
  messages: {
    id: string;
    content: string;
    delay: number;
    priority: number;
  }[];
  status: 'active' | 'paused' | 'stopped';
  createdAt: string;
  lastExecuted?: string;
}

const MOCK_INSTANCES = [
  'Alex Marketing',
  'Sofia Suporte', 
  'João Vendas',
  'Ana Atendimento',
  'Carlos Técnico'
];

export const MessagesConfigTab = () => {
  const [messageFlows, setMessageFlows] = useState<MessageFlow[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFlow, setNewFlow] = useState({
    name: '',
    description: '',
    senderInstance: '',
    receiverInstance: '',
    triggerType: 'time' as const,
    triggerValue: '',
    triggerInterval: 60,
    messageContent: '',
    messageDelay: 5
  });
  const { toast } = useToast();

  // Carregar fluxos do localStorage
  useEffect(() => {
    const savedFlows = localStorage.getItem('ox-message-flows');
    if (savedFlows) {
      setMessageFlows(JSON.parse(savedFlows));
    }
  }, []);

  // Salvar fluxos no localStorage
  const saveFlows = (newFlows: MessageFlow[]) => {
    setMessageFlows(newFlows);
    localStorage.setItem('ox-message-flows', JSON.stringify(newFlows));
  };

  const handleCreateFlow = () => {
    if (!newFlow.name || !newFlow.senderInstance || !newFlow.receiverInstance) {
      toast({
        title: "Erro",
        description: "Nome e instâncias são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const flow: MessageFlow = {
      id: Date.now().toString(),
      name: newFlow.name,
      description: newFlow.description,
      isActive: true,
      instances: [{
        sender: newFlow.senderInstance,
        receiver: newFlow.receiverInstance
      }],
      triggers: [{
        type: newFlow.triggerType,
        value: newFlow.triggerValue,
        interval: newFlow.triggerInterval
      }],
      messages: [{
        id: Date.now().toString() + '_msg',
        content: newFlow.messageContent,
        delay: newFlow.messageDelay,
        priority: 1
      }],
      status: 'stopped',
      createdAt: new Date().toISOString()
    };

    saveFlows([...messageFlows, flow]);
    setNewFlow({
      name: '',
      description: '',
      senderInstance: '',
      receiverInstance: '',
      triggerType: 'time',
      triggerValue: '',
      triggerInterval: 60,
      messageContent: '',
      messageDelay: 5
    });
    setIsCreating(false);
    
    toast({
      title: "Fluxo criado",
      description: "Novo fluxo de mensagens configurado com sucesso."
    });
  };

  const handleToggleFlow = (id: string) => {
    const flow = messageFlows.find(f => f.id === id);
    if (!flow) return;

    const newStatus: MessageFlow['status'] = flow.status === 'active' ? 'paused' : 'active';
    const updatedFlows = messageFlows.map(f => 
      f.id === id 
        ? { 
            ...f, 
            status: newStatus,
            lastExecuted: newStatus === 'active' ? new Date().toISOString() : f.lastExecuted
          }
        : f
    );
    
    saveFlows(updatedFlows);
    
    toast({
      title: `Fluxo ${newStatus === 'active' ? 'iniciado' : 'pausado'}`,
      description: `Fluxo ${flow.name} foi ${newStatus === 'active' ? 'ativado' : 'pausado'}.`
    });
  };

  const handleDeleteFlow = (id: string) => {
    const updatedFlows = messageFlows.filter(f => f.id !== id);
    saveFlows(updatedFlows);
    
    toast({
      title: "Fluxo removido",
      description: "Fluxo de mensagens deletado com sucesso."
    });
  };

  const getStatusBadge = (status: MessageFlow['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pausado</Badge>;
      default:
        return <Badge variant="secondary">Parado</Badge>;
    }
  };

  const getTriggerDescription = (trigger: MessageFlow['triggers'][0]) => {
    switch (trigger.type) {
      case 'time':
        return `A cada ${trigger.interval} minutos`;
      case 'keyword':
        return `Palavra-chave: ${trigger.value}`;
      case 'event':
        return `Evento: ${trigger.value}`;
      default:
        return 'Trigger não configurado';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuração de Mensagens do Maturador</h2>
          <p className="text-muted-foreground">
            Configure fluxos de mensagens automáticas entre instâncias
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {}}>
            <Settings className="w-4 h-4 mr-2" />
            Editar Fluxo
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <GitBranch className="w-4 h-4 mr-2" />
            Novo Fluxo
          </Button>
        </div>
      </div>

      {/* Estatísticas dos fluxos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <GitBranch className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total de Fluxos</p>
              <p className="text-2xl font-bold">{messageFlows.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <Play className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Fluxos Ativos</p>
              <p className="text-2xl font-bold">{messageFlows.filter(f => f.status === 'active').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <MessageCircle className="w-8 h-8 text-secondary" />
            <div>
              <p className="text-sm text-muted-foreground">Mensagens Configuradas</p>
              <p className="text-2xl font-bold">{messageFlows.reduce((acc, f) => acc + f.messages.length, 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <Users className="w-8 h-8 text-accent" />
            <div>
              <p className="text-sm text-muted-foreground">Instâncias Conectadas</p>
              <p className="text-2xl font-bold">{MOCK_INSTANCES.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de novo fluxo */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Fluxo de Mensagens</CardTitle>
            <CardDescription>
              Configure um novo fluxo de comunicação entre instâncias
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="flowName">Nome do Fluxo</Label>
                <Input
                  id="flowName"
                  placeholder="Ex: Prospecção Automática"
                  value={newFlow.name}
                  onChange={(e) => setNewFlow(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt de Comportamento</Label>
                <Input
                  id="prompt"
                  placeholder="Descreva como deve ser a lógica/estilo da conversa..."
                  value={newFlow.description}
                  onChange={(e) => setNewFlow(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sender">Instância Remetente</Label>
                <Select 
                  value={newFlow.senderInstance} 
                  onValueChange={(value) => setNewFlow(prev => ({ ...prev, senderInstance: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a instância" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_INSTANCES.map(instance => (
                      <SelectItem key={instance} value={instance}>
                        {instance}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiver">Instância Destinatária</Label>
                <Select 
                  value={newFlow.receiverInstance} 
                  onValueChange={(value) => setNewFlow(prev => ({ ...prev, receiverInstance: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a instância" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_INSTANCES.filter(i => i !== newFlow.senderInstance).map(instance => (
                      <SelectItem key={instance} value={instance}>
                        {instance}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="triggerType">Tipo de Trigger</Label>
                <Select 
                  value={newFlow.triggerType} 
                  onValueChange={(value: any) => setNewFlow(prev => ({ ...prev, triggerType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">⏰ Tempo</SelectItem>
                    <SelectItem value="keyword">🔍 Palavra-chave</SelectItem>
                    <SelectItem value="event">⚡ Evento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newFlow.triggerType === 'time' ? (
                <div className="space-y-2">
                  <Label htmlFor="interval">Intervalo (minutos)</Label>
                  <Input
                    id="interval"
                    type="number"
                    value={newFlow.triggerInterval}
                    onChange={(e) => setNewFlow(prev => ({ ...prev, triggerInterval: parseInt(e.target.value) }))}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="triggerValue">Valor do Trigger</Label>
                  <Input
                    id="triggerValue"
                    placeholder="Ex: palavra, evento..."
                    value={newFlow.triggerValue}
                    onChange={(e) => setNewFlow(prev => ({ ...prev, triggerValue: e.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="delay">Delay Humanizado</Label>
                <Select 
                  value={newFlow.messageDelay.toString()} 
                  onValueChange={(value) => setNewFlow(prev => ({ ...prev, messageDelay: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Rápido (2-5s)</SelectItem>
                    <SelectItem value="8">Normal (5-12s)</SelectItem>
                    <SelectItem value="15">Pensativo (10-20s)</SelectItem>
                    <SelectItem value="25">Cauteloso (15-35s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="messageContent">Conteúdo da Mensagem</Label>
              <Textarea
                id="messageContent"
                placeholder="Digite o conteúdo da mensagem automática..."
                value={newFlow.messageContent}
                onChange={(e) => setNewFlow(prev => ({ ...prev, messageContent: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateFlow}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Fluxo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de fluxos */}
      <div className="grid gap-4">
        {messageFlows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GitBranch className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhum fluxo configurado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure seu primeiro fluxo de mensagens automáticas
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Fluxo
              </Button>
            </CardContent>
          </Card>
        ) : (
          messageFlows.map((flow) => (
            <Card key={flow.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{flow.name}</CardTitle>
                    <CardDescription>{flow.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(flow.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleFlow(flow.id)}
                    >
                      {flow.status === 'active' ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Iniciar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Fluxo de Comunicação</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{flow.instances[0]?.sender}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline">{flow.instances[0]?.receiver}</Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Trigger</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getTriggerDescription(flow.triggers[0])}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Mensagem</Label>
                    <div className="bg-muted/50 rounded-lg p-3 mt-1">
                      <p className="text-sm">{flow.messages[0]?.content}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Delay: {flow.messages[0]?.delay}s</span>
                        <span>Prioridade: {flow.messages[0]?.priority}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      <div>Criado em: {new Date(flow.createdAt).toLocaleString('pt-BR')}</div>
                      {flow.lastExecuted && (
                        <div>Última execução: {new Date(flow.lastExecuted).toLocaleString('pt-BR')}</div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFlow(flow.id)}
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