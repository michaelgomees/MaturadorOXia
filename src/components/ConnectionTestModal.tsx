import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wifi, WifiOff, Shield, ShieldAlert, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useChipMonitoring } from "@/hooks/useChipMonitoring";

interface ConnectionTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chipId: string;
  chipName: string;
}

export const ConnectionTestModal = ({ open, onOpenChange, chipId, chipName }: ConnectionTestModalProps) => {
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const { testConnection, getChipMonitoring } = useChipMonitoring();

  const chipMonitoring = getChipMonitoring(chipId);

  const handleRunTest = async () => {
    setIsRunningTest(true);
    setTestResult(null);
    
    try {
      const result = await testConnection(chipId);
      setTestResult(result);
    } finally {
      setIsRunningTest(false);
    }
  };

  const getStatusIcon = () => {
    if (isRunningTest) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (testResult === true) return <CheckCircle className="w-5 h-5 text-primary" />;
    if (testResult === false) return <XCircle className="w-5 h-5 text-destructive" />;
    
    if (chipMonitoring?.connectionStatus === 'online') return <Wifi className="w-5 h-5 text-primary" />;
    return <WifiOff className="w-5 h-5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (isRunningTest) return "Testando conexão...";
    if (testResult === true) return "Conexão estável";
    if (testResult === false) return "Falha na conexão";
    
    if (chipMonitoring?.connectionStatus === 'online') return "Online";
    return "Status desconhecido";
  };

  const getStatusVariant = () => {
    if (isRunningTest) return "secondary";
    if (testResult === true) return "default";
    if (testResult === false) return "destructive";
    return "outline";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Teste de Conexão
          </DialogTitle>
          <DialogDescription>
            Verificar status de conectividade do chip {chipName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Atual */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              {getStatusIcon()}
            </div>
            
            <div className="space-y-2">
              <Badge variant={getStatusVariant()} className="text-sm">
                {getStatusText()}
              </Badge>
              
              {chipMonitoring?.lastConnectionTest && (
                <p className="text-xs text-muted-foreground">
                  Último teste: {chipMonitoring.lastConnectionTest.toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>

          {/* Progresso do teste */}
          {isRunningTest && (
            <div className="space-y-2">
              <Progress value={66} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                Verificando conectividade...
              </p>
            </div>
          )}

          {/* Detalhes do chip */}
          <div className="space-y-3 p-4 bg-muted/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status da linha:</span>
              <div className="flex items-center gap-2">
                {chipMonitoring?.isBlocked ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">Bloqueada</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm text-primary">Liberada</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total de erros:</span>
              <span className="text-sm font-medium">{chipMonitoring?.errorCount || 0}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Última atividade:</span>
              <span className="text-sm font-medium">
                {chipMonitoring?.lastActivity ? 
                  chipMonitoring.lastActivity.toLocaleString('pt-BR') : 
                  'Nunca'
                }
              </span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Fechar
            </Button>
            <Button 
              onClick={handleRunTest} 
              disabled={isRunningTest}
              className="flex-1"
            >
              {isRunningTest ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testando
                </>
              ) : (
                "Testar Agora"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};