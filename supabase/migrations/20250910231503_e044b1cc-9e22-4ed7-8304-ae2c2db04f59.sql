-- Adicionar campos para armazenar dados automáticos do WhatsApp
ALTER TABLE public.saas_conexoes 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Adicionar comentários para documentar os novos campos
COMMENT ON COLUMN public.saas_conexoes.avatar_url IS 'URL da foto de perfil do WhatsApp obtida automaticamente';
COMMENT ON COLUMN public.saas_conexoes.display_name IS 'Nome de exibição do WhatsApp obtido automaticamente';
COMMENT ON COLUMN public.saas_conexoes.last_sync IS 'Última sincronização automática com a Evolution API';

-- Criar função que sincroniza automaticamente quando a conexão fica ativa
CREATE OR REPLACE FUNCTION public.trigger_auto_sync_on_connection()
RETURNS TRIGGER AS $function$
BEGIN
  -- Se o status mudou para 'ativo' e tinha QR code antes, significa que conectou
  IF NEW.status = 'ativo' AND OLD.status != 'ativo' AND OLD.qr_code IS NOT NULL THEN
    NEW.last_sync = now();
    NEW.qr_code = NULL; -- Limpar QR code quando conectado
  END IF;
  
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Criar trigger para executar a sincronização automática
DROP TRIGGER IF EXISTS auto_sync_on_connection ON public.saas_conexoes;
CREATE TRIGGER auto_sync_on_connection
  BEFORE UPDATE ON public.saas_conexoes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_sync_on_connection();