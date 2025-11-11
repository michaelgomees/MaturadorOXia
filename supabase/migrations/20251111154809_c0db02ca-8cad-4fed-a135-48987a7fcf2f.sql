-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Permitir que o banco execute jobs
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Criar cron job para executar force-maturation a cada 20 segundos
SELECT cron.schedule(
  'auto-maturation-job',
  '*/20 * * * * *', -- A cada 20 segundos (formato: segundo minuto hora dia mês dia-da-semana)
  $$
  SELECT
    net.http_post(
        url:='https://rltkxwswlvuzwmmbqwkr.supabase.co/functions/v1/force-maturation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsdGt4d3N3bHZ1endtbWJxd2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzg1MTUsImV4cCI6MjA3MjYxNDUxNX0.CFvBnfnzS7GD8ksbDprZ3sbFE1XHRhtrJJpBUaGCQlM"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);