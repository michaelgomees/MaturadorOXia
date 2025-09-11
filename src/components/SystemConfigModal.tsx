import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, Shield, Bell, Palette, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SystemConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SystemConfig {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoBackup: boolean;
  backupInterval: number;
  maxChipsLimit: number;
  debugMode: boolean;
  defaultTimeout: number;
  systemLanguage: 'pt' | 'en' | 'es';
  securityLevel: 'basic' | 'enhanced' | 'strict';
}

export const SystemConfigModal = ({ open, onOpenChange }: SystemConfigModalProps) => {
  const [config, setConfig] = useState<SystemConfig>({
    theme: 'auto',
    notifications: true,
    autoBackup: true,
    backupInterval: 24,
    maxChipsLimit: 10,
    debugMode: false,
    defaultTimeout: 30,
    systemLanguage: 'pt',
    securityLevel: 'enhanced'
  });

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      // Carregar configurações do localStorage
      const savedConfig = localStorage.getItem('ox-system-config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem('ox-system-config', JSON.stringify(config));
    toast({
      title: "Configurações salvas",
      description: "Configurações do sistema foram atualizadas com sucesso."
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaultConfig: SystemConfig = {
      theme: 'auto',
      notifications: true,
      autoBackup: true,
      backupInterval: 24,
      maxChipsLimit: 10,
      debugMode: false,
      defaultTimeout: 30,
      systemLanguage: 'pt',
      securityLevel: 'enhanced'
    };
    setConfig(defaultConfig);
    toast({
      title: "Configurações resetadas",
      description: "Todas as configurações foram restauradas para os valores padrão."
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações do Sistema
          </DialogTitle>
          <DialogDescription>
            Configure parâmetros globais e preferências do sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Aparência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Aparência & Interface
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select value={config.theme} onValueChange={(value: any) => setConfig(prev => ({ ...prev, theme: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="auto">Automático</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select value={config.systemLanguage} onValueChange={(value: any) => setConfig(prev => ({ ...prev, systemLanguage: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="notifications"
                  checked={config.notifications}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, notifications: checked }))}
                />
                <Label htmlFor="notifications">Notificações do Sistema</Label>
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Segurança & Privacidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="security">Nível de Segurança</Label>
                <Select value={config.securityLevel} onValueChange={(value: any) => setConfig(prev => ({ ...prev, securityLevel: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="enhanced">Aprimorado (Recomendado)</SelectItem>
                    <SelectItem value="strict">Rigoroso</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {config.securityLevel === 'basic' && 'Segurança básica com validações mínimas'}
                  {config.securityLevel === 'enhanced' && 'Segurança aprimorada com validações adicionais e logs'}
                  {config.securityLevel === 'strict' && 'Máximo nível de segurança com validações rigorosas'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout de Sessão (minutos)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min="5"
                  max="120"
                  value={config.defaultTimeout}
                  onChange={(e) => setConfig(prev => ({ ...prev, defaultTimeout: parseInt(e.target.value) }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="debug"
                  checked={config.debugMode}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, debugMode: checked }))}
                />
                <Label htmlFor="debug">Modo Debug</Label>
              </div>
            </CardContent>
          </Card>

          {/* Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Sistema & Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxChips">Limite Máximo de Chips</Label>
                  <Input
                    id="maxChips"
                    type="number"
                    min="1"
                    max="50"
                    value={config.maxChipsLimit}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxChipsLimit: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backupInterval">Intervalo de Backup (horas)</Label>
                  <Input
                    id="backupInterval"
                    type="number"
                    min="1"
                    max="168"
                    value={config.backupInterval}
                    onChange={(e) => setConfig(prev => ({ ...prev, backupInterval: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="autoBackup"
                  checked={config.autoBackup}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoBackup: checked }))}
                />
                <Label htmlFor="autoBackup">Backup Automático</Label>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Ações */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              Restaurar Padrões
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};