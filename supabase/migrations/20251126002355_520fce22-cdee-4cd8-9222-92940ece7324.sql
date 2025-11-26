-- Tabela de listas de contatos
CREATE TABLE public.saas_contact_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  total_contatos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de contatos individuais
CREATE TABLE public.saas_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lista_id UUID NOT NULL REFERENCES public.saas_contact_lists(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  nome TEXT,
  telefone TEXT NOT NULL,
  variavel1 TEXT,
  variavel2 TEXT,
  variavel3 TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de mensagens para disparo
CREATE TABLE public.saas_broadcast_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  nome TEXT NOT NULL,
  mensagens JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_mensagens INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de campanhas de disparo
CREATE TABLE public.saas_broadcast_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  nome TEXT NOT NULL,
  lista_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  instance_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  message_file_id UUID REFERENCES public.saas_broadcast_messages(id),
  
  -- Configurações de intervalo
  intervalo_min INTEGER NOT NULL DEFAULT 30,
  intervalo_max INTEGER NOT NULL DEFAULT 60,
  
  -- Pausa automática
  pausar_apos_mensagens INTEGER NOT NULL DEFAULT 20,
  pausar_por_minutos INTEGER NOT NULL DEFAULT 10,
  
  -- Agendamento
  agendar_data_especifica BOOLEAN NOT NULL DEFAULT false,
  data_agendada TIMESTAMP WITH TIME ZONE,
  horario_inicio TIME NOT NULL DEFAULT '08:00:00',
  horario_fim TIME NOT NULL DEFAULT '18:00:00',
  dias_semana INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7],
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  mensagens_enviadas INTEGER NOT NULL DEFAULT 0,
  mensagens_total INTEGER NOT NULL DEFAULT 0,
  ultima_pausa TIMESTAMP WITH TIME ZONE,
  proximo_envio TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de fila de envio
CREATE TABLE public.saas_broadcast_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.saas_broadcast_campaigns(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.saas_contacts(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.saas_conexoes(id) ON DELETE CASCADE,
  telefone TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tentativas INTEGER NOT NULL DEFAULT 0,
  erro_mensagem TEXT,
  enviado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saas_contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_broadcast_queue ENABLE ROW LEVEL SECURITY;

-- Policies para saas_contact_lists
CREATE POLICY "Usuários podem ver suas próprias listas"
  ON public.saas_contact_lists FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir suas próprias listas"
  ON public.saas_contact_lists FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar suas próprias listas"
  ON public.saas_contact_lists FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar suas próprias listas"
  ON public.saas_contact_lists FOR DELETE
  USING (usuario_id = auth.uid());

-- Policies para saas_contacts
CREATE POLICY "Usuários podem ver seus próprios contatos"
  ON public.saas_contacts FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir seus próprios contatos"
  ON public.saas_contacts FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seus próprios contatos"
  ON public.saas_contacts FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar seus próprios contatos"
  ON public.saas_contacts FOR DELETE
  USING (usuario_id = auth.uid());

-- Policies para saas_broadcast_messages
CREATE POLICY "Usuários podem ver suas próprias mensagens de disparo"
  ON public.saas_broadcast_messages FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir suas próprias mensagens de disparo"
  ON public.saas_broadcast_messages FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar suas próprias mensagens de disparo"
  ON public.saas_broadcast_messages FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar suas próprias mensagens de disparo"
  ON public.saas_broadcast_messages FOR DELETE
  USING (usuario_id = auth.uid());

-- Policies para saas_broadcast_campaigns
CREATE POLICY "Usuários podem ver suas próprias campanhas"
  ON public.saas_broadcast_campaigns FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir suas próprias campanhas"
  ON public.saas_broadcast_campaigns FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar suas próprias campanhas"
  ON public.saas_broadcast_campaigns FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar suas próprias campanhas"
  ON public.saas_broadcast_campaigns FOR DELETE
  USING (usuario_id = auth.uid());

-- Policies para saas_broadcast_queue
CREATE POLICY "Usuários podem ver sua própria fila"
  ON public.saas_broadcast_queue FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem inserir na sua própria fila"
  ON public.saas_broadcast_queue FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar sua própria fila"
  ON public.saas_broadcast_queue FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar da sua própria fila"
  ON public.saas_broadcast_queue FOR DELETE
  USING (usuario_id = auth.uid());

-- Índices para performance
CREATE INDEX idx_contacts_lista_id ON public.saas_contacts(lista_id);
CREATE INDEX idx_contacts_usuario_id ON public.saas_contacts(usuario_id);
CREATE INDEX idx_broadcast_queue_campaign_id ON public.saas_broadcast_queue(campaign_id);
CREATE INDEX idx_broadcast_queue_status ON public.saas_broadcast_queue(status);
CREATE INDEX idx_campaigns_status ON public.saas_broadcast_campaigns(status);

-- Triggers para updated_at
CREATE TRIGGER update_contact_lists_updated_at
  BEFORE UPDATE ON public.saas_contact_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_broadcast_messages_updated_at
  BEFORE UPDATE ON public.saas_broadcast_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_broadcast_campaigns_updated_at
  BEFORE UPDATE ON public.saas_broadcast_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();