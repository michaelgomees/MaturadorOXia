-- Função para verificar se já existe um par com os mesmos chips (em qualquer ordem)
CREATE OR REPLACE FUNCTION check_duplicate_pair()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se já existe um par com os mesmos chips (em qualquer direção)
  IF EXISTS (
    SELECT 1 FROM saas_pares_maturacao
    WHERE usuario_id = NEW.usuario_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (nome_chip1 = NEW.nome_chip1 AND nome_chip2 = NEW.nome_chip2) OR
      (nome_chip1 = NEW.nome_chip2 AND nome_chip2 = NEW.nome_chip1)
    )
  ) THEN
    RAISE EXCEPTION 'Esta dupla de chips já foi configurada (% e %)', NEW.nome_chip1, NEW.nome_chip2;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validar antes de inserir ou atualizar
DROP TRIGGER IF EXISTS validate_duplicate_pair ON saas_pares_maturacao;
CREATE TRIGGER validate_duplicate_pair
  BEFORE INSERT OR UPDATE ON saas_pares_maturacao
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_pair();