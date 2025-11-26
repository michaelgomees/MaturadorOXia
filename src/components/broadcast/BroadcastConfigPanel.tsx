import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Play, Calendar, Clock, Users, MessageSquare } from 'lucide-react';
import { ContactList } from '@/hooks/useContactLists';
import { BroadcastMessage } from '@/hooks/useBroadcastMessages';
import { useBroadcastCampaigns } from '@/hooks/useBroadcastCampaigns';
import { useConnections } from '@/contexts/ConnectionsContext';

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
  const [previewMessage, setPreviewMessage] = useState('');

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

  const handleStartCampaign = async () => {
    const campaignData = {
      nome: `Disparo ${new Date().toLocaleString('pt-BR')}`,
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
      status: 'running',
      mensagens_enviadas: 0,
      mensagens_total: 0,
    };

    await campaigns.createCampaign(campaignData);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              Agendar disparo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="agendar">Agendar para data específica</Label>
              <Switch
                id="agendar"
                checked={config.agendarDataEspecifica}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, agendarDataEspecifica: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Clock className="h-5 w-5" />
              Intervalo entre mensagens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={config.intervaloMin}
                onChange={(e) =>
                  setConfig({ ...config, intervaloMin: parseInt(e.target.value) })
                }
                className="w-24"
              />
              <span>e</span>
              <Input
                type="number"
                value={config.intervaloMax}
                onChange={(e) =>
                  setConfig({ ...config, intervaloMax: parseInt(e.target.value) })
                }
                className="w-24"
              />
              <span className="text-muted-foreground">segundos</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Clock className="h-5 w-5" />
              Pausa automática
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Após</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={config.pausarAposMensagens}
                  onChange={(e) =>
                    setConfig({ ...config, pausarAposMensagens: parseInt(e.target.value) })
                  }
                  className="w-24"
                />
                <span className="text-muted-foreground">mensagens, aguardar</span>
                <Input
                  type="number"
                  value={config.pausarPorMinutos}
                  onChange={(e) =>
                    setConfig({ ...config, pausarPorMinutos: parseInt(e.target.value) })
                  }
                  className="w-24"
                />
                <span className="text-muted-foreground">minutos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Clock className="h-5 w-5" />
              Horário de envio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="time"
                value={config.horarioInicio}
                onChange={(e) => setConfig({ ...config, horarioInicio: e.target.value })}
              />
              <span>às</span>
              <Input
                type="time"
                value={config.horarioFim}
                onChange={(e) => setConfig({ ...config, horarioFim: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              Dias da semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
              {diasDaSemana.map((dia) => (
                <Button
                  key={dia.value}
                  variant={config.diasSemana.includes(dia.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleDia(dia.value)}
                  className="flex flex-col h-auto py-3"
                >
                  <span className="text-xs font-bold">{dia.label}</span>
                  <span className="text-xs">{dia.short}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleStartCampaign}
          disabled={selectedLists.size === 0 || selectedInstances.size === 0 || !selectedMessageFile}
          className="w-full h-14 text-lg"
          size="lg"
        >
          <Play className="h-5 w-5 mr-2" />
          Iniciar Disparo
        </Button>
      </div>

      <div>
        <Card className="sticky top-4">
          <CardHeader className="bg-primary/10">
            <CardTitle>Preview</CardTitle>
            <CardDescription>Contato Exemplo</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-[#dcf8c6] rounded-lg p-4 min-h-[300px] flex items-center justify-center">
              {previewMessage ? (
                <p className="text-sm">{previewMessage}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic text-center">
                  Digite uma mensagem para ver o preview
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
