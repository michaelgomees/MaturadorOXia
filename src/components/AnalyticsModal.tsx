import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BarChart3, MessageCircle, TrendingUp, Users, Zap, Calendar, Download } from "lucide-react";
import { useState } from "react";

interface AnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AnalyticsModal = ({ open, onOpenChange }: AnalyticsModalProps) => {
  const [timeRange, setTimeRange] = useState("7d");

  // Mock data para demonstração
  const stats = {
    totalChips: 3,
    activeChips: 2,
    totalConversations: 256,
    conversationsToday: 89,
    responseRate: 94.2,
    avgResponseTime: "2.3s",
    satisfactionRate: 96.8
  };

  const chipPerformance = [
    { name: "Alex Marketing", conversations: 156, responseRate: 96.2, status: "Ativo" },
    { name: "Sofia Suporte", conversations: 78, responseRate: 94.8, status: "Ativo" },
    { name: "João Vendas", conversations: 22, responseRate: 89.1, status: "Inativo" }
  ];

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Conversas</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalConversations}</div>
                <div className="text-xs text-muted-foreground">{stats.conversationsToday} hoje</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">Taxa Resposta</span>
                </div>
                <div className="text-2xl font-bold">{stats.responseRate}%</div>
                <div className="text-xs text-green-600">+2.1% vs semana anterior</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Tempo Médio</span>
                </div>
                <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
                <div className="text-xs text-green-600">-0.5s vs semana anterior</div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Performance por Chip */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Performance por Chip</h3>
            <div className="space-y-3">
              {chipPerformance.map((chip, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium">{chip.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {chip.conversations} conversas • {chip.responseRate}% taxa de resposta
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={chip.status === "Ativo" ? "default" : "secondary"}>
                          {chip.status}
                        </Badge>
                        <div className="text-right">
                          <div className="text-sm font-medium">{chip.responseRate}%</div>
                          <div className="text-xs text-muted-foreground">resposta</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Gráfico Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Conversas por Dia</CardTitle>
              <CardDescription>
                Evolução do volume de conversas nos últimos {timeRange === "24h" ? "24 horas" : 
                timeRange === "7d" ? "7 dias" : 
                timeRange === "30d" ? "30 dias" : "90 dias"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Gráfico será implementado com dados reais do Supabase
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Insights & Recomendações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">Performance Excelente</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Taxa de resposta 94.2% está 8% acima da média do setor
                </p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-200">Oportunidade</span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  João Vendas pode se beneficiar de otimização no prompt para melhorar performance
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};