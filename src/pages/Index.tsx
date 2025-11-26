import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Bot, MessageCircle, Zap, Settings, BarChart3, QrCode, Link, Brain, GitBranch, Users, Phone, FileText } from "lucide-react";
import { Header } from "@/components/Header";
import { ChipCard } from "@/components/ChipCard";
import { StatsCard } from "@/components/StatsCard";
import { CreateChipModal } from "@/components/CreateChipModal";
import { QRCodeModal } from "@/components/QRCodeModal";
import { AnalyticsModal } from "@/components/AnalyticsModal";
import { useToast } from "@/hooks/use-toast";
import { useConnections } from "@/contexts/ConnectionsContext";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useChipMaturation } from "@/hooks/useChipMaturation";
import { useMaturadorPairs } from "@/hooks/useMaturadorPairs";
import { ConnectionsTab } from "@/components/ConnectionsTab";
import { PromptsTab } from "@/components/PromptsTab";
import { DadosTab } from "@/components/DadosTab";
import { MaturadorTab } from "@/components/MaturadorTab";
import { MessagesConfigTab } from "@/components/MessagesConfigTab";
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";

// Dados reais - sem demonstração

const Index = () => {
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [createChipModalOpen, setCreateChipModalOpen] = useState(false);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [selectedChipForQR, setSelectedChipForQR] = useState<{name: string, phone: string} | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const { connections, activeConnectionsCount } = useConnections();
  const { user } = useAuth();
  const { pairs } = useMaturadorPairs();
  
  // Usar hooks de sincronização automática e maturação
  useAutoSync();
  const { startChipConversation } = useChipMaturation();
  
  // Contar duplas ativas (com status 'running')
  const activePairsCount = pairs.filter(pair => pair.status === 'running').length;

  // Verificar se usuário é admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      // Lista de emails admin (você pode adicionar mais emails aqui)
      const adminEmails = [
        'admin@oxautomacoes.com.br',
        'contato@oxautomacoes.com.br'
      ];
      
      // Verificar se o email do usuário está na lista de admins
      const isUserAdmin = adminEmails.includes(user.email || '');
      setIsAdmin(isUserAdmin);
    };
    
    checkAdminStatus();
  }, [user]);

  const handleGenerateQRCode = (chipName: string, chipPhone: string) => {
    setSelectedChipForQR({ name: chipName, phone: chipPhone });
    setQrCodeModalOpen(true);
  };

  const handleChipCreated = () => {
    // Recarregar lista de chips ou atualizar estado
    toast({
      title: "Lista atualizada",
      description: "A lista de chips foi atualizada com sucesso.",
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <Header />
      
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="conexoes" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Conexões
            </TabsTrigger>
            <TabsTrigger value="ai-config" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Prompts de IA
            </TabsTrigger>
            <TabsTrigger value="mensagens" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="dados" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="maturador" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Maturador
            </TabsTrigger>
            <TabsTrigger value="disparo" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Disparo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8 mt-8">
            {/* Hero Section */}
            <section className="text-center space-y-6">
              <div className="space-y-4">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  OX MATURADOR
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Plataforma inteligente de automação conversacional com IA. 
                  Crie, gerencie e monitore chips conversacionais autônomos.
                </p>
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button size="lg" onClick={() => setCreateChipModalOpen(true)} className="hover:bg-primary/90 hover:scale-105 transition-all duration-300">
                  <Plus className="w-5 h-5 mr-2" />
                  Nova Conexão
                </Button>
                {activeConnectionsCount >= 2 && (
                  <Button 
                    size="lg" 
                    variant="secondary" 
                    className="hover:scale-105 transition-all duration-300" 
                    onClick={startChipConversation}
                  >
                    <Bot className="w-5 h-5 mr-2" />
                    Iniciar Conversa
                  </Button>
                )}
                <Button size="lg" variant="outline" className="hover:bg-secondary/10 hover:border-secondary transition-all duration-300" onClick={() => setAnalyticsModalOpen(true)}>
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Ver Analytics
                </Button>
              </div>
            </section>

            {/* Stats Overview */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatsCard 
                title="Conexões Ativas"
                value={activeConnectionsCount.toString()}
                description={activeConnectionsCount === 0 ? "Configure suas primeiras conexões" : "Conexões funcionando"}
                icon={<Bot className="w-5 h-5 text-primary" />}
              />
              <StatsCard 
                title="Total de Conversas"
                value={activePairsCount.toString()}
                description={activePairsCount === 0 ? "Nenhuma dupla rodando" : "Duplas ativas em maturação"}
                icon={<MessageCircle className="w-5 h-5 text-secondary" />}
              />
              <StatsCard 
                title="Taxa de Conexão"
                value={connections.length > 0 ? Math.round((activeConnectionsCount / connections.length) * 100) + "%" : "0%"}
                description={connections.length === 0 ? "Sem dados ainda" : "Conexões funcionais"}
                icon={<Zap className="w-5 h-5 text-accent" />}
              />
              <StatsCard 
                title="Sistema"
                value={connections.length > 0 ? "Operacional" : "Pronto"}
                description={connections.length > 0 ? "Sistema em funcionamento" : "Configuração inicial"}
                icon={<Settings className="w-5 h-5 text-primary" />}
              />
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Minhas Conexões</h2>
                <div className="flex gap-2">
                  <Badge variant="secondary">{connections.length} Total</Badge>
                  <Badge variant="outline" className="text-secondary">{activeConnectionsCount} Ativas</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Conexões Reais */}
                {connections.map((connection) => (
                  <ChipCard
                    key={connection.id}
                    chip={{
                      id: connection.id,
                      name: connection.name,
                      status: connection.status === 'active' ? 'active' : connection.status === 'inactive' ? 'idle' : 'offline',
                      aiModel: connection.aiModel || 'ChatGPT',
                      conversations: connection.conversationsCount,
                      lastActive: new Date(connection.lastActive).toLocaleString('pt-BR')
                    }}
                    isSelected={selectedChip === connection.id}
                    onSelect={() => setSelectedChip(connection.id)}
                    onGenerateQR={() => handleGenerateQRCode(connection.name, connection.phone || '')}
                    onChipUpdated={handleChipCreated}
                  />
                ))}
                
                {/* Add New Chip Card */}
                <Card 
                  className="border-dashed border-2 hover:border-primary/50 transition-all duration-300 cursor-pointer group hover:scale-105"
                  onClick={() => setActiveTab("conexoes")}
                >
                  <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground group-hover:text-primary transition-colors">
                    <Plus className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform duration-300" />
                    <h3 className="font-semibold">Nova Conexão</h3>
                    <p className="text-sm text-center">Configure uma nova instância conversacional</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start hover:bg-secondary/10 hover:border-secondary transition-all duration-300"
                  onClick={() => setActiveTab("ai-config")}
                >
                  <Bot className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Configurar Prompts</div>
                    <div className="text-sm text-muted-foreground">Gerenciar prompts de IA</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start hover:bg-secondary/10 hover:border-secondary transition-all duration-300"
                  onClick={() => setActiveTab("dados")}
                >
                  <BarChart3 className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Central de Dados</div>
                    <div className="text-sm text-muted-foreground">Recursos multimídia</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start hover:bg-secondary/10 hover:border-secondary transition-all duration-300"
                  onClick={() => {
                    if (activeConnectionsCount >= 2) {
                      startChipConversation();
                      toast({
                        title: "🤖 Conversa Iniciada!",
                        description: "Uma nova conversa entre chips foi iniciada.",
                      });
                    } else {
                      toast({
                        title: "⚠️ Chips Insuficientes",
                        description: "Você precisa de pelo menos 2 chips ativos para iniciar uma conversa.",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={activeConnectionsCount < 2}
                >
                  <Users className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">
                      {activeConnectionsCount >= 2 ? "Iniciar Conversa" : "Maturador (Aguardando)"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {activeConnectionsCount >= 2 ? "Conversas automáticas" : `${activeConnectionsCount}/2 chips ativos`}
                    </div>
                  </div>
                </Button>
              </div>
            </section>

            {/* Connection Notice */}
            <section className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center">
              <h3 className="font-semibold text-foreground mb-2">
                Conecte ao Supabase para Funcionalidade Completa
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Para implementar autenticação, banco de dados, integração com Evolution API e modelos de IA, 
                conecte seu projeto ao Supabase usando nossa integração nativa.
              </p>
            </section>
          </TabsContent>

          <TabsContent value="conexoes" className="mt-8">
            <ConnectionsTab />
          </TabsContent>

          <TabsContent value="ai-config" className="mt-8">
            <PromptsTab />
          </TabsContent>

          <TabsContent value="mensagens" className="mt-8">
            <MessagesConfigTab />
          </TabsContent>

          <TabsContent value="dados" className="mt-8">
            <DadosTab />
          </TabsContent>

          <TabsContent value="maturador" className="mt-8">
            <MaturadorTab />
          </TabsContent>

          <TabsContent value="disparo" className="mt-8">
            <DisparoTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <CreateChipModal 
        open={createChipModalOpen}
        onOpenChange={setCreateChipModalOpen}
        onChipCreated={handleChipCreated}
      />
      
      {selectedChipForQR && (
        <QRCodeModal 
          open={qrCodeModalOpen}
          onOpenChange={setQrCodeModalOpen}
          chipName={selectedChipForQR.name}
          chipPhone={selectedChipForQR.phone}
        />
      )}

      <AnalyticsModal 
        open={analyticsModalOpen}
        onOpenChange={setAnalyticsModalOpen}
      />
      </div>
    </ProtectedRoute>
  );
};

export default Index;