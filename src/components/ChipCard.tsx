import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Play, Pause, Settings, MessageCircle, Bot, QrCode, Wifi, History, Thermometer, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { ChipConfigModal } from "./ChipConfigModal";
import { ConnectionTestModal } from "./ConnectionTestModal";
import { ChipHistoryModal } from "./ChipHistoryModal";
import { useToast } from "@/hooks/use-toast";
import { useChipMonitoring } from "@/hooks/useChipMonitoring";
import { useConnections } from "@/contexts/ConnectionsContext";
import { useAutoSync } from "@/hooks/useAutoSync";
import { AutoSyncIndicator } from "./AutoSyncIndicator";

type ChipStatus = "active" | "idle" | "offline";

interface ChipData {
  id: string;
  name: string;
  status: ChipStatus;
  aiModel: string;
  conversations: number;
  lastActive: string;
}

interface ChipCardProps {
  chip: ChipData;
  isSelected: boolean;
  onSelect: () => void;
  onGenerateQR?: () => void;
  onChipUpdated?: () => void;
}

const statusConfig = {
  active: {
    color: "bg-secondary",
    label: "Ativo",
    textColor: "text-secondary"
  },
  idle: {
    color: "bg-accent",
    label: "Inativo", 
    textColor: "text-accent"
  },
  offline: {
    color: "bg-muted-foreground",
    label: "Offline",
    textColor: "text-muted-foreground"
  }
};

const maturationStatusConfig = {
  heating: {
    color: "bg-orange-500/10 text-orange-500",
    label: "Aquecendo",
    icon: Thermometer
  },
  ready: {
    color: "bg-blue-500/10 text-blue-500", 
    label: "Pronto",
    icon: Bot
  },
  active: {
    color: "bg-primary/10 text-primary",
    label: "Em Uso",
    icon: TrendingUp
  },
  cooling: {
    color: "bg-slate-500/10 text-slate-500",
    label: "Resfriando", 
    icon: Pause
  }
};

const aiModelColors = {
  ChatGPT: "bg-primary/10 text-primary",
  Claude: "bg-secondary/10 text-secondary", 
  Gemini: "bg-accent/10 text-accent"
};

