import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, ListPlus, MessageSquare, Settings, Play } from 'lucide-react';
import { useContactLists } from '@/hooks/useContactLists';
import { useBroadcastMessages } from '@/hooks/useBroadcastMessages';
import { useBroadcastCampaigns } from '@/hooks/useBroadcastCampaigns';
import { ContactListsManager } from './broadcast/ContactListsManager';
import { BroadcastMessagesManager } from './broadcast/BroadcastMessagesManager';
import { BroadcastConfigPanel } from './broadcast/BroadcastConfigPanel';
import { InstanceSelector } from './broadcast/InstanceSelector';

export const DisparoTab = () => {
  const [activeSubTab, setActiveSubTab] = useState('listas');
  
  const contactLists = useContactLists();
  const broadcastMessages = useBroadcastMessages();
  const campaigns = useBroadcastCampaigns();

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
        <TabsList className="grid w-full grid-cols-4">
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
      </Tabs>
    </div>
  );
};
