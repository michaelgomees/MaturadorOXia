-- Criar tabela para arquivos de mensagens de maturação
CREATE TABLE IF NOT EXISTS public.saas_maturation_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  tipo_arquivo text NOT NULL, -- txt, csv, json
  mensagens jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_mensagens integer NOT NULL DEFAULT 0,
  categoria text NOT NULL DEFAULT 'maturacao'::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.saas_maturation_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver seus próprios arquivos de mensagens"
ON public.saas_maturation_messages
FOR SELECT
USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir seus próprios arquivos de mensagens"
ON public.saas_maturation_messages
FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seus próprios arquivos de mensagens"
ON public.saas_maturation_messages
FOR UPDATE
USING (usuario_id = auth.uid())
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar seus próprios arquivos de mensagens"
ON public.saas_maturation_messages
FOR DELETE
USING (usuario_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_saas_maturation_messages_updated_at
BEFORE UPDATE ON public.saas_maturation_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar tabela de pares de maturação para incluir modo de maturação
ALTER TABLE public.saas_pares_maturacao 
ADD COLUMN IF NOT EXISTS maturation_mode text NOT NULL DEFAULT 'prompts'::text,
ADD COLUMN IF NOT EXISTS message_file_id uuid,
ADD COLUMN IF NOT EXISTS current_message_index integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS loop_messages boolean NOT NULL DEFAULT true;