import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BarChart3, MessageCircle, TrendingUp, Users, Zap, Calendar, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AnalyticsModal = ({ open, onOpenChange }: AnalyticsModalProps) => {
  const [timeRange, setTimeRange] = useState("7d");
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalChips: 0,
    activeChips: 0,
    totalPairs: 0,
    activePairs: 0,
    runningPairs: 0,
    totalMessages: 0
  });
  const [chipPerformance, setChipPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && user) {
      loadAnalytics();
    }
  }, [open, user, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Buscar conexões
      const { data: conexoes, error: conexoesError } = await supabase
        .from('saas_conexoes')
        .select('*')
        .eq('usuario_id', user?.id);

      if (conexoesError) throw conexoesError;

      // Buscar pares de maturação
      const { data: pares, error: paresError } = await supabase
        .from('saas_pares_maturacao')
        .select('*')
        .eq('usuario_id', user?.id);

      if (paresError) throw paresError;

      // Calcular estatísticas
      const totalChips = conexoes?.length || 0;
      const activeChips = conexoes?.filter(c => c.status === 'active').length || 0;
      const totalPairs = pares?.length || 0;
      const activePairs = pares?.filter(p => p.is_active).length || 0;
      const runningPairs = pares?.filter(p => p.status === 'running').length || 0;
      const totalMessages = pares?.reduce((sum, p) => sum + (p.messages_count || 0), 0) || 0;

      setStats({
        totalChips,
        activeChips,
        totalPairs,
        activePairs,
        runningPairs,
        totalMessages
      });

      // Montar performance por chip
      const performance = conexoes?.map(chip => ({
        name: chip.nome,
        status: chip.status === 'active' ? 'Ativo' : 'Inativo',
        conversationsCount: chip.conversas_count || 0,
        paresCount: pares?.filter(p => 
          p.nome_chip1 === chip.nome || p.nome_chip2 === chip.nome
        ).length || 0
      })) || [];

      setChipPerformance(performance);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analytics & Relatórios
          </DialogTitle>
          <DialogDescription>
            Visualize o desempenho dos seus chips conversacionais e métricas importantes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Controles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Últimas 24h</SelectItem>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar Relatório
            </Button>
          </div>

          {/* Métricas Principais */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Total Chips</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalChips}</div>
                <div className="text-xs text-muted-foreground">{stats.activeChips} ativos</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Duplas</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalPairs}</div>
                <div className="text-xs text-muted-foreground">{stats.activePairs} ativas</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Mensagens</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalMessages}</div>
                <div className="text-xs text-muted-foreground">{stats.runningPairs} duplas em execução</div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Performance por Chip */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Performance por Chip</h3>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando dados...</div>
            ) : chipPerformance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum chip configurado ainda</div>
            ) : (
              <div className="space-y-3">
                {chipPerformance.map((chip, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <h4 className="font-medium">{chip.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {chip.conversationsCount} conversas • {chip.paresCount} duplas configuradas
                            </p>
                          </div>
                        </div>
                        <Badge variant={chip.status === "Ativo" ? "default" : "secondary"}>
                          {chip.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Insights & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.runningPairs > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800 dark:text-blue-200">Sistema Ativo</span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {stats.runningPairs} {stats.runningPairs === 1 ? 'dupla está' : 'duplas estão'} em processo de maturação agora
                  </p>
                </div>
              )}

              {stats.totalMessages > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-200">Mensagens Geradas</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Total de {stats.totalMessages} mensagens já foram processadas pelo sistema
                  </p>
                </div>
              )}

              {stats.activePairs === 0 && stats.totalChips >= 2 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span className="font-medium text-amber-800 dark:text-amber-200">Oportunidade</span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Você tem {stats.totalChips} chips disponíveis. Configure duplas na aba Maturador para iniciar conversas automáticas.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};