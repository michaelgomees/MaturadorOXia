-- Limpar dados antigos das conexões para reset
UPDATE saas_conexoes SET config = NULL WHERE config IS NOT NULL;

-- Adicionar campo para armazenar histórico de conversas nas conexões
ALTER TABLE saas_conexoes ADD COLUMN IF NOT EXISTS conversation_history jsonb DEFAULT '[]'::jsonb;