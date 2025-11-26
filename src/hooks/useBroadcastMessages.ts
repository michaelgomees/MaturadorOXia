import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BroadcastMessage {
  id: string;
  nome: string;
  mensagens: any; // JSONB type
  total_mensagens: number;
  is_active: boolean;
  created_at: string;
}

export const useBroadcastMessages = () => {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_broadcast_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar mensagens:', error);
      toast({
        title: 'Erro ao carregar mensagens',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadMessageFile = async (file: File, nome: string): Promise<boolean> => {
    try {
      const content = await file.text();
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (lines.length === 0) {
        toast({
          title: 'Arquivo vazio',
          description: 'O arquivo não contém mensagens válidas',
          variant: 'destructive',
        });
        return false;
      }

      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      if (!userId) {
        toast({
          title: 'Erro de autenticação',
          description: 'Usuário não autenticado',
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase
        .from('saas_broadcast_messages')
        .insert({
          usuario_id: userId,
          nome,
          mensagens: lines,
          total_mensagens: lines.length,
        });

      if (error) throw error;

      toast({
        title: 'Mensagens carregadas',
        description: `${lines.length} mensagens adicionadas com sucesso`,
      });

      await loadMessages();
      return true;
    } catch (error: any) {
      console.error('Erro ao fazer upload das mensagens:', error);
      toast({
        title: 'Erro ao carregar mensagens',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteMessageFile = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('saas_broadcast_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Mensagens excluídas',
        description: 'Arquivo de mensagens removido com sucesso',
      });

      await loadMessages();
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir mensagens:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleMessageFile = async (id: string): Promise<boolean> => {
    try {
      const message = messages.find(m => m.id === id);
      if (!message) return false;

      const { error } = await supabase
        .from('saas_broadcast_messages')
        .update({ is_active: !message.is_active })
        .eq('id', id);

      if (error) throw error;

      await loadMessages();
      return true;
    } catch (error: any) {
      console.error('Erro ao alternar status:', error);
      return false;
    }
  };

  const downloadTemplate = () => {
    const template = `Olá! Como posso ajudar você hoje?
Obrigado por entrar em contato conosco.
Temos uma oferta especial para você!`;
    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-mensagens.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadMessages();
  }, []);

  return {
    messages,
    loading,
    uploadMessageFile,
    deleteMessageFile,
    toggleMessageFile,
    downloadTemplate,
    loadMessages,
  };
};
