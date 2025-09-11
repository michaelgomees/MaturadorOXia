-- Adicionar colunas específicas para Evolution API na tabela saas_conexoes
ALTER TABLE public.saas_conexoes 
ADD COLUMN IF NOT EXISTS evolution_instance_name TEXT,
ADD COLUMN IF NOT EXISTS evolution_instance_id TEXT,
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS conversas_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS modelo_ia TEXT DEFAULT 'ChatGPT';

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_saas_conexoes_evolution_instance 
ON public.saas_conexoes(evolution_instance_name);

-- Atualizar trigger para updated_at se não existir
CREATE TRIGGER IF NOT EXISTS update_saas_conexoes_updated_at
    BEFORE UPDATE ON public.saas_conexoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();