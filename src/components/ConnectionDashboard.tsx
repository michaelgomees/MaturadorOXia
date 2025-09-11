import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, User, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { WhatsAppConnection } from "@/contexts/ConnectionsContext";

interface ConnectionDashboardProps {
  connections: WhatsAppConnection[];
}

export const ConnectionDashboard = ({ connections }: ConnectionDashboardProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Conectado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Aguardando QR</Badge>;
      default:
        return <Badge variant="secondary">Desconectado</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Dashboard de Conexões</h3>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections.map((connection) => (
          <Card key={connection.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage 
                      src={connection.avatar} 
                      alt={connection.displayName || connection.name}
                    />
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {connection.displayName || connection.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {getStatusIcon(connection.status)}
                      {connection.evolutionInstanceName}
                    </div>
                  </div>
                </div>
                {getStatusBadge(connection.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {connection.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{connection.phone}</span>
                </div>
              )}
              
              {connection.lastActive && (
                <div className="text-xs text-muted-foreground">
                  Última atividade: {new Date(connection.lastActive).toLocaleString('pt-BR')}
                </div>
              )}
              
              {connection.status === 'active' && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Online
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {connections.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nenhuma conexão ativa</h3>
            <p className="text-sm text-muted-foreground">
              Configure conexões WhatsApp para começar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};