
-- Criar cron job para executar force-maturation a cada minuto
-- pg_cron não suporta intervalos menores que 1 minuto
SELECT cron.schedule(
  'force-maturation-continuous',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rltkxwswlvuzwmmbqwkr.supabase.co/functions/v1/force-maturation',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsdGt4d3N3bHZ1endtbWJxd2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzg1MTUsImV4cCI6MjA3MjYxNDUxNX0.CFvBnfnzS7GD8ksbDprZ3sbFE1XHRhtrJJpBUaGCQlM"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
