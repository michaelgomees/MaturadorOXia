import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Music, 
  Trash2, 
  Edit, 
  Eye, 
  BarChart3,
  Plus,
  Settings,
  Hash,
  Clock,
  Shuffle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MediaItem {
  id: string;
  type: 'image' | 'link' | 'audio';
  name: string;
  url: string;
  category: string;
  frequency: number;
  mode: string;
  usageCount: number;
  lastUsed: string;
  isActive: boolean;
}

interface DadosConfig {
  maxImagesPerHour: number;
  maxLinksPerConversation: number;
  randomizeSelection: boolean;
  enablePreview: boolean;
}

const CATEGORIES = [
  'Bom dia',
  'Motivação', 
  'Produto',
  'Meme',
  'Aleatório',
  'Técnico',
  'Suporte',
  'Vendas'
];

const FREQUENCY_OPTIONS = [
  { value: 1, label: 'A cada 1 mensagem' },
  { value: 3, label: 'A cada 3 mensagens' },
  { value: 5, label: 'A cada 5 mensagens' },
  { value: 10, label: 'A cada 10 mensagens' },
  { value: 20, label: 'A cada 20 mensagens' }
];

const IMAGE_MODES = [
  { value: 'image_only', label: 'Só imagem' },
  { value: 'image_text', label: 'Imagem + texto' }
];

