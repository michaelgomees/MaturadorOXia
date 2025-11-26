import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, ListPlus, MessageSquare, Settings, Play, FileText } from 'lucide-react';
import { useContactLists } from '@/hooks/useContactLists';
import { useBroadcastMessages } from '@/hooks/useBroadcastMessages';
import { useBroadcastCampaigns } from '@/hooks/useBroadcastCampaigns';
import { useBroadcastQueue } from '@/hooks/useBroadcastQueue';
import { ContactListsManager } from './broadcast/ContactListsManager';
import { BroadcastMessagesManager } from './broadcast/BroadcastMessagesManager';
import { BroadcastConfigPanel } from './broadcast/BroadcastConfigPanel';
import { InstanceSelector } from './broadcast/InstanceSelector';
import { BroadcastLogsPanel } from './broadcast/BroadcastLogsPanel';
import { BroadcastCampaignsManager } from './broadcast/BroadcastCampaignsManager';

export const DisparoTab = () => {
  const [activeSubTab, setActiveSubTab] = useState('listas');
  
  const contactLists = useContactLists();
  const broadcastMessages = useBroadcastMessages();
  const campaigns = useBroadcastCampaigns();
  
  // Processar fila de broadcast automaticamente
  useBroadcastQueue();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Disparo em Massa</h2>
          <p className="text-muted-foreground mt-1">
            Sistema inteligente de disparo com proteção anti-banimento
          </p>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="listas" className="gap-2">
            <ListPlus className="h-4 w-4" />
            Listas de Contatos
          </TabsTrigger>
          <TabsTrigger value="mensagens" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="instancias" className="gap-2">
            <Settings className="h-4 w-4" />
            Instâncias
          </TabsTrigger>
          <TabsTrigger value="disparar" className="gap-2">
            <Play className="h-4 w-4" />
            Configurar & Disparar
          </TabsTrigger>
          <TabsTrigger value="campanhas" className="gap-2">
            <Settings className="h-4 w-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listas" className="space-y-4">
          <ContactListsManager {...contactLists} />
        </TabsContent>

        <TabsContent value="mensagens" className="space-y-4">
          <BroadcastMessagesManager {...broadcastMessages} />
        </TabsContent>

        <TabsContent value="instancias" className="space-y-4">
          <InstanceSelector />
        </TabsContent>

        <TabsContent value="disparar" className="space-y-4">
          <BroadcastConfigPanel
            contactLists={contactLists.lists}
            messageFiles={broadcastMessages.messages}
            campaigns={campaigns}
          />
        </TabsContent>

        <TabsContent value="campanhas" className="space-y-4">
          <BroadcastCampaignsManager />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <BroadcastLogsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
