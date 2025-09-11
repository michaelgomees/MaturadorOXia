import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertsPanel } from "./AlertsPanel";
import { SystemConfigModal } from "./SystemConfigModal";
import { ProfileModal } from "./ProfileModal";
import { useConnections } from "@/contexts/ConnectionsContext";
import { useAuth } from "@/contexts/AuthContext";
import oxLogo from "@/assets/ox-logo.png";

export const Header = () => {
  const { toast } = useToast();
  const { activeConnectionsCount } = useConnections();
  const { user, signOut } = useAuth();
  const [systemConfigOpen, setSystemConfigOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout.",
        variant: "destructive"
      });
    }
  };
  return (
    <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden">
              <img src={oxLogo} alt="OX MATURADOR" className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-bold text-lg">OX MATURADOR</h1>
              <p className="text-xs text-muted-foreground">Sistema de Chips IA</p>
            </div>
          </div>

          {/* Navigation & Actions */}
          <div className="flex items-center gap-4">
            {/* Status Badge */}
            <Badge variant="secondary" className="bg-secondary/20 text-secondary">
              <div className="w-2 h-2 bg-secondary rounded-full mr-2 animate-pulse" />
              {activeConnectionsCount} Chips Ativos
            </Badge>

            {/* Alertas do Sistema */}
            <AlertsPanel />

            {/* Settings */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSystemConfigOpen(true)}
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder.svg" alt="User" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      OX
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {user?.user_metadata?.full_name || 'Usuário'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSystemConfigOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SystemConfigModal 
        open={systemConfigOpen}
        onOpenChange={setSystemConfigOpen}
      />
      
      <ProfileModal 
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </header>
  );
};