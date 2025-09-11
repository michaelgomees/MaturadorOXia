-- Reativar RLS e criar policies temporárias mais permissivas
ALTER TABLE public.saas_conexoes ENABLE ROW LEVEL SECURITY;

-- Remover policies existentes que exigem autenticação
DROP POLICY IF EXISTS "Users can create their own chips" ON public.saas_conexoes;
DROP POLICY IF EXISTS "Users can delete their own chips" ON public.saas_conexoes;
DROP POLICY IF EXISTS "Users can update their own chips" ON public.saas_conexoes;
DROP POLICY IF EXISTS "Users can view their own chips" ON public.saas_conexoes;

-- Criar policies temporárias que permitem acesso para desenvolvimento
-- NOTA: Isso deve ser substituído por policies apropriadas quando autenticação for implementada
CREATE POLICY "Allow all for development" ON public.saas_conexoes
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Adicionar comentário de advertência
COMMENT ON TABLE public.saas_conexoes IS 'ATENÇÃO: Policies temporárias permitem acesso total - implementar autenticação e policies apropriadas antes de produção';