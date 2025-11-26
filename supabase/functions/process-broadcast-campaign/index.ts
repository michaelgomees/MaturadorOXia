import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';
import { substituirVariaveis } from './messageVariables.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Contact {
  id: string;
  nome: string | null;
  telefone: string;
  lista_id: string;
  variavel1: string | null;
  variavel2: string | null;
  variavel3: string | null;
}

interface Message {
  numero: number;
  texto: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { campaign_id } = await req.json();

    if (!campaign_id) {
      throw new Error('campaign_id é obrigatório');
    }

    console.log(`Processando campanha: ${campaign_id}`);

    // Buscar dados da campanha
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('saas_broadcast_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Erro ao buscar campanha: ${campaignError?.message}`);
    }

    console.log(`Campanha encontrada: ${campaign.nome}`);

    // Buscar contatos das listas selecionadas
    const { data: contacts, error: contactsError } = await supabaseClient
      .from('saas_contacts')
      .select('*')
      .in('lista_id', campaign.lista_ids)
      .eq('usuario_id', campaign.usuario_id);

    if (contactsError) {
      throw new Error(`Erro ao buscar contatos: ${contactsError.message}`);
    }

    if (!contacts || contacts.length === 0) {
      throw new Error('Nenhum contato encontrado nas listas selecionadas');
    }

    console.log(`Total de contatos encontrados: ${contacts.length}`);

    // Buscar mensagens do arquivo
    let messages: Message[] = [];
    if (campaign.message_file_id) {
      const { data: messageFile, error: messageError } = await supabaseClient
        .from('saas_broadcast_messages')
        .select('mensagens')
        .eq('id', campaign.message_file_id)
        .single();

      if (messageError || !messageFile) {
        throw new Error(`Erro ao buscar mensagens: ${messageError?.message}`);
      }

      messages = messageFile.mensagens as Message[];
    }

    if (messages.length === 0) {
      throw new Error('Nenhuma mensagem encontrada no arquivo selecionado');
    }

    console.log(`Total de mensagens encontradas: ${messages.length}`);
    console.log(`Estrutura da primeira mensagem:`, JSON.stringify(messages[0]));

    // Verificar quais instâncias estão ativas
    const { data: instances, error: instancesError } = await supabaseClient
      .from('saas_conexoes')
      .select('id, nome, status')
      .in('id', campaign.instance_ids)
      .eq('status', 'ativo');

    if (instancesError) {
      throw new Error(`Erro ao buscar instâncias: ${instancesError.message}`);
    }

    if (!instances || instances.length === 0) {
      throw new Error('Nenhuma instância ativa disponível');
    }

    console.log(`Instâncias ativas: ${instances.length}`);

    // Distribuir contatos entre as instâncias
    const queueItems: any[] = [];
    const contactsPerInstance = Math.ceil(contacts.length / instances.length);

    // Preparar mensagens (aleatório ou sequencial)
    let availableMessages = [...messages];
    if (campaign.random_no_repeat) {
      // Embaralhar mensagens
      availableMessages = messages.sort(() => Math.random() - 0.5);
    }

    let messageIndex = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const instanceIndex = Math.floor(i / contactsPerInstance);
      const instance = instances[Math.min(instanceIndex, instances.length - 1)];

      // Selecionar mensagem
      const message = availableMessages[messageIndex % availableMessages.length];
      messageIndex++;

      // Verificar se a mensagem tem o campo texto
      if (!message || !message.texto) {
        console.error(`Mensagem sem campo texto:`, JSON.stringify(message));
        throw new Error(`Estrutura de mensagem inválida no índice ${messageIndex - 1}`);
      }

      // Substituir variáveis na mensagem
      const mensagemProcessada = substituirVariaveis(message.texto, contact);

      queueItems.push({
        campaign_id: campaign.id,
        usuario_id: campaign.usuario_id,
        contact_id: contact.id,
        instance_id: instance.id,
        telefone: contact.telefone,
        mensagem: mensagemProcessada,
        status: 'pending',
        tentativas: 0,
      });
    }

    console.log(`Criando ${queueItems.length} itens na fila de disparo`);

    // Inserir na fila em lotes
    const batchSize = 100;
    for (let i = 0; i < queueItems.length; i += batchSize) {
      const batch = queueItems.slice(i, i + batchSize);
      const { error: insertError } = await supabaseClient
        .from('saas_broadcast_queue')
        .insert(batch);

      if (insertError) {
        console.error(`Erro ao inserir lote ${i / batchSize + 1}:`, insertError);
        throw new Error(`Erro ao criar fila: ${insertError.message}`);
      }
    }

    // Atualizar total de mensagens na campanha
    const { error: updateError } = await supabaseClient
      .from('saas_broadcast_campaigns')
      .update({
        mensagens_total: queueItems.length,
        status: 'running',
      })
      .eq('id', campaign.id);

    if (updateError) {
      console.error('Erro ao atualizar campanha:', updateError);
    }

    console.log(`Campanha ${campaign_id} processada com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Campanha processada com sucesso',
        total_contacts: contacts.length,
        total_messages: queueItems.length,
        active_instances: instances.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro ao processar campanha:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
