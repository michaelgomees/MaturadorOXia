import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChipConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chipId: string;
  chipName: string;
}

interface ChipConfig {
  id: string;
  name: string;
  personality: string;
  aiModel: string;
  phone: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  isAutoReply: boolean;
  responseDelay: number;
  maxConversationsPerDay: number;
  isBehaviorActive: boolean;
}

const AI_MODELS = [
  { value: 'gpt-4', label: 'ChatGPT 4' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'gemini-pro', label: 'Gemini Pro' }
];

export const ChipConfigModal = ({ open, onOpenChange, chipId, chipName }: ChipConfigModalProps) => {
  const [config, setConfig] = useState<ChipConfig>({
    id: chipId,
    name: chipName,
    personality: "Atencioso e prestativo",
    aiModel: "gpt-4",
    phone: "+5511999999999",
    maxTokens: 2000,
    temperature: 0.7,
    systemPrompt: "Você é um assistente inteligente e prestativo. Responda de forma clara e objetiva.",
    isAutoReply: true,
    responseDelay: 5,
    maxConversationsPerDay: 100,
    isBehaviorActive: false
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      // Carregar configuração salva do localStorage
      const savedConfigs = localStorage.getItem('ox-chip-configs');
      if (savedConfigs) {
        const configs = JSON.parse(savedConfigs);
        const chipConfig = configs.find((c: ChipConfig) => c.id === chipId);
        if (chipConfig) {
          setConfig(chipConfig);
        }
      }
    }
  }, [open, chipId]);

  const handleSave = () => {
    // Salvar no localStorage
    const savedConfigs = localStorage.getItem('ox-chip-configs');
    let configs = savedConfigs ? JSON.parse(savedConfigs) : [];
    
    const existingIndex = configs.findIndex((c: ChipConfig) => c.id === chipId);
    if (existingIndex >= 0) {
      configs[existingIndex] = config;
    } else {
      configs.push(config);
    }
    
    localStorage.setItem('ox-chip-configs', JSON.stringify(configs));
    
    toast({
      title: "Configuração salva",
      description: `Configurações do chip ${chipName} foram atualizadas.`
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurar Chip: {chipName}
          </DialogTitle>
          <DialogDescription>
            Configure parâmetros avançados do chip conversacional
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Básicas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Chip</Label>
                <Input
                  id="name"
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Número do Chip</Label>
                <Input
                  id="phone"
                  value={config.phone}
                  onChange={(e) => setConfig(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="personality">Personalidade</Label>
              <Input
                id="personality"
                value={config.personality}
                onChange={(e) => setConfig(prev => ({ ...prev, personality: e.target.value }))}
              />
            </div>
          </div>

          {/* Configurações de IA */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configurações de IA</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aiModel">Modelo de IA</Label>
                <Select 
                  value={config.aiModel} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, aiModel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={config.maxTokens}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
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
                  value={config.temperature}
                  onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">Prompt do Sistema</Label>
              <Textarea
                id="systemPrompt"
                rows={4}
                value={config.systemPrompt}
                onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
              />
            </div>
          </div>

          {/* Configurações de Comportamento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Comportamento</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="behaviorActive"
                  checked={config.isBehaviorActive}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, isBehaviorActive: checked }))}
                />
                <Label htmlFor="behaviorActive">Ativar Comportamento</Label>
              </div>
            </div>
            
            {config.isBehaviorActive && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="autoReply"
                      checked={config.isAutoReply}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, isAutoReply: checked }))}
                    />
                    <Label htmlFor="autoReply">Resposta Automática</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responseDelay">Delay de Resposta (segundos)</Label>
                    <Input
                      id="responseDelay"
                      type="number"
                      min="1"
                      max="60"
                      value={config.responseDelay}
                      onChange={(e) => setConfig(prev => ({ ...prev, responseDelay: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxConversations">Máximo de Conversas por Dia</Label>
                  <Input
                    id="maxConversations"
                    type="number"
                    value={config.maxConversationsPerDay}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxConversationsPerDay: parseInt(e.target.value) }))}
                  />
                </div>
              </>
            )}
            
            {!config.isBehaviorActive && (
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                O comportamento automático está desativado. Ative para configurar respostas automáticas e limites de conversas.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};