import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Download, RefreshCw } from "lucide-react";
import { useConnections } from "@/contexts/ConnectionsContext";
import { useToast } from "@/hooks/use-toast";

interface QRCodeViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}

export const QRCodeViewModal = ({ open, onOpenChange, connectionId }: QRCodeViewModalProps) => {
  const { getConnection, syncWithEvolutionAPI } = useConnections();
  const { toast } = useToast();
  const connection = getConnection(connectionId);

  const handleRefreshQR = async () => {
    try {
      await syncWithEvolutionAPI(connectionId);
      toast({
        title: "QR Code atualizado",
        description: "Novo QR Code gerado com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar QR",
        description: "Falha na sincronização com Evolution API.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadQR = () => {
    if (connection?.qrCode) {
      const link = document.createElement('a');
      link.href = connection.qrCode;
      link.download = `qr-code-${connection.name}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!connection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR Code - {connection.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-center p-4 bg-white rounded-lg">
            {connection.qrCode ? (
              <img 
                src={connection.qrCode} 
                alt={`QR Code para ${connection.name}`}
                className="w-64 h-64 border rounded"
              />
            ) : (
              <div className="w-64 h-64 border rounded flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <QrCode className="w-16 h-16 mx-auto mb-2" />
                  <p>QR Code não disponível</p>
                  <p className="text-sm">Sincronize com Evolution API</p>
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p><strong>Conexão:</strong> {connection.name}</p>
            <p><strong>Telefone:</strong> {connection.phone}</p>
            <p><strong>Status:</strong> {connection.status === 'active' ? 'Ativo' : 'Inativo'}</p>
          </div>

          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={handleRefreshQR}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar QR
            </Button>
            {connection.qrCode && (
              <Button variant="outline" onClick={handleDownloadQR}>
                <Download className="w-4 h-4 mr-2" />
                Baixar QR
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>Escaneie este QR Code no WhatsApp Web para conectar</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};