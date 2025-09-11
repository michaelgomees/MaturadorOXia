import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chipName: string;
  chipPhone: string;
}

type QRStatus = "loading" | "waiting" | "connected" | "error";

export const QRCodeModal = ({ open, onOpenChange, chipName, chipPhone }: QRCodeModalProps) => {
  const [qrStatus, setQrStatus] = useState<QRStatus>("loading");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [countdown, setCountdown] = useState(60);
  const { toast } = useToast();

  const generateQRCode = async () => {
    setQrStatus("loading");
    setCountdown(60);
    
    try {
      // Simulação de chamada para Evolution API - substituir pela integração real
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // QR Code simulado - na implementação real virá da Evolution API
      const mockQRCode = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      
      setQrCodeUrl(mockQRCode);
      setQrStatus("waiting");
      
      // Simular mudança de status após alguns segundos
      setTimeout(() => {
        const isConnected = Math.random() > 0.3; // 70% chance de sucesso
        if (isConnected) {
          setQrStatus("connected");
          toast({
            title: "WhatsApp conectado!",
            description: `${chipName} foi conectado com sucesso ao WhatsApp.`,
          });
        } else {
          setQrStatus("error");
          toast({
            title: "Falha na conexão",
            description: "QR Code expirou. Clique em 'Gerar Novo QR Code' para tentar novamente.",
            variant: "destructive",
          });
        }
      }, 8000);
      
    } catch (error) {
      setQrStatus("error");
      toast({
        title: "Erro ao gerar QR Code",
        description: "Não foi possível conectar com a Evolution API. Verifique suas configurações.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open) {
      generateQRCode();
    }
  }, [open]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (qrStatus === "waiting" && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setQrStatus("error");
            toast({
              title: "QR Code expirou",
              description: "Clique em 'Gerar Novo QR Code' para tentar novamente.",
              variant: "destructive",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [qrStatus, countdown]);

  const getStatusInfo = () => {
    switch (qrStatus) {
      case "loading":
        return {
          badge: <Badge variant="secondary" className="bg-muted text-muted-foreground">Gerando QR Code...</Badge>,
          icon: <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />,
          title: "Preparando conexão",
          description: "Aguarde enquanto geramos seu QR Code..."
        };
      case "waiting":
        return {
          badge: <Badge variant="secondary" className="bg-secondary/20 text-secondary">Aguardando leitura ({countdown}s)</Badge>,
          icon: <QrCode className="w-6 h-6 text-secondary" />,
          title: "Escaneie o QR Code",
          description: "Abra o WhatsApp e escaneie o código para conectar"
        };
      case "connected":
        return {
          badge: <Badge className="bg-primary text-primary-foreground">Conectado com sucesso</Badge>,
          icon: <CheckCircle className="w-6 h-6 text-primary" />,
          title: "WhatsApp conectado!",
          description: "O chip está pronto para enviar e receber mensagens"
        };
      case "error":
        return {
          badge: <Badge variant="destructive">Erro na conexão</Badge>,
          icon: <AlertCircle className="w-6 h-6 text-destructive" />,
          title: "Falha na conexão",
          description: "QR Code expirou ou houve um erro. Tente gerar um novo."
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Conectar WhatsApp - {chipName}
          </DialogTitle>
          <DialogDescription>
            Telefone: {chipPhone}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            {statusInfo.badge}
          </div>
          
          {/* QR Code Area */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-64 h-64 bg-card border-2 border-border rounded-lg flex items-center justify-center">
              {qrStatus === "loading" ? (
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Gerando...</span>
                </div>
              ) : qrStatus === "connected" ? (
                <div className="flex flex-col items-center space-y-2">
                  <CheckCircle className="w-12 h-12 text-primary" />
                  <span className="text-sm font-medium text-primary">Conectado!</span>
                </div>
              ) : qrStatus === "error" ? (
                <div className="flex flex-col items-center space-y-2">
                  <AlertCircle className="w-12 h-12 text-destructive" />
                  <span className="text-sm text-destructive">QR Expirado</span>
                </div>
              ) : (
                <div className="w-full h-full bg-white p-4 rounded">
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <QrCode className="w-32 h-32 text-white" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                {statusInfo.icon}
                <h3 className="font-semibold">{statusInfo.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            {qrStatus === "error" && (
              <Button onClick={generateQRCode} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Gerar Novo QR Code
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className={qrStatus === "error" ? "flex-1" : "w-full"}
            >
              {qrStatus === "connected" ? "Concluir" : "Fechar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};