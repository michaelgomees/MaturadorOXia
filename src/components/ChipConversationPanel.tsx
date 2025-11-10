import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useMaturadorEngine, MaturadorMessage, ChipPair } from '@/hooks/useMaturadorEngine';
import { PlayCircle, PauseCircle, Trash2, RefreshCw, MessageSquare } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ChipConversationPanel = () => {
  const {
    isRunning,
    messages,
    chipPairs,
    startMaturador,
    stopMaturador,
    getPairMessages,
    clearPairHistory,
    clearAllHistory,
    processChipPairConversation,
    loadData
  } = useMaturadorEngine();

  const [selectedPairId, setSelectedPairId] = useState<string>('all');
  const [displayMessages, setDisplayMessages] = useState<MaturadorMessage[]>([]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedPairId === 'all') {
      setDisplayMessages(messages);
    } else {
      setDisplayMessages(getPairMessages(selectedPairId));
    }
  }, [selectedPairId, messages, getPairMessages]);

  const handleForceConversation = async (pair: ChipPair) => {
    try {
      await processChipPairConversation(pair);
    } catch (error) {
      console.error('Erro ao forçar conversa:', error);
    }
  };

  const activePairs = chipPairs.filter(p => p.isActive);
  const selectedPair = chipPairs.find(p => p.id === selectedPairId);

  return (
    <div className="space-y-6">
      {/* Controles Principais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversa dos Chips em Tempo Real
          </CardTitle>
          <CardDescription>
            Acompanhe as conversas entre os chips e controle o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status e Controles Globais */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={isRunning ? "default" : "secondary"}>
                  {isRunning ? '▶️ Rodando' : '⏸️ Pausado'}
                </Badge>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Pares Ativos:</span>
                <Badge variant="outline">{activePairs.length}</Badge>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Total de Mensagens:</span>
                <Badge variant="outline">{messages.length}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {!isRunning ? (
                <Button onClick={startMaturador} size="sm" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Iniciar Conversas
                </Button>
              ) : (
                <Button onClick={stopMaturador} variant="secondary" size="sm" className="gap-2">
                  <PauseCircle className="h-4 w-4" />
                  Pausar Conversas
                </Button>
              )}
              <Button 
                onClick={clearAllHistory} 
                variant="destructive" 
                size="sm"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpar Tudo
              </Button>
            </div>
          </div>

          {/* Seletor de Par */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Filtrar por par:</span>
            <Select value={selectedPairId} onValueChange={setSelectedPairId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Conversas</SelectItem>
                {chipPairs.map((pair) => (
                  <SelectItem key={pair.id} value={pair.id}>
                    {pair.firstChipName} ↔ {pair.secondChipName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedPairId !== 'all' && selectedPair && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleForceConversation(selectedPair)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isRunning}
                >
                  <RefreshCw className="h-4 w-4" />
                  Forçar Mensagem
                </Button>
                <Button
                  onClick={() => clearPairHistory(selectedPairId)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar Este Par
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Painel de Mensagens */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedPairId === 'all' 
              ? 'Todas as Conversas' 
              : `${selectedPair?.firstChipName} ↔ ${selectedPair?.secondChipName}`}
          </CardTitle>
          <CardDescription>
            {displayMessages.length} mensagens no histórico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {displayMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhuma conversa ainda</p>
                <p className="text-sm">Inicie o maturador para começar as conversas entre os chips</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayMessages.map((message, index) => {
                  const isFromFirst = message.fromChipId === selectedPair?.firstChipId;
                  const bgColor = isFromFirst ? 'bg-blue-500/10' : 'bg-green-500/10';
                  const borderColor = isFromFirst ? 'border-blue-500/30' : 'border-green-500/30';
                  
                  return (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg border ${bgColor} ${borderColor} space-y-2`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-medium">
                            {message.fromChipName}
                          </Badge>
                          <span className="text-xs text-muted-foreground">→</span>
                          <Badge variant="outline" className="font-medium">
                            {message.toChipName}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(message.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {message.aiModel}
                        </Badge>
                        {message.usage && (
                          <span>
                            Tokens: {message.usage.total_tokens || 'N/A'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Cards de Pares Individuais */}
      {selectedPairId === 'all' && chipPairs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chipPairs.map((pair) => {
            const pairMessages = getPairMessages(pair.id);
            const lastMessage = pairMessages[0];
            
            return (
              <Card key={pair.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{pair.firstChipName} ↔ {pair.secondChipName}</span>
                    <Badge variant={pair.isActive ? "default" : "secondary"}>
                      {pair.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Mensagens:</span>
                    <Badge variant="outline">{pair.messagesCount}</Badge>
                  </div>
                  
                  {lastMessage && (
                    <div className="p-2 bg-muted rounded text-xs space-y-1">
                      <div className="font-medium">{lastMessage.fromChipName}:</div>
                      <div className="text-muted-foreground line-clamp-2">
                        {lastMessage.content}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(lastMessage.timestamp, "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleForceConversation(pair)}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      disabled={!pair.isActive || isRunning}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Forçar
                    </Button>
                    <Button
                      onClick={() => setSelectedPairId(pair.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
