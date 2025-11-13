import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Download, Trash2, FileText, MessageCircle, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMaturationMessages } from "@/hooks/useMaturationMessages";
import { ScrollArea } from "@/components/ui/scroll-area";

export const MessagesConfigTab = () => {
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const {
    messages,
    loading,
    uploadMessageFile,
    deleteMessageFile,
    toggleMessageFile,
    downloadExampleFile
  } = useMaturationMessages();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split('.').pop()?.toLowerCase();
    if (!['txt', 'csv', 'json'].includes(fileType || '')) {
      toast({
        title: "Erro",
        description: "Formato não suportado. Use .txt, .csv ou .json",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadName.trim()) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo e forneça um nome",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const success = await uploadMessageFile(selectedFile, uploadName, uploadDescription);
    
    if (success) {
      setUploadName('');
      setUploadDescription('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    
    setIsUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este arquivo de mensagens?')) {
      await deleteMessageFile(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mensagens de Maturação</h2>
          <p className="text-muted-foreground">
            Importe arquivos de mensagens para maturação offline (sem tokens)
          </p>
        </div>
        <Button variant="outline" onClick={downloadExampleFile}>
          <Download className="w-4 h-4 mr-2" />
          Baixar Exemplo
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Arquivos Importados</p>
              <p className="text-2xl font-bold">{messages.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <MessageCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total de Mensagens</p>
              <p className="text-2xl font-bold">
                {messages.reduce((acc, m) => acc + m.total_mensagens, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <CheckCircle className="w-8 h-8 text-secondary" />
            <div>
              <p className="text-sm text-muted-foreground">Arquivos Ativos</p>
              <p className="text-2xl font-bold">
                {messages.filter(m => m.is_active).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Importar Arquivo de Mensagens</CardTitle>
          <CardDescription>
            Faça upload de um arquivo .txt, .csv ou .json com mensagens pré-definidas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-name">Nome do Arquivo</Label>
            <Input
              id="file-name"
              placeholder="Ex: Mensagens Base de Maturação"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-description">Descrição (opcional)</Label>
            <Textarea
              id="file-description"
              placeholder="Descreva o conteúdo deste arquivo..."
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Arquivo</Label>
            <div className="flex gap-2">
              <Input
                id="file-upload"
                type="file"
                ref={fileInputRef}
                accept=".txt,.csv,.json"
                onChange={handleFileSelect}
                className="flex-1"
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !uploadName.trim() || isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Importando...' : 'Importar'}
              </Button>
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {selectedFile.name}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Formato esperado para .txt:</p>
                <code className="text-xs bg-white/50 px-2 py-1 rounded block">
                  [mensagem_1]: Texto da primeira mensagem<br />
                  [mensagem_2]: Texto da segunda mensagem
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Arquivos */}
      <Card>
        <CardHeader>
          <CardTitle>Arquivos Importados</CardTitle>
          <CardDescription>
            Gerencie seus arquivos de mensagens de maturação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando arquivos...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhum arquivo importado</h3>
              <p className="text-sm text-muted-foreground">
                Importe seu primeiro arquivo de mensagens acima
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{message.nome}</h4>
                          <Badge variant={message.is_active ? "default" : "secondary"}>
                            {message.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {message.tipo_arquivo.toUpperCase()}
                          </Badge>
                        </div>
                        {message.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {message.descricao}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {message.total_mensagens} mensagens
                          </span>
                          <span>
                            Criado em {new Date(message.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleMessageFile(message.id)}
                        >
                          {message.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(message.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Preview das primeiras mensagens */}
                    <div className="bg-muted/50 rounded p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Preview das mensagens:
                      </p>
                      <div className="space-y-1 text-sm">
                        {message.mensagens.slice(0, 3).map((msg, idx) => (
                          <p key={idx} className="truncate">
                            {idx + 1}. {msg}
                          </p>
                        ))}
                        {message.mensagens.length > 3 && (
                          <p className="text-xs text-muted-foreground italic">
                            ... e mais {message.mensagens.length - 3} mensagens
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};