export const DadosTab = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [config, setConfig] = useState<DadosConfig>({
    maxImagesPerHour: 3,
    maxLinksPerConversation: 5,
    randomizeSelection: true,
    enablePreview: true
  });
  
  const [activeTab, setActiveTab] = useState("images");
  const [newItem, setNewItem] = useState({
    name: '',
    url: '',
    category: '',
    frequency: 5,
    mode: 'image_text'
  });
  
  const { toast } = useToast();

  // Carregar dados do localStorage
  useEffect(() => {
    const savedItems = localStorage.getItem('ox-media-items');
    if (savedItems) {
      setMediaItems(JSON.parse(savedItems));
    }

    const savedConfig = localStorage.getItem('ox-dados-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Salvar dados no localStorage
  const saveItems = (items: MediaItem[]) => {
    setMediaItems(items);
    localStorage.setItem('ox-media-items', JSON.stringify(items));
  };

  const saveConfig = (newConfig: DadosConfig) => {
    setConfig(newConfig);
    localStorage.setItem('ox-dados-config', JSON.stringify(newConfig));
  };

  const handleAddItem = (type: 'image' | 'link' | 'audio') => {
    if (!newItem.name || !newItem.category) {
      toast({
        title: "Erro",
        description: "Preencha nome e categoria.",
        variant: "destructive"
      });
      return;
    }

    if (type === 'link' && !newItem.url) {
      toast({
        title: "Erro", 
        description: "URL é obrigatória para links.",
        variant: "destructive"
      });
      return;
    }

    const item: MediaItem = {
      id: Date.now().toString(),
      type,
      name: newItem.name,
      url: newItem.url || '',
      category: newItem.category,
      frequency: newItem.frequency,
      mode: newItem.mode,
      usageCount: 0,
      lastUsed: '',
      isActive: true
    };

    const updatedItems = [...mediaItems, item];
    saveItems(updatedItems);
    
    setNewItem({ name: '', url: '', category: '', frequency: 5, mode: 'image_text' });
    
    toast({
      title: "Item adicionado",
      description: `${type === 'image' ? 'Imagem' : type === 'link' ? 'Link' : 'Áudio'} "${newItem.name}" foi adicionado.`
    });
  };

  const handleRemoveItem = (id: string) => {
    const updatedItems = mediaItems.filter(item => item.id !== id);
    saveItems(updatedItems);
    
    toast({
      title: "Item removido",
      description: "Item foi removido com sucesso."
    });
  };

  const handleToggleItem = (id: string) => {
    const updatedItems = mediaItems.map(item => 
      item.id === id ? { ...item, isActive: !item.isActive } : item
    );
    saveItems(updatedItems);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Simular upload - em produção, fazer upload real
      const url = URL.createObjectURL(file);
      setNewItem(prev => ({ ...prev, url, name: prev.name || file.name }));
      
      toast({
        title: "Arquivo carregado",
        description: "Arquivo pronto para ser adicionado."
      });
    }
  };

  const getItemsByType = (type: 'image' | 'link' | 'audio') => {
    return mediaItems.filter(item => item.type === type);
  };

  const getTotalUsage = () => {
    return mediaItems.reduce((acc, item) => acc + item.usageCount, 0);
  };

  const getMostUsedCategory = () => {
    const categoryUsage = mediaItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.usageCount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryUsage).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Central de Dados Multimídia</h2>
          <p className="text-muted-foreground">
            Gerencie recursos multimídia para conversas humanizadas dos chips
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            {mediaItems.length} Itens
          </Badge>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            {mediaItems.filter(item => item.isActive).length} Ativos
          </Badge>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <ImageIcon className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Imagens</p>
              <p className="text-2xl font-bold">{getItemsByType('image').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <LinkIcon className="w-8 h-8 text-secondary" />
            <div>
              <p className="text-sm text-muted-foreground">Links</p>
              <p className="text-2xl font-bold">{getItemsByType('link').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <BarChart3 className="w-8 h-8 text-accent" />
            <div>
              <p className="text-sm text-muted-foreground">Usos Totais</p>
              <p className="text-2xl font-bold">{getTotalUsage()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <Hash className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Top Categoria</p>
              <p className="text-lg font-bold">{getMostUsedCategory()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configurações Globais */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Settings className="w-5 h-5 inline mr-2" />
              Configurações Globais
            </CardTitle>
            <CardDescription>
              Controles de frequência e comportamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Máx. imagens por hora</Label>
              <Select 
                value={config.maxImagesPerHour.toString()} 
                onValueChange={(value) => saveConfig({ ...config, maxImagesPerHour: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 imagem</SelectItem>
                  <SelectItem value="3">3 imagens</SelectItem>
                  <SelectItem value="5">5 imagens</SelectItem>
                  <SelectItem value="10">10 imagens</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Máx. links por conversa</Label>
              <Select 
                value={config.maxLinksPerConversation.toString()} 
                onValueChange={(value) => saveConfig({ ...config, maxLinksPerConversation: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 link</SelectItem>
                  <SelectItem value="3">3 links</SelectItem>
                  <SelectItem value="5">5 links</SelectItem>
                  <SelectItem value="10">10 links</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center space-x-2">
              <Switch
                checked={config.randomizeSelection}
                onCheckedChange={(checked) => saveConfig({ ...config, randomizeSelection: checked })}
              />
              <Label>Seleção aleatória</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enablePreview}
                onCheckedChange={(checked) => saveConfig({ ...config, enablePreview: checked })}
              />
              <Label>Habilitar pré-visualização</Label>
            </div>
          </CardContent>
        </Card>

        {/* Adicionar Novo Item */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <Plus className="w-5 h-5 inline mr-2" />
              Adicionar Novo Recurso
            </CardTitle>
            <CardDescription>
              Configure novos recursos multimídia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="images">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Imagens
                </TabsTrigger>
                <TabsTrigger value="links">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Links
                </TabsTrigger>
                <TabsTrigger value="audios">
                  <Music className="w-4 h-4 mr-2" />
                  Áudios
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 space-y-4">
                {/* Campos Comuns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome/Título</Label>
                    <Input
                      placeholder="Nome do recurso"
                      value={newItem.name}
                      onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={newItem.category} onValueChange={(value) => setNewItem(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequência de envio</Label>
                    <Select 
                      value={newItem.frequency.toString()} 
                      onValueChange={(value) => setNewItem(prev => ({ ...prev, frequency: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {activeTab === 'images' && (
                    <div className="space-y-2">
                      <Label>Modo de envio</Label>
                      <Select 
                        value={newItem.mode} 
                        onValueChange={(value) => setNewItem(prev => ({ ...prev, mode: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IMAGE_MODES.map(mode => (
                            <SelectItem key={mode.value} value={mode.value}>
                              {mode.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Campos específicos por tipo */}
                <TabsContent value="images" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Upload de Imagem</Label>
                    <Input
                      type="file"
                      accept=".png,.jpg,.jpeg,.gif,.webp"
                      onChange={handleFileUpload}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formatos: PNG, JPG, GIF, WEBP
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleAddItem('image')}
                    disabled={!newItem.name || !newItem.category}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Adicionar Imagem
                  </Button>
                </TabsContent>

                <TabsContent value="links" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>URL do Link</Label>
                    <Input
                      placeholder="https://exemplo.com"
                      value={newItem.url}
                      onChange={(e) => setNewItem(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch />
                    <Label>Encurtar link automaticamente</Label>
                  </div>
                  <Button 
                    onClick={() => handleAddItem('link')}
                    disabled={!newItem.name || !newItem.category || !newItem.url}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Link
                  </Button>
                </TabsContent>

                <TabsContent value="audios" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Upload de Áudio</Label>
                    <Input
                      type="file"
                      accept=".mp3,.ogg,.wav"
                      onChange={handleFileUpload}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formatos: MP3, OGG, WAV (futuro)
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleAddItem('audio')}
                    disabled={!newItem.name || !newItem.category}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Adicionar Áudio (Em breve)
                  </Button>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Recursos */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos Multimídia ({mediaItems.length})</CardTitle>
          <CardDescription>
            Gerencie seus recursos multimídia e acompanhe estatísticas de uso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mediaItems.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhum recurso configurado</h3>
              <p className="text-sm text-muted-foreground">
                Adicione imagens, links ou áudios para começar
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                {mediaItems.map((item) => (
                  <Card key={item.id} className="border-l-4 border-l-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {item.type === 'image' && <ImageIcon className="w-5 h-5 text-primary" />}
                            {item.type === 'link' && <LinkIcon className="w-5 h-5 text-secondary" />}
                            {item.type === 'audio' && <Music className="w-5 h-5 text-accent" />}
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.category} • A cada {item.frequency} mensagens
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{item.category}</Badge>
                            {item.isActive ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>
                            ) : (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm">
                            <p className="font-medium">{item.usageCount} usos</p>
                            <p className="text-xs text-muted-foreground">
                              {item.lastUsed ? new Date(item.lastUsed).toLocaleDateString('pt-BR') : 'Nunca usado'}
                            </p>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleItem(item.id)}
                          >
                            {item.isActive ? 'Desativar' : 'Ativar'}
                          </Button>
                          
                          {config.enablePreview && (
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};