import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const webhookData = await req.json();
    console.log('📨 Webhook recebido da Evolution API:', JSON.stringify(webhookData, null, 2));

    // Verificar se é uma mensagem recebida (não enviada por nós)
    const event = webhookData.event;
    const data = webhookData.data;

    if (event === 'messages.upsert' && data) {
      const message = data.message || data;
      const key = message.key;
      const messageContent = message.message;

      // Verificar se a mensagem é de entrada (fromMe = false)
      if (key && !key.fromMe) {
        const instanceName = webhookData.instance;
        const remoteJid = key.remoteJid;
        const phoneNumber = remoteJid?.replace('@s.whatsapp.net', '');

        console.log(`📥 Mensagem recebida: instance=${instanceName}, phone=${phoneNumber}`);

        // Buscar a conexão que recebeu a mensagem
        const { data: receivingConnection } = await supabase
          .from('saas_conexoes')
          .select('*')
          .eq('evolution_instance_name', instanceName)
          .single();

        if (receivingConnection) {
          console.log(`✅ Conexão encontrada: ${receivingConnection.nome}`);

          // Buscar pares onde esta conexão está aguardando resposta
          // e o telefone corresponde ao outro chip do par
          const { data: waitingPairs } = await supabase
            .from('saas_pares_maturacao')
            .select('*, saas_conexoes!inner(*)')
            .eq('waiting_response', true)
            .or(`nome_chip1.eq.${receivingConnection.nome},nome_chip2.eq.${receivingConnection.nome}`);

          if (waitingPairs && waitingPairs.length > 0) {
            for (const pair of waitingPairs) {
              // Verificar se o último remetente foi o outro chip deste par
              const isReceivingChip1 = pair.nome_chip1 === receivingConnection.nome;
              const isReceivingChip2 = pair.nome_chip2 === receivingConnection.nome;
              const expectedSender = isReceivingChip1 ? pair.nome_chip2 : pair.nome_chip1;

              // Se este chip recebeu a mensagem e o último remetente foi o outro chip,
              // isso significa que recebemos a resposta esperada
              if (pair.last_sender === expectedSender) {
                console.log(`🔓 Desbloqueando par ${pair.id} - resposta recebida de ${expectedSender}`);

                // Calcular próximo horário com delay humanizado (20-60 segundos)
                const delaySeconds = Math.floor(Math.random() * 41) + 20;
                const nextMessageTime = new Date(Date.now() + delaySeconds * 1000);

                // Desbloquear o par para permitir próxima mensagem
                await supabase
                  .from('saas_pares_maturacao')
                  .update({
                    waiting_response: false, // ✅ DESBLOQUEADO! Resposta detectada
                    next_message_time: nextMessageTime.toISOString(),
                    last_activity: new Date().toISOString()
                  })
                  .eq('id', pair.id);

                console.log(`✅ Par ${pair.id} desbloqueado - próxima mensagem em ${delaySeconds}s`);
              }
            }
          } else {
            console.log(`ℹ️ Nenhum par aguardando resposta para ${receivingConnection.nome}`);
          }
        } else {
          console.log(`⚠️ Conexão não encontrada para instance: ${instanceName}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
