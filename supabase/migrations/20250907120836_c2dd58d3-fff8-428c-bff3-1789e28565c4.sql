-- Desabilitar temporariamente RLS para permitir funcionamento sem autenticação
-- Isso é temporário até que a autenticação seja implementada
ALTER TABLE public.saas_conexoes DISABLE ROW LEVEL SECURITY;

-- Adicionar comentário explicativo
COMMENT ON TABLE public.saas_conexoes IS 'RLS desabilitado temporariamente - implementar autenticação antes de produção';