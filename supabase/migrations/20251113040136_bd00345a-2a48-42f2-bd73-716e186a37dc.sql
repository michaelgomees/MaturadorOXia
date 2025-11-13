-- Tabela para armazenar recursos multimídia (imagens, links, áudios)
CREATE TABLE IF NOT EXISTS public.saas_media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'link', 'audio')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 5,
  mode TEXT NOT NULL DEFAULT 'image_text',
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para configurações globais de mídia
CREATE TABLE IF NOT EXISTS public.saas_media_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE,
  max_images_per_hour INTEGER NOT NULL DEFAULT 10,
  max_links_per_conversation INTEGER NOT NULL DEFAULT 5,
  randomize_selection BOOLEAN NOT NULL DEFAULT true,
  enable_preview BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para rastrear uso de mídia por par
CREATE TABLE IF NOT EXISTS public.saas_media_usage_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  images_used_this_hour INTEGER NOT NULL DEFAULT 0,
  links_used_in_conversation INTEGER NOT NULL DEFAULT 0,
  last_image_time TIMESTAMP WITH TIME ZONE,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_reset_hour INTEGER NOT NULL DEFAULT EXTRACT(HOUR FROM NOW()),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pair_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_media_items_usuario_id ON public.saas_media_items(usuario_id);
CREATE INDEX IF NOT EXISTS idx_media_items_type ON public.saas_media_items(type);
CREATE INDEX IF NOT EXISTS idx_media_items_is_active ON public.saas_media_items(is_active);
CREATE INDEX IF NOT EXISTS idx_media_config_usuario_id ON public.saas_media_config(usuario_id);
CREATE INDEX IF NOT EXISTS idx_media_trackers_pair_id ON public.saas_media_usage_trackers(pair_id);

-- RLS Policies para saas_media_items
ALTER TABLE public.saas_media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios itens de mídia"
  ON public.saas_media_items FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir seus próprios itens de mídia"
  ON public.saas_media_items FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seus próprios itens de mídia"
  ON public.saas_media_items FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar seus próprios itens de mídia"
  ON public.saas_media_items FOR DELETE
  USING (usuario_id = auth.uid());

-- RLS Policies para saas_media_config
ALTER TABLE public.saas_media_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver sua própria config de mídia"
  ON public.saas_media_config FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir sua própria config de mídia"
  ON public.saas_media_config FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar sua própria config de mídia"
  ON public.saas_media_config FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (auth.uid() = usuario_id);

-- RLS Policies para saas_media_usage_trackers
ALTER TABLE public.saas_media_usage_trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios trackers de mídia"
  ON public.saas_media_usage_trackers FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir seus próprios trackers de mídia"
  ON public.saas_media_usage_trackers FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seus próprios trackers de mídia"
  ON public.saas_media_usage_trackers FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (auth.uid() = usuario_id);

-- Triggers para updated_at
CREATE TRIGGER update_media_items_updated_at
  BEFORE UPDATE ON public.saas_media_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_config_updated_at
  BEFORE UPDATE ON public.saas_media_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_trackers_updated_at
  BEFORE UPDATE ON public.saas_media_usage_trackers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();