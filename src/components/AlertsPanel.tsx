import { useState } from "react";
import { Bell, BellOff, AlertTriangle, Shield, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChipMonitoring, Alert } from "@/hooks/useChipMonitoring";

export const AlertsPanel = () => {
  const { alerts, getUnreadAlerts, markAlertAsRead } = useChipMonitoring();
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadAlerts = getUnreadAlerts();
  const hasUnreadAlerts = unreadAlerts.length > 0;

  const alertIcons = {
    connection_failed: Wifi,
    blocked: Shield,
    inactive: AlertTriangle,
    error: AlertTriangle
  };

  const alertColors = {
    connection_failed: "text-destructive",
    blocked: "text-destructive", 
    inactive: "text-accent",
    error: "text-destructive"
  };

  const handleMarkAsRead = (alert: Alert) => {
    markAlertAsRead(alert.id);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) return `${diffInDays}d`;
    if (diffInHours > 0) return `${diffInHours}h`;
    if (diffInMinutes > 0) return `${diffInMinutes}m`;
    return 'agora';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {hasUnreadAlerts ? (
            <>
              <Bell className="w-5 h-5" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
              </Badge>
            </>
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Alertas do Sistema</span>
              {hasUnreadAlerts && (
                <Badge variant="secondary" className="text-xs">
                  {unreadAlerts.length} não lidos
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              {alerts.length === 0 ? (
                <div className="p-4 text-center">
                  <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum alerta</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {alerts.slice(0, 20).map((alert) => {
                    const IconComponent = alertIcons[alert.type];
                    
                    return (
                      <div 
                        key={alert.id} 
                        className={`p-3 border-b last:border-b-0 hover:bg-muted/20 transition-colors ${
                          !alert.isRead ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <IconComponent className={`w-4 h-4 mt-0.5 ${alertColors[alert.type]}`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{alert.chipName}</p>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(alert.timestamp)}
                                </span>
                                {!alert.isRead && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4"
                                    onClick={() => handleMarkAsRead(alert)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-xs text-muted-foreground mt-1">
                              {alert.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            
            {alerts.length > 0 && (
              <div className="p-3 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => setIsOpen(false)}
                >
                  Ver todos os alertas
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};