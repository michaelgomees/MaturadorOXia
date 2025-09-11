-- Restore inactive connections to active status
UPDATE saas_conexoes SET status = 'ativo' WHERE status = 'inativo';