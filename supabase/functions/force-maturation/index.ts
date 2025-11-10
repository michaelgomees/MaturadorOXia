import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChipPair {
  id: string;
  nome_chip1: string;
  nome_chip2: string;
  status: string;
  usuario_id: string;
  use_instance_prompt: boolean;
  instance_prompt: string | null;
}

interface Connection {
  id: string;
  nome: string;
  telefone: string;
  prompt: string;
  evolution_instance_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Iniciando verificação de pares ativos...');

    // Buscar todos os pares com status 'running'
    const { data: activePairs, error: pairsError } = await supabase
      .from('saas_pares_maturacao')
      .select('*')
      .eq('status', 'running');

    if (pairsError) {
      console.error('Erro ao buscar pares:', pairsError);
      throw pairsError;
    }

    if (!activePairs || activePairs.length === 0) {
      console.log('✅ Nenhum par ativo encontrado');
      return new Response(
        JSON.stringify({ message: 'Nenhum par ativo', processedPairs: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Encontrados ${activePairs.length} pares ativos`);

    // Processar cada par
    const results = [];
    for (const pair of activePairs as ChipPair[]) {
      try {
        console.log(`\n🎯 Processando par: ${pair.nome_chip1} <-> ${pair.nome_chip2}`);

        // Buscar conexões dos chips
        const { data: connections, error: connError } = await supabase
          .from('saas_conexoes')
          .select('*')
          .eq('usuario_id', pair.usuario_id)
          .in('nome', [pair.nome_chip1, pair.nome_chip2]);

        if (connError || !connections || connections.length !== 2) {
          console.error(`❌ Erro ao buscar conexões do par ${pair.id}:`, connError);
          continue;
        }

        const chip1 = connections.find((c: Connection) => c.nome === pair.nome_chip1);
        const chip2 = connections.find((c: Connection) => c.nome === pair.nome_chip2);

        if (!chip1 || !chip2) {
          console.error(`❌ Chips não encontrados para o par ${pair.id}`);
          continue;
        }

        // Buscar histórico de mensagens do par (últimas 10)
        const { data: messageHistory, error: histError } = await supabase
          .from('saas_mensagens_maturacao')
          .select('*')
          .eq('chip_pair_id', pair.id)
          .order('timestamp', { ascending: false })
          .limit(10);

        if (histError) {
          console.error(`❌ Erro ao buscar histórico do par ${pair.id}:`, histError);
        }

        // Determinar qual chip deve responder
        // Se não há histórico, chip1 começa; senão, alterna baseado na última mensagem
        let respondingChip = chip1;
        let receivingChip = chip2;

        if (messageHistory && messageHistory.length > 0) {
          const lastMessage = messageHistory[0];
          if (lastMessage.sender_name === chip1.nome) {
            respondingChip = chip2;
            receivingChip = chip1;
          }
        }

        console.log(`💬 ${respondingChip.nome} vai responder para ${receivingChip.nome}`);

        // Preparar histórico para o prompt no formato correto
        const conversationHistory = (messageHistory || [])
          .reverse()
          .map((msg: any) => ({
            isFromThisChip: msg.sender_name === respondingChip.nome,
            content: msg.content
          }));

        // Determinar o prompt a usar
        const systemPrompt = pair.use_instance_prompt && pair.instance_prompt
          ? pair.instance_prompt
          : respondingChip.prompt;

        const isFirstMessage = !messageHistory || messageHistory.length === 0;

        // Chamar OpenAI para gerar resposta
        const { data: aiResponse, error: aiError } = await supabase.functions.invoke('openai-chat', {
          body: {
            prompt: systemPrompt,
            chipName: respondingChip.nome,
            conversationHistory,
            isFirstMessage,
            responseDelay: 30
          }
        });

        if (aiError) {
          console.error(`❌ Erro ao chamar OpenAI para ${respondingChip.nome}:`, aiError);
          continue;
        }

        const responseText = aiResponse.message;
        console.log(`✅ Resposta gerada: ${responseText.substring(0, 50)}...`);

        // Salvar mensagem no banco
        const { error: saveError } = await supabase
          .from('saas_mensagens_maturacao')
          .insert({
            chip_pair_id: pair.id,
            sender_name: respondingChip.nome,
            receiver_name: receivingChip.nome,
            content: responseText,
            timestamp: new Date().toISOString(),
            usuario_id: pair.usuario_id
          });

        if (saveError) {
          console.error(`❌ Erro ao salvar mensagem do par ${pair.id}:`, saveError);
          continue;
        }

        // Atualizar última atividade do par
        await supabase
          .from('saas_pares_maturacao')
          .update({ 
            last_activity: new Date().toISOString(),
            messages_count: (pair as any).messages_count + 1
          })
          .eq('id', pair.id);

        // Enviar mensagem via Evolution API
        try {
          const evolutionEndpoint = Deno.env.get('EVOLUTION_API_ENDPOINT');
          const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

          if (!evolutionEndpoint || !evolutionApiKey) {
            console.warn('⚠️ Evolution API não configurada, pulando envio');
          } else {
            const sendMessageUrl = `${evolutionEndpoint}/message/sendText/${respondingChip.evolution_instance_name}`;
            
            const sendResponse = await fetch(sendMessageUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionApiKey
              },
              body: JSON.stringify({
                number: receivingChip.telefone,
                text: responseText
              })
            });

            if (sendResponse.ok) {
              console.log(`📱 Mensagem enviada via WhatsApp: ${respondingChip.nome} → ${receivingChip.telefone}`);
            } else {
              const errorData = await sendResponse.text();
              console.error(`❌ Erro ao enviar via Evolution API:`, errorData);
            }
          }
        } catch (evolutionError) {
          console.error(`❌ Erro ao enviar via Evolution API:`, evolutionError);
        }

        results.push({
          pairId: pair.id,
          from: respondingChip.nome,
          to: receivingChip.nome,
          success: true
        });

      } catch (pairError) {
        console.error(`❌ Erro ao processar par ${pair.id}:`, pairError);
        results.push({
          pairId: pair.id,
          success: false,
          error: pairError.message
        });
      }

      // Delay variável entre processar cada par (1-3 segundos)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }

    console.log(`\n✅ Processamento concluído: ${results.length} pares processados`);

    return new Response(
      JSON.stringify({ 
        message: 'Maturação forçada concluída',
        processedPairs: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
