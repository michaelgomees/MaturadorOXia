import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BROADCAST_API_URL = Deno.env.get('BROADCAST_API_ENDPOINT') || '';
const BROADCAST_API_KEY = Deno.env.get('BROADCAST_API_KEY') || '';

Deno.serve(async (req) => {
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

    console.log('🚀 Iniciando processamento de fila de broadcast');

    // Tentar ler parâmetros opcionais (force, campaign_id)
    let force = false;
    let targetCampaignId: string | undefined = undefined;

    try {
      const body = await req.json();
      force = !!body.force;
      if (body.campaign_id && typeof body.campaign_id === 'string') {
        targetCampaignId = body.campaign_id;
      }
    } catch {
      // Sem body ou body inválido, segue com valores padrão
    }

    // Se uma campanha específica foi informada, sempre forçamos o envio
    if (targetCampaignId && !force) {
      force = true;
      console.log(
        `⚡ Modo FORÇADO ativado automaticamente para a campanha ${targetCampaignId}`,
      );
    } else if (force) {
      console.log('⚡ Modo FORÇADO ativado - ignorando regras de agendamento');
    }

    // Buscar campanhas ativas (opcionalmente filtrando por uma específica)
    let campaignsQuery = supabaseClient
      .from('saas_broadcast_campaigns')
      .select('*')
      .eq('status', 'running') as any;

    if (targetCampaignId) {
      campaignsQuery = campaignsQuery.eq('id', targetCampaignId);
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery;

    if (campaignsError) {
      throw new Error(`Erro ao buscar campanhas: ${campaignsError.message}`);
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('ℹ️ Nenhuma campanha ativa encontrada');
      return new Response(
        JSON.stringify({ message: 'Nenhuma campanha ativa' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📊 Encontradas ${campaigns.length} campanhas ativas`);

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0 = domingo, 1 = segunda, etc.
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`;

    let totalProcessed = 0;
    let totalSent = 0;
    let totalFailed = 0;

    for (const campaign of campaigns) {
      console.log(`\n🎯 Processando campanha: ${campaign.nome}`);

      // Regras de agendamento (TOTALMENTE ignoradas em modo FORÇADO)
      if (!force) {
        // Verificar se está nos dias permitidos
        if (!campaign.dias_semana.includes(currentDay)) {
          console.log(`⏭️ Campanha ${campaign.nome} não roda hoje (dia ${currentDay})`);
          continue;
        }

        // Verificar horário permitido
        if (currentTime < campaign.horario_inicio || currentTime > campaign.horario_fim) {
          console.log(`⏰ Fora do horário permitido (${campaign.horario_inicio} - ${campaign.horario_fim})`);
          continue;
        }

        // Verificar se está em pausa
        if (campaign.ultima_pausa) {
          const pauseEnd = new Date(campaign.ultima_pausa);
          pauseEnd.setMinutes(pauseEnd.getMinutes() + campaign.pausar_por_minutos);
          
          if (now < pauseEnd) {
            console.log(`⏸️ Campanha em pausa até ${pauseEnd.toLocaleTimeString()}`);
            continue;
          }
        }

        // Verificar se precisa pausar
        const sentSinceLastPause = campaign.mensagens_enviadas % campaign.pausar_apos_mensagens;
        if (sentSinceLastPause === 0 && campaign.mensagens_enviadas > 0) {
          console.log(`⏸️ Pausando após ${campaign.pausar_apos_mensagens} mensagens`);
          await supabaseClient
            .from('saas_broadcast_campaigns')
            .update({ ultima_pausa: now.toISOString() })
            .eq('id', campaign.id);
          continue;
        }

        // Verificar próximo envio permitido
        if (campaign.proximo_envio && new Date(campaign.proximo_envio) > now) {
          console.log(`⏳ Aguardando intervalo até ${new Date(campaign.proximo_envio).toLocaleTimeString()}`);
          continue;
        }
      } else {
        console.log(`⚡ Modo FORÇADO - ignorando TODAS as regras para ${campaign.nome}`);
      }

      // Buscar mensagens pendentes desta campanha
      const { data: queueItems, error: queueError } = await supabaseClient
        .from('saas_broadcast_queue')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1); // Processar 1 mensagem por vez

      if (queueError) {
        console.error('Erro ao buscar fila:', queueError);
        continue;
      }

      if (!queueItems || queueItems.length === 0) {
        console.log(`✅ Todas as mensagens da campanha ${campaign.nome} foram processadas`);
        
        // Verificar se todas foram processadas
        const { count } = await supabaseClient
          .from('saas_broadcast_queue')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending');

        if (count === 0) {
          await supabaseClient
            .from('saas_broadcast_campaigns')
            .update({ 
              status: 'completed',
              completed_at: now.toISOString()
            })
            .eq('id', campaign.id);
          console.log(`🎉 Campanha ${campaign.nome} finalizada`);
        }
        continue;
      }

      console.log(`📨 Processando ${queueItems.length} mensagens da campanha ${campaign.nome}`);

      // Processar cada mensagem da fila
      for (const queueItem of queueItems) {
        totalProcessed++;

        try {
          console.log(`📤 Enviando mensagem para ${queueItem.telefone} via uazapi`);

          // Enviar via uazapi (estrutura simplificada, sem /manager/)
          const response = await fetch(
            `${BROADCAST_API_URL}/message/text`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'token': BROADCAST_API_KEY,
              },
              body: JSON.stringify({
                number: queueItem.telefone.replace(/\D/g, ''),
                text: queueItem.mensagem,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData));
          }

          // Atualizar status para enviado
          await supabaseClient
            .from('saas_broadcast_queue')
            .update({
              status: 'sent',
              enviado_em: now.toISOString(),
              tentativas: queueItem.tentativas + 1,
            })
            .eq('id', queueItem.id);

          totalSent++;
          console.log(`✅ Mensagem enviada com sucesso para ${queueItem.telefone}`);

          // Aguardar um pouco entre envios (apenas no modo não-forçado)
          if (!force && queueItems.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          console.error(`❌ Erro ao enviar mensagem:`, error);
          
          // Atualizar status para falha
          await supabaseClient
            .from('saas_broadcast_queue')
            .update({
              status: 'failed',
              erro_mensagem: error.message,
              tentativas: queueItem.tentativas + 1,
            })
            .eq('id', queueItem.id);

          totalFailed++;
        }
      }

      // Atualizar contador de mensagens enviadas e próximo envio da campanha
      const nextInterval = Math.floor(
        Math.random() * (campaign.intervalo_max - campaign.intervalo_min + 1) + campaign.intervalo_min
      );
      const nextSendTime = new Date(now.getTime() + nextInterval * 1000);

      await supabaseClient
        .from('saas_broadcast_campaigns')
        .update({
          mensagens_enviadas: campaign.mensagens_enviadas + totalSent,
          proximo_envio: nextSendTime.toISOString(),
        })
        .eq('id', campaign.id);

      console.log(`📊 Campanha ${campaign.nome}: ${totalSent} enviadas. Próximo envio em ${nextInterval}s`);
    }

    console.log(`\n📊 Resumo: ${totalProcessed} processadas, ${totalSent} enviadas, ${totalFailed} falharam`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        sent: totalSent,
        failed: totalFailed,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro ao processar fila:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
