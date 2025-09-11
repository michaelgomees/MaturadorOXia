-- Corrigir função com search_path para resolver warning de segurança
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
$function$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;