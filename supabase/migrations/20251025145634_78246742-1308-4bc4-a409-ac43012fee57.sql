-- Adicionar campo prompt em saas_conexoes para cada chip ter seu próprio comportamento
ALTER TABLE public.saas_conexoes 
ADD COLUMN prompt text DEFAULT 'Você é um assistente amigável e prestativo. Responda de forma natural, breve e humanizada. Use emojis ocasionalmente para dar mais naturalidade às conversas.';

-- Comentário explicativo
COMMENT ON COLUMN public.saas_conexoes.prompt IS 'Prompt personalizado que define o comportamento do chip durante conversas de maturação';