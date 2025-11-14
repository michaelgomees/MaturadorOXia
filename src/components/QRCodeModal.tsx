import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const generateQRCode = async () => {
    setQrStatus("loading");
    setCountdown(60);
    
    try {
      // Limpar polling anterior se existir
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      const instanceName = chipName.toLowerCase().replace(/\s+/g, '_');
      
      console.log('🔄 Buscando QR Code da instância:', instanceName);
      
      // Função para buscar QR Code
      const fetchQR = async (): Promise<any> => {
        const response = await fetch(
          `https://rltkxwswlvuzwmmbqwkr.supabase.co/functions/v1/evolution-api?instanceName=${instanceName}&action=status`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsdGt4d3N3bHZ1endtbWJxd2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzg1MTUsImV4cCI6MjA3MjYxNDUxNX0.CFvBnfnzS7GD8ksbDprZ3sbFE1XHRhtrJJpBUaGCQlM'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      };
      
      // Primeira tentativa
      let data = await fetchQR();
      
      if (!data.success) {
        throw new Error(data.error || 'Falha ao buscar QR Code');
      }

      console.log('📥 Dados recebidos:', data);

      // Se já está conectado
      if (data.instance?.connectionStatus === 'open') {
        setQrStatus("connected");
        setTimeout(() => onOpenChange(false), 1000);
        return;
      }

      // Se tem QR code disponível
      if (data.qrCode) {
        setQrCodeUrl(data.qrCode);
        setQrStatus("waiting");
        console.log('✅ QR Code obtido');
        
        // Iniciar polling para verificar conexão
        const interval = setInterval(async () => {
          await checkConnectionStatus(instanceName);
        }, 3000);
        
        setPollingInterval(interval);
        return;
      }

      // QR code não disponível ainda - fazer polling até aparecer
      console.log('⏳ QR code não disponível, iniciando polling...');
      let attempts = 0;
      const maxAttempts = 10;
      
      const pollInterval = setInterval(async () => {
        attempts++;
        console.log(`🔄 Tentativa ${attempts}/${maxAttempts} de buscar QR code...`);
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setQrStatus("error");
          toast({
            title: "Timeout",
            description: "QR Code não foi gerado a tempo. Tente novamente.",
            variant: "destructive",
          });
          return;
        }
        
        try {
          const pollData = await fetchQR();
          
          if (pollData.qrCode) {
            clearInterval(pollInterval);
            setQrCodeUrl(pollData.qrCode);
            setQrStatus("waiting");
            console.log(`✅ QR Code obtido na tentativa ${attempts}`);
            
            // Iniciar polling de conexão
            const connInterval = setInterval(async () => {
              await checkConnectionStatus(instanceName);
            }, 3000);
            
            setPollingInterval(connInterval);
          }
        } catch (error) {
          console.error('Erro no polling:', error);
        }
      }, 2000); // Tentar a cada 2 segundos
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar QR Code:', error);
      setQrStatus("error");
      toast({
        title: "Erro ao gerar QR Code",
        description: error.message || "Não foi possível conectar com a Evolution API.",
        variant: "destructive",
      });
    }
  };

  const checkConnectionStatus = async (instanceName: string) => {
    try {
      const response = await fetch(
        `https://rltkxwswlvuzwmmbqwkr.supabase.co/functions/v1/evolution-api?instanceName=${instanceName}&action=status`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsdGt4d3N3bHZ1endtbWJxd2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzg1MTUsImV4cCI6MjA3MjYxNDUxNX0.CFvBnfnzS7GD8ksbDprZ3sbFE1XHRhtrJJpBUaGCQlM'
          }
        }
      );

      const data = await response.json();

      if (data.success && data.instance?.connectionStatus === 'open' && !data.instance.disconnectionReasonCode) {
        // Parar polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        setQrStatus("connected");
        
        // Fechar modal automaticamente após 1.5 segundos
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  useEffect(() => {
    if (open) {
      generateQRCode();
    } else {
      // Limpar polling ao fechar modal
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
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
              ) : qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <QrCode className="w-12 h-12 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Carregando QR Code...</span>
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