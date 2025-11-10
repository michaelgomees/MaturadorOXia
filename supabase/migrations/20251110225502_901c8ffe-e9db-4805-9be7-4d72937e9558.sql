-- Criar tabela de mensagens de maturação se não existir
CREATE TABLE IF NOT EXISTS public.saas_mensagens_maturacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chip_pair_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.saas_mensagens_maturacao ENABLE ROW LEVEL SECURITY;

-- Policies para a tabela
CREATE POLICY "Usuários podem ver suas próprias mensagens"
  ON public.saas_mensagens_maturacao
  FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir suas próprias mensagens"
  ON public.saas_mensagens_maturacao
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuários podem deletar suas próprias mensagens"
  ON public.saas_mensagens_maturacao
  FOR DELETE
  USING (usuario_id = auth.uid());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mensagens_pair ON public.saas_mensagens_maturacao(chip_pair_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_usuario ON public.saas_mensagens_maturacao(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_timestamp ON public.saas_mensagens_maturacao(timestamp DESC);