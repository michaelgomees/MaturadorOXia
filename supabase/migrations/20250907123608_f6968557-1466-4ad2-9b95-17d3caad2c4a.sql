-- Remover o trigger que está forçando autenticação na tabela saas_conexoes
DROP TRIGGER IF EXISTS enforce_user_id_on_insert_trigger ON public.saas_conexoes;

-- Remover também o trigger de verificação de limite de chips se existir
DROP TRIGGER IF EXISTS check_chip_limit_trigger ON public.saas_conexoes;