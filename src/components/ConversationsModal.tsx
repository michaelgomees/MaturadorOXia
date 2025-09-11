import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Clock, User, Bot, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chipId: string;
  chipName: string;
}

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  status: 'active' | 'finished' | 'waiting';
  messageCount: number;
  startedAt: string;
}

interface Message {
  id: string;
  sender: 'user' | 'chip';
  content: string;
  timestamp: string;
  delivered: boolean;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    contactName: "João Silva",
    contactPhone: "+5511987654321",
    lastMessage: "Obrigado pela ajuda!",
    lastMessageTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    status: "finished",
    messageCount: 12,
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: "2", 
    contactName: "Maria Santos",
    contactPhone: "+5511876543210",
    lastMessage: "Aguardando mais informações...",
    lastMessageTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    status: "active",
    messageCount: 8,
    startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: "3",
    contactName: "Pedro Costa",
    contactPhone: "+5511765432109",
    lastMessage: "Posso fazer o pedido?",
    lastMessageTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    status: "waiting",
    messageCount: 3,
    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  }
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  "1": [
    {
      id: "msg1",
      sender: "user",
      content: "Olá, preciso de ajuda com o produto",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      delivered: true
    },
    {
      id: "msg2",
      sender: "chip",
      content: "Olá! Claro, ficarei feliz em ajudá-lo. Pode me contar mais detalhes sobre o que você precisa?",
      timestamp: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
      delivered: true
    },
    {
      id: "msg3",
      sender: "user",
      content: "Obrigado pela ajuda!",
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      delivered: true
    }
  ]
};

export const ConversationsModal = ({ open, onOpenChange, chipId, chipName }: ConversationsModalProps) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);

  const getStatusBadge = (status: Conversation['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativa</Badge>;
      case 'waiting':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Aguardando</Badge>;
      default:
        return <Badge variant="secondary">Finalizada</Badge>;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const time = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Agora mesmo";
    if (diffMinutes < 60) return `${diffMinutes} min atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    return format(time, "dd/MM HH:mm", { locale: ptBR });
  };

  const selectedMessages = selectedConversation ? MOCK_MESSAGES[selectedConversation] || [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Conversas do Chip: {chipName}
          </DialogTitle>
          <DialogDescription>
            Histórico e gerenciamento de conversas ativas
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[60vh] gap-4">
          {/* Lista de Conversas */}
          <div className="w-1/3 border-r pr-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Conversas ({conversations.length})</h3>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">
                  {conversations.filter(c => c.status === 'active').length} ativas
                </span>
              </div>
            </div>
            
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 ${
                      selectedConversation === conversation.id ? 'bg-muted border-primary' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{conversation.contactName}</p>
                        <p className="text-xs text-muted-foreground">{conversation.contactPhone}</p>
                      </div>
                      {getStatusBadge(conversation.status)}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {conversation.lastMessage}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {conversation.messageCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(conversation.lastMessageTime)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Detalhes da Conversa */}
          <div className="flex-1">
            {selectedConversation ? (
              <div className="h-full flex flex-col">
                <div className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {conversations.find(c => c.id === selectedConversation)?.contactName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {conversations.find(c => c.id === selectedConversation)?.contactPhone}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir WhatsApp
                    </Button>
                  </div>
                  <Separator className="mt-3" />
                </div>
                
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {selectedMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'chip' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.sender === 'chip'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.sender === 'chip' ? (
                              <Bot className="w-3 h-3" />
                            ) : (
                              <User className="w-3 h-3" />
                            )}
                            <span className="text-xs opacity-80">
                              {message.sender === 'chip' ? chipName : 'Cliente'}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-60 mt-1">
                            {format(new Date(message.timestamp), "HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione uma conversa para ver os detalhes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};