-- Adicionar coluna para registrar quando o disparo foi iniciado
ALTER TABLE public.saas_pares_maturacao
ADD COLUMN started_at timestamp with time zone;