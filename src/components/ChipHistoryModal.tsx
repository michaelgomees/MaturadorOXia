import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Activity, MessageCircle, Wifi, AlertTriangle, Play } from "lucide-react";
import { useChipMonitoring, ChipHistory } from "@/hooks/useChipMonitoring";

interface ChipHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chipId: string;
  chipName: string;
}

const eventIcons = {
  started: Play,
  paused: AlertTriangle,
  resumed: Play,
  message_sent: MessageCircle,
  connection_test: Wifi,
  error: AlertTriangle
};

const eventLabels = {
  started: "Iniciado",
  paused: "Pausado", 
  resumed: "Retomado",
  message_sent: "Mensagem",
  connection_test: "Teste de Conexão",
  error: "Erro"
};

const eventColors = {
  started: "bg-primary/10 text-primary",
  paused: "bg-accent/10 text-accent",
  resumed: "bg-primary/10 text-primary", 
  message_sent: "bg-secondary/10 text-secondary",
  connection_test: "bg-muted/10 text-muted-foreground",
  error: "bg-destructive/10 text-destructive"
};

export const ChipHistoryModal = ({ open, onOpenChange, chipId, chipName }: ChipHistoryModalProps) => {
  const { getChipHistory, getChipMonitoring } = useChipMonitoring();
  
  const chipHistory = getChipHistory(chipId);
  const chipMonitoring = getChipMonitoring(chipId);

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hora${diffInHours > 1 ? 's' : ''} atrás`;
    } else {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      if (diffInMinutes > 0) {
        return `${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''} atrás`;
      } else {
        return 'Agora mesmo';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Histórico de Atividades: {chipName}
          </DialogTitle>
          <DialogDescription>
            Registro completo de atividades e eventos do chip
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do chip */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-semibold text-primary">{chipMonitoring?.totalMessages || 0}</p>
            <p className="text-xs text-muted-foreground">Total de Mensagens</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-accent">{chipMonitoring?.errorCount || 0}</p>
            <p className="text-xs text-muted-foreground">Erros Registrados</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-secondary">
              {chipMonitoring?.startDate ? 
                Math.floor((new Date().getTime() - chipMonitoring.startDate.getTime()) / (1000 * 60 * 60 * 24)) 
                : 0}
            </p>
            <p className="text-xs text-muted-foreground">Dias Ativo</p>
          </div>
        </div>

        {/* Lista de eventos */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {chipHistory.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma atividade registrada</p>
              </div>
            ) : (
              chipHistory.map((event) => {
                const IconComponent = eventIcons[event.event];
                
                return (
                  <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/20 transition-colors">
                    <div className="flex-shrink-0 w-8 h-8 bg-muted/20 rounded-full flex items-center justify-center">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className={eventColors[event.event]}>
                          {eventLabels[event.event]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(event.timestamp)}
                        </span>
                      </div>
                      
                      {event.details && (
                        <p className="text-sm text-muted-foreground">{event.details}</p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {event.timestamp.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};