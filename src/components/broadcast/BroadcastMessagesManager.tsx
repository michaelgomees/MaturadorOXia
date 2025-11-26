import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, Trash2, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { BroadcastMessage } from '@/hooks/useBroadcastMessages';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BroadcastMessagesManagerProps {
  messages: BroadcastMessage[];
  loading: boolean;
  uploadMessageFile: (file: File, nome: string) => Promise<boolean>;
  deleteMessageFile: (id: string) => Promise<boolean>;
  toggleMessageFile: (id: string) => Promise<boolean>;
  downloadTemplate: () => void;
}

export const BroadcastMessagesManager = ({
  messages,
  loading,
  uploadMessageFile,
  deleteMessageFile,
  toggleMessageFile,
  downloadTemplate,
}: BroadcastMessagesManagerProps) => {
  const [nome, setNome] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !nome.trim()) return;

    setUploading(true);
    const success = await uploadMessageFile(selectedFile, nome);
    if (success) {
      setNome('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setUploading(false);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Mensagens
          </CardTitle>
          <CardDescription>
            Faça upload de um arquivo TXT com suas mensagens (uma por linha)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="messageName">Nome do Arquivo *</Label>
            <Input
              id="messageName"
              placeholder="Ex: Mensagens Promoção"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="messageFileUpload">Arquivo TXT *</Label>
            <Input
              id="messageFileUpload"
              type="file"
              accept=".txt"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {selectedFile.name}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !nome.trim() || uploading}
              className="flex-1"
            >
              {uploading ? 'Enviando...' : 'Fazer Upload'}
            </Button>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Modelo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Arquivos Disponíveis ({messages.length})
          </CardTitle>
          <CardDescription>
            Gerencie seus arquivos de mensagens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum arquivo cadastrado ainda
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {messages.map((message) => (
                <Card key={message.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{message.nome}</h4>
                          {message.is_active ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {message.total_mensagens} mensagens
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={message.is_active}
                          onCheckedChange={() => toggleMessageFile(message.id)}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMessageFile(message.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
