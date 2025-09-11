import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { WhatsAppConnection } from "@/contexts/ConnectionsContext";

interface AutoSyncIndicatorProps {
  connection: WhatsAppConnection;
}

export const AutoSyncIndicator = ({ connection }: AutoSyncIndicatorProps) => {
  const hasAutoData = connection.avatar || connection.displayName;
  const hasValidPhone = connection.phone && connection.phone.length >= 12;
  
  if (!hasAutoData && !hasValidPhone) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Aguardando dados automáticos...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {connection.avatar && (
        <div className="flex items-center gap-1">
          <Avatar className="h-4 w-4">
            <AvatarImage src={connection.avatar} alt="Profile" />
            <AvatarFallback className="text-[8px]">?</AvatarFallback>
          </Avatar>
          <CheckCircle className="w-3 h-3 text-green-500" />
        </div>
      )}
      
      {connection.displayName && (
        <Badge variant="outline" className="text-xs px-1 py-0 h-4">
          {connection.displayName}
        </Badge>
      )}
      
      {hasValidPhone && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-green-600">📱</span>
          <span className="text-xs text-muted-foreground font-mono">
            {connection.phone.slice(-4)}
          </span>
        </div>
      )}
      
      {hasAutoData && (
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span className="text-xs text-green-600">Auto</span>
        </div>
      )}
    </div>
  );
};