import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, List, RefreshCw, X, Check, MessageSquare } from 'lucide-react';
import { ContactList } from '@/hooks/useContactLists';
import { BroadcastMessage } from '@/hooks/useBroadcastMessages';
import { useBroadcastCampaigns } from '@/hooks/useBroadcastCampaigns';
import { useConnections } from '@/contexts/ConnectionsContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BroadcastConfigPanelProps {
  contactLists: ContactList[];
  messageFiles: BroadcastMessage[];
  campaigns: ReturnType<typeof useBroadcastCampaigns>;
}

export const BroadcastConfigPanel = ({
  contactLists,
  messageFiles,
  campaigns,
}: BroadcastConfigPanelProps) => {
  const { connections } = useConnections();
  const [config, setConfig] = useState({
    agendarDataEspecifica: false,
    intervaloMin: 30,
    intervaloMax: 60,
    pausarAposMensagens: 20,
    pausarPorMinutos: 10,
    horarioInicio: '08:00',
    horarioFim: '18:00',
    diasSemana: [1, 2, 3, 4, 5, 6, 7],
  });

  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [selectedInstances, setSelectedInstances] = useState<Set<string>>(new Set());
  const [selectedMessageFile, setSelectedMessageFile] = useState<string>('');
  const [dataAgendada, setDataAgendada] = useState('');
  const [randomNoRepeat, setRandomNoRepeat] = useState(true);
  const [campaignName, setCampaignName] = useState('');

  const diasDaSemana = [
    { label: 'SEGUNDA', short: 'SEG', value: 1 },
    { label: 'TERÇA', short: 'TER', value: 2 },
    { label: 'QUARTA', short: 'QUA', value: 3 },
    { label: 'QUINTA', short: 'QUI', value: 4 },
    { label: 'SEXTA', short: 'SEX', value: 5 },
    { label: 'SÁBADO', short: 'SÁB', value: 6 },
    { label: 'DOMINGO', short: 'DOM', value: 7 },
  ];

  const toggleDia = (dia: number) => {
    const newDias = config.diasSemana.includes(dia)
      ? config.diasSemana.filter(d => d !== dia)
      : [...config.diasSemana, dia];
    setConfig({ ...config, diasSemana: newDias });
  };

  const toggleInstance = (id: string) => {
    const newSet = new Set(selectedInstances);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedInstances(newSet);
  };

  const toggleList = (id: string) => {
    const newSet = new Set(selectedLists);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedLists(newSet);
  };

  const toggleMessageFile = (id: string) => {
    setSelectedMessageFile(selectedMessageFile === id ? '' : id);
  };

  const selectAllActive = () => {
    const activeConnections = connections.filter(c => c.status === 'active');
    setSelectedInstances(new Set(activeConnections.map(c => c.id)));
  };

  const activeConnections = connections.filter(c => c.status === 'active');

  const handleStartCampaign = async () => {
    try {
      toast.info('Criando campanha...');

      const campaignData = {
        nome: campaignName || `Disparo ${new Date().toLocaleString('pt-BR')}`,
        lista_ids: Array.from(selectedLists),
        instance_ids: Array.from(selectedInstances),
        message_file_id: selectedMessageFile || undefined,
        intervalo_min: config.intervaloMin,
        intervalo_max: config.intervaloMax,
        pausar_apos_mensagens: config.pausarAposMensagens,
        pausar_por_minutos: config.pausarPorMinutos,
        agendar_data_especifica: config.agendarDataEspecifica,
        horario_inicio: config.horarioInicio,
        horario_fim: config.horarioFim,
        dias_semana: config.diasSemana,
        random_no_repeat: randomNoRepeat,
        status: 'draft',
        mensagens_enviadas: 0,
        mensagens_total: 0,
      };

      const success = await campaigns.createCampaign(campaignData);
      
      if (!success) {
        toast.error('Erro ao criar campanha');
        return;
      }

      toast.success(
        '✅ Campanha criada com sucesso! Vá para a aba "Logs" para iniciar o disparo.'
      );

      // Limpar seleções
      setSelectedLists(new Set());
      setSelectedInstances(new Set());
      setSelectedMessageFile('');
      setCampaignName('');

      // Recarregar campanhas
      await campaigns.loadCampaigns();
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      toast.error('Erro ao criar campanha');
    }
  };

  return (
    <div className="space-y-6">
      {/* Nome da Campanha */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-xl">Nome da Campanha</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Dê um nome para identificar esta campanha
          </p>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Ex: Disparo Black Friday, Promoção Janeiro..."
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="text-base"
          />
        </CardContent>
      </Card>

      {/* Conexões Disponíveis */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Conexões disponíveis *</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione uma ou mais conexões para o disparo. O sistema alternará entre as conexões selecionadas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllActive}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Selecionar ativas
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeConnections.map((connection) => (
              <Card
                key={connection.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md relative",
                  selectedInstances.has(connection.id)
                    ? "border-primary border-2 bg-primary/5"
                    : "border hover:border-primary/50"
                )}
                onClick={() => toggleInstance(connection.id)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={connection.avatar || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                      {connection.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{connection.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {connection.phone || 'Indisponível'}
                    </p>
                  </div>
                  {selectedInstances.has(connection.id) ? (
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <X className="h-5 w-5 text-destructive" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {activeConnections.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma conexão ativa disponível
            </p>
          )}
        </CardContent>
      </Card>

      {/* Listas de Contatos Disponíveis */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Listas de contatos disponíveis</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione uma ou mais listas de contatos para o disparo. Os contatos das listas selecionadas serão incluídos no envio.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {contactLists.map((list) => (
              <Card
                key={list.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedLists.has(list.id)
                    ? "border-primary border-2 bg-primary/5"
                    : "border hover:border-primary/50"
                )}
                onClick={() => toggleList(list.id)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <List className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{list.nome}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {contactLists.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma lista disponível
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mensagens Disponíveis */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Mensagens disponíveis *</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione o arquivo de mensagens que será enviado. Apenas um arquivo pode ser selecionado por vez.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {messageFiles.filter(m => m.is_active).map((messageFile) => (
              <Card
                key={messageFile.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md relative",
                  selectedMessageFile === messageFile.id
                    ? "border-primary border-2 bg-primary/5"
                    : "border hover:border-primary/50"
                )}
                onClick={() => toggleMessageFile(messageFile.id)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{messageFile.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {messageFile.total_mensagens} mensagens
                    </p>
                  </div>
                  {selectedMessageFile === messageFile.id && (
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {messageFiles.filter(m => m.is_active).length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum arquivo de mensagens disponível
            </p>
          )}
        </CardContent>
      </Card>

      {/* Configuração de Envio */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-xl">Configuração de Envio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
            <div className="space-y-1">
              <div className="font-semibold">Envio Aleatório Sem Repetição</div>
              <p className="text-sm text-muted-foreground">
                As mensagens serão enviadas de forma aleatória para os contatos, garantindo que cada contato receba uma mensagem diferente sem repetições neste disparo
              </p>
            </div>
            <Switch
              checked={randomNoRepeat}
              onCheckedChange={setRandomNoRepeat}
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuração e Agendamento */}
      <Card className="border-2">
        <CardContent className="p-6 space-y-6">
          {/* Agendar disparo */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-l-4 border-primary pl-4">
              <h3 className="text-lg font-semibold">Agendar disparo</h3>
            </div>
            
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
              <Label htmlFor="agendar" className="text-base">Agendar para data específica</Label>
              <Switch
                id="agendar"
                checked={config.agendarDataEspecifica}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, agendarDataEspecifica: checked })
                }
              />
            </div>

            {config.agendarDataEspecifica && (
              <Input
                type="datetime-local"
                value={dataAgendada}
                onChange={(e) => setDataAgendada(e.target.value)}
                className="bg-background"
              />
            )}
          </div>

          {/* Intervalo entre mensagens */}
          <div className="space-y-4">
            <div className="border-l-4 border-primary pl-4">
              <h3 className="text-lg font-semibold">Intervalo entre mensagens</h3>
            </div>
            
            <div className="flex items-center gap-3 bg-muted/30 p-4 rounded-lg">
              <Input
                type="number"
                value={config.intervaloMin}
                onChange={(e) =>
                  setConfig({ ...config, intervaloMin: parseInt(e.target.value) || 0 })
                }
                className="w-24 bg-background"
              />
              <span className="text-sm">e</span>
              <Input
                type="number"
                value={config.intervaloMax}
                onChange={(e) =>
                  setConfig({ ...config, intervaloMax: parseInt(e.target.value) || 0 })
                }
                className="w-24 bg-background"
              />
              <span className="text-sm text-muted-foreground">segundos</span>
            </div>
          </div>

          {/* Pausa automática */}
          <div className="space-y-4">
            <div className="border-l-4 border-primary pl-4">
              <h3 className="text-lg font-semibold">Pausa automática</h3>
            </div>
            
            <div className="flex items-center gap-3 bg-muted/30 p-4 rounded-lg flex-wrap">
              <span className="text-sm text-muted-foreground">Após</span>
              <Input
                type="number"
                value={config.pausarAposMensagens}
                onChange={(e) =>
                  setConfig({ ...config, pausarAposMensagens: parseInt(e.target.value) || 0 })
                }
                className="w-20 bg-background"
              />
              <span className="text-sm text-muted-foreground">mensagens, aguardar</span>
              <Input
                type="number"
                value={config.pausarPorMinutos}
                onChange={(e) =>
                  setConfig({ ...config, pausarPorMinutos: parseInt(e.target.value) || 0 })
                }
                className="w-20 bg-background"
              />
              <span className="text-sm text-muted-foreground">minutos</span>
            </div>
          </div>

          {/* Horário de envio */}
          <div className="space-y-4">
            <div className="border-l-4 border-primary pl-4">
              <h3 className="text-lg font-semibold">Horário de envio</h3>
            </div>
            
            <div className="flex items-center gap-3 bg-muted/30 p-4 rounded-lg">
              <Input
                type="time"
                value={config.horarioInicio}
                onChange={(e) => setConfig({ ...config, horarioInicio: e.target.value })}
                className="w-32 bg-background"
              />
              <span className="text-sm">às</span>
              <Input
                type="time"
                value={config.horarioFim}
                onChange={(e) => setConfig({ ...config, horarioFim: e.target.value })}
                className="w-32 bg-background"
              />
            </div>
          </div>

          {/* Dias da semana */}
          <div className="space-y-4">
            <div className="border-l-4 border-primary pl-4">
              <h3 className="text-lg font-semibold">Dias da semana</h3>
            </div>
            
            <div className="grid grid-cols-7 gap-2 bg-muted/30 p-4 rounded-lg">
              {diasDaSemana.map((dia) => (
                <Button
                  key={dia.value}
                  variant={config.diasSemana.includes(dia.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleDia(dia.value)}
                  className="flex flex-col h-auto py-3 px-2"
                >
                  <span className="text-[10px] font-bold leading-tight">{dia.label}</span>
                  <span className="text-xs text-muted-foreground">{dia.short}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Botão de Criar Campanha */}
          <Button
            onClick={handleStartCampaign}
            disabled={selectedLists.size === 0 || selectedInstances.size === 0 || !selectedMessageFile}
            className="w-full h-14 text-lg font-bold bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 text-white"
            size="lg"
          >
            Criar Campanha
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