export const ChipCard = ({ chip, isSelected, onSelect, onGenerateQR, onChipUpdated }: ChipCardProps) => {
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [connectionTestModalOpen, setConnectionTestModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const { toast } = useToast();
  const { initializeChip, getChipMonitoring, simulateChipActivity } = useChipMonitoring();
  const { connections } = useConnections();
  const { forceSyncConnection } = useAutoSync();
  
  // Buscar dados reais da conexão
  const realConnection = connections.find(conn => conn.id === chip.id);
  const status = statusConfig[chip.status];
  const modelColor = aiModelColors[chip.aiModel as keyof typeof aiModelColors] || "bg-muted text-muted-foreground";
  const chipMonitoring = getChipMonitoring(chip.id);

  // Inicializar monitoramento do chip
  useEffect(() => {
    initializeChip(chip.id);
  }, [chip.id, initializeChip]);

  // Simular atividade periodicamente para demonstração
  useEffect(() => {
    if (chip.status === 'active') {
      const interval = setInterval(() => {
        if (Math.random() > 0.7) { // 30% de chance de atividade a cada 5 segundos
          simulateChipActivity(chip.id);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [chip.status, chip.id, simulateChipActivity]);

  const handleToggleStatus = () => {
    // Simular toggle do status do chip
    const newStatus = chip.status === "active" ? "idle" : "active";
    toast({
      title: `Chip ${newStatus === "active" ? "ativado" : "pausado"}`,
      description: `${chip.name} foi ${newStatus === "active" ? "ativado" : "pausado"} com sucesso.`
    });
    onChipUpdated?.();
  };

  // Não fazer sincronização automática aqui para evitar loops
  // O useAutoSync já cuida disso

  // Buscar número e nome real da conexão ou usar fallback
  const getChipPhone = () => {
    if (realConnection?.phone) {
      return realConnection.phone;
    }
    // Fallback para localStorage
    const savedConfigs = localStorage.getItem('ox-chip-configs');
    if (savedConfigs) {
      const configs = JSON.parse(savedConfigs);
      const chipConfig = configs.find((c: any) => c.id === chip.id);
      return chipConfig?.phone || "+5511999999999";
    }
    return "+5511999999999";
  };

  const getDisplayName = () => {
    return realConnection?.displayName || chip.name;
  };

  const getAvatarUrl = () => {
    return realConnection?.avatar;
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
        isSelected ? 'ring-2 ring-primary shadow-primary/25' : 'hover:shadow-md hover:shadow-primary/10'
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {getAvatarUrl() ? (
                <AvatarImage 
                  src={getAvatarUrl()} 
                  alt={`${getDisplayName()} - WhatsApp Profile`}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold">
                {getDisplayName().split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm">{getDisplayName()}</h3>
              <p className="text-xs text-muted-foreground font-mono">{getChipPhone()}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${status.color} animate-pulse`} />
                <span className={`text-xs font-medium ${status.textColor}`}>
                  {status.label}
                  {realConnection?.avatar && realConnection?.displayName && (
                    <span className="ml-1 text-primary">📱</span>
                  )}
                </span>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConnectionTestModalOpen(true); }}>
                <Wifi className="mr-2 h-4 w-4" />
                Testar Conexão
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { 
                e.stopPropagation(); 
                console.log('🔄 Forçando sincronização manual para:', chip.name);
                forceSyncConnection(chip.id);
                toast({
                  title: "Sincronizando dados",
                  description: `Buscando dados automáticos do WhatsApp para ${chip.name}...`
                });
              }}>
                <Bot className="mr-2 h-4 w-4" />
                Sincronizar Dados
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setHistoryModalOpen(true); }}>
                <History className="mr-2 h-4 w-4" />
                Histórico
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onGenerateQR?.(); }}>
                <QrCode className="mr-2 h-4 w-4" />
                Gerar QR Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConfigModalOpen(true); }}>
                <Settings className="mr-2 h-4 w-4" />
                Configurar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleStatus(); }}>
                {chip.status === "active" ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {chip.status === "active" ? "Pausar" : "Ativar"}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (window.confirm('Tem certeza que deseja excluir esta conexão?')) {
                    // Simular exclusão da conexão
                    toast({
                      title: "Conexão excluída",
                      description: `${chip.name} foi excluída com sucesso.`,
                      variant: "destructive"
                    });
                    onChipUpdated?.();
                  }
                }}
                className="text-destructive focus:text-destructive"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Excluir Conexão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Indicador de Sincronização Automática */}
        {realConnection && (
          <div className="mb-3">
            <AutoSyncIndicator connection={realConnection} />
          </div>
        )}

        {/* AI Model */}
        <div className="flex items-center gap-2">
          <Bot className="w-3 h-3" />
          <Badge variant="secondary" className={modelColor}>
            {chip.aiModel}
          </Badge>
        </div>

        {/* Stats Expandidas */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="text-center">
            <p className="text-base font-semibold text-primary">{chipMonitoring?.totalMessages || chip.conversations}</p>
            <p className="text-xs text-muted-foreground">Mensagens</p>
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-secondary">
              {chipMonitoring?.startDate ? 
                Math.floor((new Date().getTime() - chipMonitoring.startDate.getTime()) / (1000 * 60 * 60 * 24)) 
                : 0}
            </p>
            <p className="text-xs text-muted-foreground">Dias</p>
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-accent">{chipMonitoring?.errorCount || 0}</p>
            <p className="text-xs text-muted-foreground">Erros</p>
          </div>
        </div>

        {/* Última Atividade */}
        <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
          <span>Última atividade:</span>
          <span>{chipMonitoring?.lastActivity ? 
            chipMonitoring.lastActivity.toLocaleString('pt-BR', { 
              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
            }) : chip.lastActive}
          </span>
        </div>
      </CardContent>
      
      {/* Modals */}
      <ChipConfigModal 
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        chipId={chip.id}
        chipName={chip.name}
      />

      <ConnectionTestModal
        open={connectionTestModalOpen}
        onOpenChange={setConnectionTestModalOpen}
        chipId={chip.id}
        chipName={chip.name}
      />

      <ChipHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        chipId={chip.id}
        chipName={chip.name}
      />
    </Card>
  );
};