import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

export interface ChipHistory {
  id: string;
  timestamp: Date;
  event: 'started' | 'paused' | 'resumed' | 'message_sent' | 'connection_test' | 'error';
  details?: string;
}

export interface ChipMonitoring {
  id: string;
  maturationPercentage: number;
  maturationStatus: 'heating' | 'ready' | 'active' | 'cooling';
  startDate: Date;
  lastActivity: Date;
  totalMessages: number;
  connectionStatus: 'online' | 'offline' | 'testing';
  lastConnectionTest?: Date;
  isBlocked: boolean;
  errorCount: number;
}

export interface Alert {
  id: string;
  chipId: string;
  chipName: string;
  type: 'connection_failed' | 'blocked' | 'inactive' | 'error';
  message: string;
  timestamp: Date;
  isRead: boolean;
}

export const useChipMonitoring = () => {
  const [monitoring, setMonitoring] = useState<ChipMonitoring[]>([]);
  const [history, setHistory] = useState<ChipHistory[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { toast } = useToast();

  // Carregar dados do localStorage
  useEffect(() => {
    const savedMonitoring = localStorage.getItem('ox-chip-monitoring');
    const savedHistory = localStorage.getItem('ox-chip-history');
    const savedAlerts = localStorage.getItem('ox-chip-alerts');

    if (savedMonitoring) {
      const data = JSON.parse(savedMonitoring);
      setMonitoring(data.map((item: any) => ({
        ...item,
        startDate: new Date(item.startDate),
        lastActivity: new Date(item.lastActivity),
        lastConnectionTest: item.lastConnectionTest ? new Date(item.lastConnectionTest) : undefined
      })));
    }

    if (savedHistory) {
      const data = JSON.parse(savedHistory);
      setHistory(data.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })));
    }

    if (savedAlerts) {
      const data = JSON.parse(savedAlerts);
      setAlerts(data.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })));
    }
  }, []);

  // Salvar no localStorage quando dados mudarem
  useEffect(() => {
    localStorage.setItem('ox-chip-monitoring', JSON.stringify(monitoring));
  }, [monitoring]);

  useEffect(() => {
    localStorage.setItem('ox-chip-history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('ox-chip-alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Inicializar monitoramento para um novo chip
  const initializeChip = useCallback((chipId: string) => {
    setMonitoring(prev => {
      const existing = prev.find(m => m.id === chipId);
      if (existing) return prev;

      const newMonitoring: ChipMonitoring = {
        id: chipId,
        maturationPercentage: Math.floor(Math.random() * 100),
        maturationStatus: 'heating',
        startDate: new Date(),
        lastActivity: new Date(),
        totalMessages: 0,
        connectionStatus: 'online',
        isBlocked: false,
        errorCount: 0
      };

      return [...prev, newMonitoring];
    });

    addHistoryEntry(chipId, 'started', 'Chip inicializado');
  }, []);

  // Adicionar entrada no histórico
  const addHistoryEntry = useCallback((chipId: string, event: ChipHistory['event'], details?: string) => {
    const newEntry: ChipHistory = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      event,
      details
    };

    setHistory(prev => [newEntry, ...prev].slice(0, 1000)); // Manter apenas os últimos 1000 registros
  }, []);

  // Testar conexão do chip
  const testConnection = useCallback(async (chipId: string): Promise<boolean> => {
    setMonitoring(prev => prev.map(m => 
      m.id === chipId ? { ...m, connectionStatus: 'testing' } : m
    ));

    // Simular teste de conexão
    await new Promise(resolve => setTimeout(resolve, 2000));

    const isOnline = Math.random() > 0.2; // 80% de chance de estar online
    const isBlocked = !isOnline && Math.random() > 0.5;

    setMonitoring(prev => prev.map(m => 
      m.id === chipId ? { 
        ...m, 
        connectionStatus: isOnline ? 'online' : 'offline',
        lastConnectionTest: new Date(),
        isBlocked,
        errorCount: isOnline ? 0 : m.errorCount + 1
      } : m
    ));

    addHistoryEntry(chipId, 'connection_test', `Status: ${isOnline ? 'Online' : 'Offline'}${isBlocked ? ' (Bloqueado)' : ''}`);

    if (!isOnline) {
      const chipConfigs = localStorage.getItem('ox-chip-configs');
      let chipName = 'Chip';
      if (chipConfigs) {
        const configs = JSON.parse(chipConfigs);
        const config = configs.find((c: any) => c.id === chipId);
        chipName = config?.name || chipName;
      }

      createAlert(chipId, chipName, isBlocked ? 'blocked' : 'connection_failed', 
        isBlocked ? 'Chip foi bloqueado' : 'Falha na conexão com o chip');
    }

    return isOnline;
  }, [addHistoryEntry]);

  // Criar alerta
  const createAlert = useCallback((chipId: string, chipName: string, type: Alert['type'], message: string) => {
    const newAlert: Alert = {
      id: crypto.randomUUID(),
      chipId,
      chipName,
      type,
      message,
      timestamp: new Date(),
      isRead: false
    };

    setAlerts(prev => [newAlert, ...prev]);

    // Mostrar toast de alerta
    toast({
      title: "⚠️ Alerta do Sistema",
      description: `${chipName}: ${message}`,
      variant: "destructive"
    });
  }, [toast]);

  // Marcar alerta como lido
  const markAlertAsRead = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  }, []);

  // Simular atividade do chip
  const simulateChipActivity = useCallback((chipId: string) => {
    setMonitoring(prev => prev.map(m => {
      if (m.id !== chipId) return m;

      const newMessages = m.totalMessages + 1;
      const newPercentage = Math.min(100, m.maturationPercentage + Math.random() * 2);
      
      let newStatus = m.maturationStatus;
      if (newPercentage < 25) newStatus = 'heating';
      else if (newPercentage < 75) newStatus = 'ready';
      else newStatus = 'active';

      return {
        ...m,
        lastActivity: new Date(),
        totalMessages: newMessages,
        maturationPercentage: newPercentage,
        maturationStatus: newStatus
      };
    }));

    addHistoryEntry(chipId, 'message_sent', 'Mensagem enviada com sucesso');
  }, [addHistoryEntry]);

  // Obter dados de monitoramento de um chip
  const getChipMonitoring = useCallback((chipId: string) => {
    return monitoring.find(m => m.id === chipId);
  }, [monitoring]);

  // Obter histórico de um chip
  const getChipHistory = useCallback((chipId: string) => {
    return history.filter(h => h.id === chipId).slice(0, 50); // Últimos 50 eventos
  }, [history]);

  // Obter alertas não lidos
  const getUnreadAlerts = useCallback(() => {
    return alerts.filter(alert => !alert.isRead);
  }, [alerts]);

  return {
    monitoring,
    history,
    alerts,
    initializeChip,
    testConnection,
    simulateChipActivity,
    getChipMonitoring,
    getChipHistory,
    getUnreadAlerts,
    markAlertAsRead,
    createAlert
  };
};