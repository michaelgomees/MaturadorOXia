-- Adicionar campos para controle melhor de alternância de mensagens
ALTER TABLE saas_pares_maturacao 
ADD COLUMN IF NOT EXISTS last_sender TEXT,
ADD COLUMN IF NOT EXISTS waiting_response BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS next_message_time TIMESTAMP WITH TIME ZONE;

-- Criar índice para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_pares_next_message 
ON saas_pares_maturacao(next_message_time, status, is_active) 
WHERE status IN ('running', 'active') AND is_active = true;