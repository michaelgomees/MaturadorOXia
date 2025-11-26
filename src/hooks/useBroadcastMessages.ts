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
      const lines = content.split('\n');

      // Parser para mensagens numeradas (formato: 1., 2., 3., etc.)
      const messages: string[] = [];
      let currentMessage = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Verifica se é o início de uma nova mensagem (formato: número seguido de ponto)
        if (/^\d+\.$/.test(trimmedLine)) {
          // Se já tem uma mensagem em construção, salva ela
          if (currentMessage.trim()) {
            messages.push(currentMessage.trim());
          }
          currentMessage = '';
        } else if (trimmedLine) {
          // Adiciona linha à mensagem atual
          currentMessage += (currentMessage ? '\n' : '') + trimmedLine;
        }
      }
      
      // Adiciona a última mensagem se houver
      if (currentMessage.trim()) {
        messages.push(currentMessage.trim());
      }

      if (messages.length === 0) {
        toast({
          title: 'Arquivo vazio',
          description: 'O arquivo não contém mensagens válidas no formato numerado (1., 2., 3., etc.)',
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
          mensagens: messages,
          total_mensagens: messages.length,
        });

      if (error) throw error;

      toast({
        title: 'Mensagens carregadas',
        description: `${messages.length} mensagens adicionadas com sucesso`,
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
    const template = `1.
<saudacao> <nome>
💳 Sua *linha de crédito pré-aprovada* já está liberada!
💳 Responda *SIM* para consultar.
❌ Se não tiver interesse, responda *NÃO*.
🚫 Para sair, digite *SAIR*.

2.
<saudacao> <nome>
📊 Descubra o valor da sua *linha de crédito* agora mesmo!
💳 Responda *SIM* para consultar.
❌ Se não tiver interesse, responda *NÃO*.
🚫 Para sair, digite *SAIR*.

3.
<saudacao> <nome>
⚡ Uma oportunidade exclusiva: *crédito pré-aprovado* disponível!
💳 Responda *SIM* para consultar.
❌ Se não tiver interesse, responda *NÃO*.
🚫 Para sair, digite *SAIR*.`;
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
