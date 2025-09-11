-- Ajustar policies para permitir criação de conexões sem autenticação
DROP POLICY IF EXISTS "Allow all for development" ON public.saas_conexoes;

-- Criar policies mais específicas que permitem operações sem autenticação
CREATE POLICY "Permitir inserção de conexões" ON public.saas_conexoes
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Permitir leitura de conexões" ON public.saas_conexoes
  FOR SELECT 
  USING (true);

CREATE POLICY "Permitir atualização de conexões" ON public.saas_conexoes
  FOR UPDATE 
  USING (true);

CREATE POLICY "Permitir exclusão de conexões" ON public.saas_conexoes
  FOR DELETE 
  USING (true);

-- Remover trigger que força usuario_id
DROP TRIGGER IF EXISTS enforce_user_id_trigger ON public.saas_conexoes;