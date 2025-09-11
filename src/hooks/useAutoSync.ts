import { useEffect, useCallback } from 'react';
import { useConnections } from '@/contexts/ConnectionsContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook para sincronização automática de dados do WhatsApp
 * Busca automaticamente foto e número quando uma conexão se torna ativa
 */
export const useAutoSync = () => {
  const { connections, syncWithEvolutionAPI } = useConnections();
  const { toast } = useToast();

  // Função para detectar mudanças de status e sincronizar automaticamente
  const handleAutoSync = useCallback(async (connectionId: string) => {
    try {
      console.log('🔄 Iniciando sincronização automática para conexão:', connectionId);
      const connection = connections.find(c => c.id === connectionId);
      
      await syncWithEvolutionAPI(connectionId);
      
      // Verificar se obtivemos dados novos após a sincronização
      const updatedConnection = connections.find(c => c.id === connectionId);
      if (updatedConnection && connection) {
        const gotNewData = 
          (updatedConnection.avatar && !connection.avatar) ||
          (updatedConnection.displayName && !connection.displayName) ||
          (updatedConnection.phone && updatedConnection.phone !== connection.phone);
          
        if (gotNewData) {
          toast({
            title: "📱 Dados obtidos automaticamente!",
            description: `${updatedConnection.name}: ${updatedConnection.displayName ? 'Nome' : ''}${updatedConnection.avatar ? ' + Foto' : ''}${updatedConnection.phone ? ' + Telefone' : ''} sincronizado(s).`,
          });
        }
      }
    } catch (error) {
      console.error('❌ Erro na sincronização automática:', error);
    }
  }, [syncWithEvolutionAPI, connections, toast]);

  // Monitor para conexões que ficaram ativas recentemente - PARAR LOOP INFINITO
  useEffect(() => {
    console.log('🔍 Verificando conexões para auto-sync:', connections.length);
    
    // Filtrar conexões que realmente precisam de sincronização (sem dados essenciais)
    const connectionsNeedingSync = connections.filter(conn => {
      const isActive = conn.status === 'active' && conn.isActive;
      const missingCriticalData = !conn.displayName || !conn.phone;
      const notRecentlySynced = !conn.lastSync || 
        (new Date().getTime() - new Date(conn.lastSync).getTime()) > 30000; // 30 segundos
      
      console.log(`📊 Conexão ${conn.name}:`, {
        status: conn.status,
        isActive: conn.isActive,
        displayName: !!conn.displayName,
        phone: !!conn.phone,
        needsSync: isActive && missingCriticalData && notRecentlySynced,
        lastSync: conn.lastSync
      });
      
      return isActive && missingCriticalData && notRecentlySynced;
    });

    // Só sincronizar se realmente precisar e não tiver sido sincronizado recentemente
    if (connectionsNeedingSync.length > 0) {
      const timer = setTimeout(() => {
        connectionsNeedingSync.forEach(connection => {
          console.log(`📊 Sincronização necessária para ${connection.name}`);
          handleAutoSync(connection.id);
        });
      }, 2000); // Debounce de 2 segundos

      return () => clearTimeout(timer);
    }
  }, [connections.filter(c => c.status === 'active' && (!c.displayName || !c.phone)).length, handleAutoSync]);

  // Função para forçar sincronização de uma conexão específica
  const forceSyncConnection = useCallback(async (connectionId: string) => {
    await handleAutoSync(connectionId);
  }, [handleAutoSync]);

  return {
    forceSyncConnection
  };
};