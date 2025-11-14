-- Desabilitar trigger temporariamente
ALTER TABLE saas_pares_maturacao DISABLE TRIGGER ALL;

-- Atualizar pares com message_file_id
UPDATE saas_pares_maturacao
SET message_file_id = (
  SELECT id
  FROM saas_maturation_messages
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1
)
WHERE maturation_mode = 'messages'
AND message_file_id IS NULL;

-- Reabilitar triggers
ALTER TABLE saas_pares_maturacao ENABLE TRIGGER ALL;