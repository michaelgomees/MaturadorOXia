import { useState, useEffect } from 'react';

export interface MediaItem {
  id: string;
  type: 'image' | 'link' | 'audio';
  name: string;
  url: string;
  category: string;
  frequency: number;
  mode: string;
  usageCount: number;
  lastUsed: string;
  isActive: boolean;
}

export interface DadosConfig {
  maxImagesPerHour: number;
  maxLinksPerConversation: number;
  randomizeSelection: boolean;
  enablePreview: boolean;
}

export interface MediaUsageTracker {
  pairId: string;
  imagesUsedThisHour: number;
  linksUsedInConversation: number;
  lastImageTime: number;
  messageCount: number;
  lastResetHour: number;
}

/**
 * Hook para gerenciar e acessar recursos multimídia da aba "Dados"
 */
export const useMediaData = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [config, setConfig] = useState<DadosConfig>({
    maxImagesPerHour: 3,
    maxLinksPerConversation: 5,
    randomizeSelection: true,
    enablePreview: true
  });
  const [usageTrackers, setUsageTrackers] = useState<Record<string, MediaUsageTracker>>({});

  // Carregar dados do localStorage
  useEffect(() => {
    const savedItems = localStorage.getItem('ox-media-items');
    if (savedItems) {
      setMediaItems(JSON.parse(savedItems));
    }

    const savedConfig = localStorage.getItem('ox-dados-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }

    const savedTrackers = localStorage.getItem('ox-media-usage-trackers');
    if (savedTrackers) {
      setUsageTrackers(JSON.parse(savedTrackers));
    }
  }, []);

  // Salvar trackers no localStorage
  const saveTrackers = (trackers: Record<string, MediaUsageTracker>) => {
    setUsageTrackers(trackers);
    localStorage.setItem('ox-media-usage-trackers', JSON.stringify(trackers));
  };

  // Obter ou criar tracker para um par
  const getTracker = (pairId: string): MediaUsageTracker => {
    const currentHour = new Date().getHours();
    const existing = usageTrackers[pairId];

    // Reset contador de imagens se mudou a hora
    if (existing && existing.lastResetHour !== currentHour) {
      const updated = {
        ...existing,
        imagesUsedThisHour: 0,
        lastResetHour: currentHour
      };
      saveTrackers({ ...usageTrackers, [pairId]: updated });
      return updated;
    }

    if (existing) return existing;

    const newTracker: MediaUsageTracker = {
      pairId,
      imagesUsedThisHour: 0,
      linksUsedInConversation: 0,
      lastImageTime: 0,
      messageCount: 0,
      lastResetHour: currentHour
    };

    saveTrackers({ ...usageTrackers, [pairId]: newTracker });
    return newTracker;
  };

  // Incrementar contador de mensagens
  const incrementMessageCount = (pairId: string) => {
    const tracker = getTracker(pairId);
    tracker.messageCount++;
    saveTrackers({ ...usageTrackers, [pairId]: tracker });
  };

  // Verificar se deve enviar mídia baseado na frequência
  const shouldSendMedia = (pairId: string, mediaType: 'image' | 'link'): boolean => {
    const tracker = getTracker(pairId);
    const activeItems = mediaItems.filter(item => 
      item.isActive && item.type === mediaType
    );

    if (activeItems.length === 0) return false;

    // Verificar limites
    if (mediaType === 'image') {
      if (tracker.imagesUsedThisHour >= config.maxImagesPerHour) {
        return false;
      }
    } else if (mediaType === 'link') {
      if (tracker.linksUsedInConversation >= config.maxLinksPerConversation) {
        return false;
      }
    }

    // Verificar frequência (usar a menor frequência configurada como base)
    const minFrequency = Math.min(...activeItems.map(item => item.frequency));
    return tracker.messageCount % minFrequency === 0 && tracker.messageCount > 0;
  };

  // Selecionar item de mídia para enviar
  const selectMediaItem = (pairId: string, mediaType: 'image' | 'link' | 'audio'): MediaItem | null => {
    const activeItems = mediaItems.filter(item => 
      item.isActive && item.type === mediaType
    );

    if (activeItems.length === 0) return null;

    let selectedItem: MediaItem;

    if (config.randomizeSelection) {
      // Seleção aleatória
      selectedItem = activeItems[Math.floor(Math.random() * activeItems.length)];
    } else {
      // Seleção por ordem de upload (menor usageCount)
      selectedItem = activeItems.reduce((prev, current) => 
        prev.usageCount < current.usageCount ? prev : current
      );
    }

    return selectedItem;
  };

  // Registrar uso de mídia
  const recordMediaUsage = (pairId: string, itemId: string, mediaType: 'image' | 'link' | 'audio') => {
    const tracker = getTracker(pairId);

    // Atualizar tracker
    if (mediaType === 'image') {
      tracker.imagesUsedThisHour++;
      tracker.lastImageTime = Date.now();
    } else if (mediaType === 'link') {
      tracker.linksUsedInConversation++;
    }

    saveTrackers({ ...usageTrackers, [pairId]: tracker });

    // Atualizar item de mídia
    const updatedItems = mediaItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          usageCount: item.usageCount + 1,
          lastUsed: new Date().toISOString()
        };
      }
      return item;
    });

    setMediaItems(updatedItems);
    localStorage.setItem('ox-media-items', JSON.stringify(updatedItems));
  };

  // Reset tracker de conversa (quando par é parado/reiniciado)
  const resetConversationTracker = (pairId: string) => {
    const tracker = getTracker(pairId);
    tracker.linksUsedInConversation = 0;
    tracker.messageCount = 0;
    saveTrackers({ ...usageTrackers, [pairId]: tracker });
  };

  // Obter estatísticas de uso para um par
  const getUsageStats = (pairId: string) => {
    const tracker = getTracker(pairId);
    return {
      imagesRemaining: config.maxImagesPerHour - tracker.imagesUsedThisHour,
      linksRemaining: config.maxLinksPerConversation - tracker.linksUsedInConversation,
      messageCount: tracker.messageCount
    };
  };

  return {
    mediaItems,
    config,
    getTracker,
    incrementMessageCount,
    shouldSendMedia,
    selectMediaItem,
    recordMediaUsage,
    resetConversationTracker,
    getUsageStats
  };
};
