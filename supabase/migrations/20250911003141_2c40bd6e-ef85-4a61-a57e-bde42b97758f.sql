-- Criar tabela para prompts de IA
CREATE TABLE public.saas_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'conversacao',
  is_global BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usuario_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para pares de maturação
CREATE TABLE public.saas_pares_maturacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_chip1 TEXT NOT NULL,
  nome_chip2 TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'stopped',
  messages_count INTEGER NOT NULL DEFAULT 0,
  use_instance_prompt BOOLEAN NOT NULL DEFAULT false,
  instance_prompt TEXT,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para configurações de API (OpenAI, etc)
CREATE TABLE public.saas_api_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  max_tokens INTEGER NOT NULL DEFAULT 2000,
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  usuario_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS nas tabelas
ALTER TABLE public.saas_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_pares_maturacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_api_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies para prompts
CREATE POLICY "Usuários podem ver seus próprios prompts" 
ON public.saas_prompts 
FOR SELECT 
USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir seus próprios prompts" 
ON public.saas_prompts 
FOR INSERT 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seus próprios prompts" 
ON public.saas_prompts 
FOR UPDATE 
USING (usuario_id = auth.uid()) 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar seus próprios prompts" 
ON public.saas_prompts 
FOR DELETE 
USING (usuario_id = auth.uid());

-- RLS policies para pares de maturação
CREATE POLICY "Usuários podem ver seus próprios pares" 
ON public.saas_pares_maturacao 
FOR SELECT 
USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir seus próprios pares" 
ON public.saas_pares_maturacao 
FOR INSERT 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seus próprios pares" 
ON public.saas_pares_maturacao 
FOR UPDATE 
USING (usuario_id = auth.uid()) 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar seus próprios pares" 
ON public.saas_pares_maturacao 
FOR DELETE 
USING (usuario_id = auth.uid());

-- RLS policies para API configs
CREATE POLICY "Usuários podem ver suas próprias configs" 
ON public.saas_api_configs 
FOR SELECT 
USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir suas próprias configs" 
ON public.saas_api_configs 
FOR INSERT 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar suas próprias configs" 
ON public.saas_api_configs 
FOR UPDATE 
USING (usuario_id = auth.uid()) 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar suas próprias configs" 
ON public.saas_api_configs 
FOR DELETE 
USING (usuario_id = auth.uid());

-- Triggers para updated_at
CREATE TRIGGER update_saas_prompts_updated_at
BEFORE UPDATE ON public.saas_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saas_pares_maturacao_updated_at
BEFORE UPDATE ON public.saas_pares_maturacao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saas_api_configs_updated_at
BEFORE UPDATE ON public.saas_api_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();