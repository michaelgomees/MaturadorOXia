-- Adicionar coluna random_no_repeat à tabela saas_broadcast_campaigns
ALTER TABLE saas_broadcast_campaigns 
ADD COLUMN random_no_repeat boolean NOT NULL DEFAULT true;