-- Tornar a coluna usuario_id nullable para permitir conexões sem autenticação
ALTER TABLE public.saas_conexoes 
ALTER COLUMN usuario_id DROP NOT NULL;