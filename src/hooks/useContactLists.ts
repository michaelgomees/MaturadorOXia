import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Contact {
  id: string;
  lista_id: string;
  nome?: string;
  telefone: string;
  variavel1?: string;
  variavel2?: string;
  variavel3?: string;
}

export interface ContactList {
  id: string;
  nome: string;
  descricao?: string;
  total_contatos: number;
  created_at: string;
}

export const useContactLists = () => {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadLists = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_contact_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLists(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar listas:', error);
      toast({
        title: 'Erro ao carregar listas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadContactList = async (file: File, nome: string, descricao?: string): Promise<boolean> => {
    try {
      const content = await file.text();
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        toast({
          title: 'Arquivo vazio',
          description: 'O arquivo não contém contatos válidos',
          variant: 'destructive',
        });
        return false;
      }

      // Parse CSV: nome,telefone,variavel1,variavel2,variavel3
      const contacts: Omit<Contact, 'id' | 'lista_id'>[] = [];
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        const contact: any = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            contact[header] = values[index];
          }
        });

        if (contact.telefone) {
          // Limpar telefone: remover caracteres não numéricos
          contact.telefone = contact.telefone.replace(/\D/g, '');
          contacts.push(contact);
        }
      }

      if (contacts.length === 0) {
        toast({
          title: 'Nenhum contato válido',
          description: 'Verifique se o arquivo possui a coluna "telefone"',
          variant: 'destructive',
        });
        return false;
      }

      // Criar lista
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

      const { data: listData, error: listError } = await supabase
        .from('saas_contact_lists')
        .insert({
          usuario_id: userId,
          nome,
          descricao,
          total_contatos: contacts.length,
        })
        .select()
        .single();

      if (listError) throw listError;

      // Inserir contatos
      const contactsToInsert = contacts.map(c => ({
        ...c,
        lista_id: listData.id,
        usuario_id: userId,
      }));

      const { error: contactsError } = await supabase
        .from('saas_contacts')
        .insert(contactsToInsert);

      if (contactsError) throw contactsError;

      toast({
        title: 'Lista criada com sucesso',
        description: `${contacts.length} contatos adicionados`,
      });

      await loadLists();
      return true;
    } catch (error: any) {
      console.error('Erro ao fazer upload da lista:', error);
      toast({
        title: 'Erro ao criar lista',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteList = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('saas_contact_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Lista excluída',
        description: 'Lista de contatos removida com sucesso',
      });

      await loadLists();
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir lista:', error);
      toast({
        title: 'Erro ao excluir lista',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const downloadTemplate = () => {
    const template = 'nome,telefone,variavel1,variavel2,variavel3\nJoão Silva,5511999999999,Var1,Var2,Var3\nMaria Santos,5511888888888,Var1,Var2,Var3';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-contatos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadLists();
  }, []);

  return {
    lists,
    loading,
    uploadContactList,
    deleteList,
    downloadTemplate,
    loadLists,
  };
};
