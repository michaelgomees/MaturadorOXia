import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Download, Trash2, Users } from 'lucide-react';
import { ContactList } from '@/hooks/useContactLists';
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

interface ContactListsManagerProps {
  lists: ContactList[];
  loading: boolean;
  uploadContactList: (file: File, nome: string, descricao?: string) => Promise<boolean>;
  deleteList: (id: string) => Promise<boolean>;
  downloadTemplate: () => void;
}

export const ContactListsManager = ({
  lists,
  loading,
  uploadContactList,
  deleteList,
  downloadTemplate,
}: ContactListsManagerProps) => {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
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
    const success = await uploadContactList(selectedFile, nome, descricao);
    if (success) {
      setNome('');
      setDescricao('');
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
            Upload de Lista
          </CardTitle>
          <CardDescription>
            Faça upload de uma lista de contatos em formato CSV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="listName">Nome da Lista *</Label>
            <Input
              id="listName"
              placeholder="Ex: Clientes 2024"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="listDesc">Descrição (opcional)</Label>
            <Textarea
              id="listDesc"
              placeholder="Descrição da lista..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fileUpload">Arquivo CSV *</Label>
            <Input
              id="fileUpload"
              type="file"
              accept=".csv,.txt"
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
            <Users className="h-5 w-5" />
            Listas Disponíveis ({lists.length})
          </CardTitle>
          <CardDescription>
            Gerencie suas listas de contatos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : lists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma lista cadastrada ainda
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {lists.map((list) => (
                <Card key={list.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{list.nome}</h4>
                        {list.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {list.descricao}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                          {list.total_contatos} contatos
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir lista?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Todos os contatos
                              desta lista serão removidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteList(list.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
