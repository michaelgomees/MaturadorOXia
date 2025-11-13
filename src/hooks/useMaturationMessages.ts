import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaturationMessage {
  id: string;
  usuario_id: string;
  nome: string;
  descricao?: string;
  tipo_arquivo: 'txt' | 'csv' | 'json';
  mensagens: string[];
  total_mensagens: number;
  categoria: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useMaturationMessages = () => {
  const [messages, setMessages] = useState<MaturationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_maturation_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages((data as MaturationMessage[]) || []);
    } catch (error: any) {
      console.error('Erro ao carregar mensagens:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as mensagens de maturação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const parseFileContent = (content: string, fileType: 'txt' | 'csv' | 'json'): string[] => {
    try {
      switch (fileType) {
        case 'txt':
          // Parse formato [mensagem_1]: texto
          const txtLines = content.split('\n')
            .filter(line => line.trim())
            .map(line => {
              const match = line.match(/\[mensagem_\d+\]:\s*(.+)/);
              return match ? match[1].trim() : line.trim();
            })
            .filter(line => line);
          return txtLines;

        case 'csv':
          // Parse CSV simples (uma mensagem por linha)
          const csvLines = content.split('\n')
            .filter(line => line.trim())
            .map(line => line.trim());
          return csvLines;

        case 'json':
          // Parse JSON array
          const jsonData = JSON.parse(content);
          if (Array.isArray(jsonData)) {
            return jsonData.map(item => 
              typeof item === 'string' ? item : item.mensagem || item.message || JSON.stringify(item)
            );
          }
          return [];

        default:
          return [];
      }
    } catch (error) {
      console.error('Erro ao fazer parse do arquivo:', error);
      return [];
    }
  };

  const uploadMessageFile = async (
    file: File,
    nome: string,
    descricao?: string
  ): Promise<boolean> => {
    try {
      const fileType = file.name.split('.').pop()?.toLowerCase() as 'txt' | 'csv' | 'json';
      
      if (!['txt', 'csv', 'json'].includes(fileType)) {
        toast({
          title: "Erro",
          description: "Formato de arquivo não suportado. Use .txt, .csv ou .json",
          variant: "destructive"
        });
        return false;
      }

      const content = await file.text();
      const parsedMessages = parseFileContent(content, fileType);

      if (parsedMessages.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhuma mensagem válida encontrada no arquivo",
          variant: "destructive"
        });
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('saas_maturation_messages')
        .insert({
          usuario_id: user.id,
          nome,
          descricao,
          tipo_arquivo: fileType,
          mensagens: parsedMessages,
          total_mensagens: parsedMessages.length,
          categoria: 'maturacao',
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${parsedMessages.length} mensagens importadas com sucesso!`
      });

      await loadMessages();
      return true;
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload do arquivo",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteMessageFile = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('saas_maturation_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Arquivo de mensagens removido"
      });

      await loadMessages();
      return true;
    } catch (error: any) {
      console.error('Erro ao deletar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o arquivo",
        variant: "destructive"
      });
      return false;
    }
  };

  const toggleMessageFile = async (id: string): Promise<boolean> => {
    try {
      const message = messages.find(m => m.id === id);
      if (!message) return false;

      const { error } = await supabase
        .from('saas_maturation_messages')
        .update({ is_active: !message.is_active })
        .eq('id', id);

      if (error) throw error;

      await loadMessages();
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar:', error);
      return false;
    }
  };

  const downloadExampleFile = () => {
    const exampleContent = `[mensagem_1]: Olá! Como você está hoje?
[mensagem_2]: Tudo bem, obrigado! E você?
[mensagem_3]: Estou ótimo! Vamos conversar um pouco?
[mensagem_4]: Claro! Sobre o que você gostaria de falar?
[mensagem_5]: Que tal falarmos sobre o clima?
[mensagem_6]: Boa ideia! Hoje está um dia lindo.
[mensagem_7]: Verdade! Perfeito para sair.
[mensagem_8]: Com certeza! Até logo!`;

    const blob = new Blob([exampleContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mensagens_maturacao_exemplo.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download iniciado",
      description: "Arquivo de exemplo baixado com sucesso"
    });
  };

  return {
    messages,
    loading,
    uploadMessageFile,
    deleteMessageFile,
    toggleMessageFile,
    downloadExampleFile,
    loadMessages
  };
};