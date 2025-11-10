import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppConnection {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'connecting' | 'error' | 'pending';
  qrCode?: string;
  lastActive: string;
  phone?: string;
  evolutionInstanceName?: string;
  evolutionInstanceId?: string;
  isActive: boolean;
  conversationsCount: number;
  aiModel?: string;
  avatar?: string;
  displayName?: string;
  lastSync?: string;
  prompt?: string;
}

interface ConnectionsContextType {
  connections: WhatsAppConnection[];
  activeConnectionsCount: number;
  addConnection: (connection: Omit<WhatsAppConnection, 'id' | 'lastActive'>) => Promise<WhatsAppConnection>;
  updateConnection: (id: string, updates: Partial<WhatsAppConnection>) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  getConnection: (id: string) => WhatsAppConnection | undefined;
  syncWithEvolutionAPI: (connectionId: string) => Promise<void>;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (!context) {
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
};

export const ConnectionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);

  // Carregar conexões do Supabase
  useEffect(() => {
    loadConnectionsFromSupabase();
  }, []);

  const loadConnectionsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_conexoes')
        .select('*')
        .in('status', ['ativo', 'inativo']);

      if (error) {
        console.error('Erro ao carregar conexões:', error);
        return;
      }

  const formattedConnections: WhatsAppConnection[] = data.map((conn: any) => ({
    id: conn.id,
    name: conn.nome,
    status: conn.status === 'ativo' ? 'active' : 'inactive',
    qrCode: conn.qr_code,
    lastActive: conn.updated_at,
    phone: conn.telefone,
    evolutionInstanceName: conn.evolution_instance_name,
    evolutionInstanceId: conn.evolution_instance_id,
    isActive: conn.status === 'ativo',
    conversationsCount: conn.conversas_count || 0,
    aiModel: conn.modelo_ia || 'ChatGPT',
    avatar: conn.avatar_url,
    displayName: conn.display_name,
    lastSync: conn.last_sync,
    prompt: conn.prompt
  }));

      setConnections(formattedConnections);
    } catch (error) {
      console.error('Erro ao carregar conexões:', error);
    }
  };

  const saveConnectionToSupabase = async (connection: WhatsAppConnection, isUpdate = false) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const connectionData = {
        nome: connection.name,
        status: connection.status === 'active' ? 'ativo' : 'inativo',
        qr_code: connection.qrCode,
        telefone: connection.phone,
        evolution_instance_name: connection.evolutionInstanceName,
        evolution_instance_id: connection.evolutionInstanceId,
        conversas_count: connection.conversationsCount,
        modelo_ia: connection.aiModel,
        avatar_url: connection.avatar,
        display_name: connection.displayName,
        last_sync: new Date().toISOString(),
        config: {},
        usuario_id: user?.id || null,
        prompt: connection.prompt
      };

      console.log(`💾 Salvando no Supabase (${isUpdate ? 'update' : 'insert'}):`, {
        connectionName: connection.name,
        status: connectionData.status,
        avatar_url: !!connectionData.avatar_url,
        display_name: connectionData.display_name,
        telefone: connectionData.telefone
      });

      if (isUpdate) {
        const { error } = await supabase
          .from('saas_conexoes')
          .update(connectionData)
          .eq('id', connection.id);

        if (error) {
          console.error('Erro ao atualizar conexão:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('saas_conexoes')
          .insert(connectionData);

        if (error) {
          console.error('Erro ao salvar conexão:', error);
          throw error;
        }
      }
      
      // Recarregar conexões do Supabase
      await loadConnectionsFromSupabase();
    } catch (error) {
      console.error('Erro ao salvar no Supabase:', error);
      throw error;
    }
  };

  const addConnection = async (connectionData: Omit<WhatsAppConnection, 'id' | 'lastActive'>): Promise<WhatsAppConnection> => {
    const newConnection: WhatsAppConnection = {
      ...connectionData,
      id: crypto.randomUUID(),
      lastActive: new Date().toISOString(),
      phone: connectionData.phone || `+5511${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      evolutionInstanceName: connectionData.name.toLowerCase().replace(/\s+/g, '_'),
      conversationsCount: 0,
      aiModel: connectionData.aiModel || 'ChatGPT',
      status: 'connecting'
    };

    try {
      // Salvar no Supabase primeiro
      await saveConnectionToSupabase(newConnection);
      
      // Tentar criar instância na Evolution API se estiver configurada
      try {
        await createEvolutionInstance(newConnection);
        // Se chegou aqui, significa que foi criada com sucesso
        newConnection.status = 'active';
        newConnection.isActive = true;
        await saveConnectionToSupabase(newConnection, true);
      } catch (error) {
        console.warn('Erro ao criar instância Evolution:', error);
        // Manter status como inactive quando falha na Evolution API
        newConnection.status = 'inactive';
        newConnection.isActive = false;
        await saveConnectionToSupabase(newConnection, true);
      }
      
      return newConnection;
    } catch (error) {
      console.error('Erro ao criar conexão:', error);
      throw error;
    }
  };

  const updateConnection = async (id: string, updates: Partial<WhatsAppConnection>) => {
    const connection = connections.find(conn => conn.id === id);
    if (!connection) {
      console.warn(`❌ Conexão ${id} não encontrada para atualização`);
      return;
    }

    console.log(`🔄 Atualizando conexão ${connection.name}:`, {
      before: {
        status: connection.status,
        avatar: !!connection.avatar,
        displayName: connection.displayName,
        phone: connection.phone
      },
      updates: {
        status: updates.status,
        avatar: !!updates.avatar,
        displayName: updates.displayName,
        phone: updates.phone
      }
    });

    const updatedConnection = { 
      ...connection, 
      ...updates, 
      lastActive: new Date().toISOString() 
    };

    // Atualizar estado local
    setConnections(prev => prev.map(conn =>
      conn.id === id ? updatedConnection : conn
    ));

    try {
      // Salvar no Supabase
      await saveConnectionToSupabase(updatedConnection, true);
      console.log(`✅ Conexão ${connection.name} atualizada com sucesso no Supabase`);
    } catch (error) {
      console.error(`❌ Erro ao atualizar conexão ${connection.name}:`, error);
    }
  };

  const deleteConnection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saas_conexoes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar conexão:', error);
        throw error;
      }

      // Atualizar estado local
      setConnections(prev => prev.filter(conn => conn.id !== id));
    } catch (error) {
      console.error('Erro ao deletar conexão:', error);
      throw error;
    }
  };

  const getConnection = (id: string) => {
    return connections.find(conn => conn.id === id);
  };

  const createEvolutionInstance = async (connection: WhatsAppConnection): Promise<void> => {
    try {
      console.log(`Creating Evolution API instance: ${connection.evolutionInstanceName}`);
      
      // Chamar Edge Function (agora usa credenciais dos Supabase Secrets)
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          instanceName: connection.evolutionInstanceName,
          connectionName: connection.name
        }
      });

      console.log('📥 Edge function response:', { data, error });

      if (error) {
        console.error('Erro na Edge Function:', error);
        throw new Error(`Erro na Edge Function: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('Falha na criação da instância:', data?.error);
        throw new Error(data?.error || 'Falha na criação da instância na Evolution API');
      }

      console.log('Instância criada com sucesso:', data);

      // Atualizar conexão com dados da Evolution API
      connection.qrCode = data.qrCode;
      connection.evolutionInstanceId = data.instanceName;
      
      return data;

    } catch (error) {
      console.error('Erro ao criar instância Evolution:', error);
      throw error;
    }
  };

  const syncWithEvolutionAPI = async (connectionId: string): Promise<void> => {
    const connection = getConnection(connectionId);
    if (!connection) return;

    try {
      console.log('🔄 Iniciando sincronização automática com Evolution API para:', connection.name);
      
      // Atualizar status para conectando
      await updateConnection(connectionId, {
        status: 'connecting'
      });

      // Garantir que a conexão tenha um evolutionInstanceName
      const instanceName = connection.evolutionInstanceName || connection.name.toLowerCase().replace(/\s+/g, '_');
      
      // Se não tinha instanceName, atualizar primeiro
      if (!connection.evolutionInstanceName) {
        await updateConnection(connectionId, {
          evolutionInstanceName: instanceName
        });
      }

      // Buscar dados da instância na Evolution API usando nossa edge function
      const response = await fetch(`https://rltkxwswlvuzwmmbqwkr.supabase.co/functions/v1/evolution-api?instanceName=${instanceName}&action=status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsdGt4d3N3bHZ1endtbWJxd2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzg1MTUsImV4cCI6MjA3MjYxNDUxNX0.CFvBnfnzS7GD8ksbDprZ3sbFE1XHRhtrJJpBUaGCQlM'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Erro na Edge Function:', data);
        throw new Error(`Erro na Edge Function: ${response.statusText}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Falha ao buscar dados da Evolution API');
      }

      console.log('📥 Dados da instância obtidos automaticamente:', data);

      // Extrair informações da instância
      const updateData: any = {
        lastActive: new Date().toISOString()
      };

      // Se tem QR code, ainda não está conectado
      if (data.qrCode) {
        updateData.qrCode = data.qrCode;
        updateData.status = 'pending';
        updateData.isActive = false;
        console.log('📱 QR Code disponível - aguardando conexão');
      }

      // Verificar se a instância tem dados válidos mesmo com desconexão
      const hasValidProfileData = data.instance && (
        data.instance.ownerJid || 
        data.instance.profileName || 
        data.instance.profilePicUrl
      );

      // Se a instância está conectada OU tem dados válidos de perfil
      if (data.instance && (
        (data.instance.connectionStatus === 'open' && !data.instance.disconnectionReasonCode) ||
        (hasValidProfileData && data.instance.connectionStatus === 'open')
      )) {
        updateData.status = 'active';
        updateData.isActive = true;
        updateData.qrCode = null; // Limpar QR quando conectado
        
        console.log('✅ WhatsApp conectado - buscando dados do perfil...', {
          ownerJid: data.instance.ownerJid,
          profileName: data.instance.profileName,
          profilePicUrl: data.instance.profilePicUrl,
          disconnectionReasonCode: data.instance.disconnectionReasonCode
        });
        
        // Buscar dados automáticos do perfil da resposta direta
        if (data.profilePicture) {
          updateData.avatar = data.profilePicture;
          console.log('🖼️ Foto de perfil obtida automaticamente');
        }
        
        if (data.phoneNumber) {
          updateData.phone = data.phoneNumber;
          console.log('📞 Número de telefone obtido automaticamente:', data.phoneNumber);
        }
        
        if (data.displayName) {
          updateData.displayName = data.displayName;
          console.log('👤 Nome de exibição obtido automaticamente:', data.displayName);
        }

        // Buscar informações da instância diretamente (prioridade)
        if (data.instance.profilePicUrl) {
          updateData.avatar = data.instance.profilePicUrl;
          console.log('🖼️ Foto extraída da instância:', data.instance.profilePicUrl);
        }

        // Extrair número do ownerJid (prioridade)
        if (data.instance.ownerJid) {
          updateData.phone = data.instance.ownerJid.replace('@s.whatsapp.net', '');
          console.log('📞 Número extraído do ownerJid:', updateData.phone);
        }

        // Usar profileName da instância (prioridade)
        if (data.instance.profileName) {
          updateData.displayName = data.instance.profileName;
          console.log('👤 Nome extraído do profileName:', data.instance.profileName);
        }
      } else if (data.instance && data.instance.connectionStatus === 'connecting') {
        updateData.status = 'connecting';
        updateData.isActive = false;
        console.log('🔄 WhatsApp conectando...');

        // Mesmo conectando, se temos dados, vamos mantê-los
        if (hasValidProfileData) {
          if (data.instance.profilePicUrl) {
            updateData.avatar = data.instance.profilePicUrl;
          }
          if (data.instance.ownerJid) {
            updateData.phone = data.instance.ownerJid.replace('@s.whatsapp.net', '');
          }
          if (data.instance.profileName) {
            updateData.displayName = data.instance.profileName;
          }
        }
      } else if (data.instance && data.instance.disconnectionReasonCode && data.instance.connectionStatus !== 'open') {
        // Instância desconectada, precisa reconectar, mas manter dados se disponíveis
        updateData.status = 'inactive';
        updateData.isActive = false;
        console.log('⚠️ WhatsApp desconectado - precisa reconectar. Status:', data.instance.connectionStatus, 'Motivo:', data.instance.disconnectionReasonCode);

        // Manter dados do perfil se disponíveis
        if (hasValidProfileData) {
          if (data.instance.profilePicUrl) {
            updateData.avatar = data.instance.profilePicUrl;
          }
          if (data.instance.ownerJid) {
            updateData.phone = data.instance.ownerJid.replace('@s.whatsapp.net', '');
          }
          if (data.instance.profileName) {
            updateData.displayName = data.instance.profileName;
          }
        }
      } else {
        updateData.status = 'pending';
        updateData.isActive = false;
        console.log('⏳ WhatsApp não conectado - mantendo status pending');
      }

      // Atualizar conexão com os novos dados obtidos automaticamente
      updateData.lastSync = new Date().toISOString();
      await updateConnection(connectionId, updateData);
      
      console.log('✅ Sincronização automática concluída para:', connection.name);

    } catch (error) {
      console.error('❌ Erro ao sincronizar automaticamente com Evolution API:', error);
      await updateConnection(connectionId, {
        status: 'error'
      });
      throw error;
    }
  };

  const activeConnectionsCount = connections.filter(conn => conn.isActive && conn.status === 'active').length;

  return (
    <ConnectionsContext.Provider value={{
      connections,
      activeConnectionsCount,
      addConnection,
      updateConnection,
      deleteConnection,
      getConnection,
      syncWithEvolutionAPI
    }}>
      {children}
    </ConnectionsContext.Provider>
  );
};