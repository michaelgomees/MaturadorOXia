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

    const now = new Date();

    // Buscar TODOS os pares ativos (sem filtro de intervalo)
    // O cron job a cada 20s já controla o timing
    const { data: activePairs, error: pairsError } = await supabase
      .from('saas_pares_maturacao')
      .select('*')
      .in('status', ['running', 'active'])
      .eq('is_active', true);

    if (pairsError) {
      console.error('❌ Erro ao buscar pares:', pairsError);
      throw pairsError;
    }

    console.log(`📊 Query retornou ${activePairs?.length || 0} pares ativos`);

    if (!activePairs || activePairs.length === 0) {
      console.log('⚠️ Nenhum par ativo encontrado');
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum par ativo para processar', 
          processedPairs: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Encontrados ${activePairs.length} pares ativos para processar`);

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

        // Apenas logar status das conexões, mas continuar tentando enviar
        const chip1Connection = connections.find((c: any) => c.nome === pair.nome_chip1);
        const chip2Connection = connections.find((c: any) => c.nome === pair.nome_chip2);
        
        console.log(`📊 Status conexões: ${chip1Connection?.nome}=${chip1Connection?.status}, ${chip2Connection?.nome}=${chip2Connection?.status}`);

        // Determinar qual chip deve responder baseado no contador de mensagens
        // Se messages_count é par (0, 2, 4...), chip1 responde
        // Se messages_count é ímpar (1, 3, 5...), chip2 responde
        const currentCount = (pair as any).messages_count || 0;
        const isChip1Turn = currentCount % 2 === 0;
        
        let respondingChip = isChip1Turn ? chip1 : chip2;
        let receivingChip = isChip1Turn ? chip2 : chip1;

        const lastActivity = (pair as any).last_activity ? new Date((pair as any).last_activity) : null;
        const timeSinceLastMessage = lastActivity ? Math.floor((now.getTime() - lastActivity.getTime()) / 1000) : null;
        
        console.log(`💬 Turno ${currentCount + 1}: ${respondingChip.nome} (${respondingChip.evolution_instance_name}) vai responder para ${receivingChip.nome} (${receivingChip.telefone})`);
        console.log(`📊 Par ${pair.id}: messages_count=${currentCount}, status=${pair.status}, is_active=${pair.is_active}`);
        console.log(`⏱️ Tempo desde última mensagem: ${timeSinceLastMessage ? `${timeSinceLastMessage}s` : 'primeira mensagem'}`);

        // Preparar histórico vazio (sem banco de dados)
        const conversationHistory: any[] = [];

        // Determinar o prompt a usar
        const systemPrompt = pair.use_instance_prompt && pair.instance_prompt
          ? pair.instance_prompt
          : respondingChip.prompt;

        console.log(`📝 Prompt sendo usado para ${respondingChip.nome}:`);
        console.log(`   - Tipo: ${pair.use_instance_prompt ? 'INSTANCE PROMPT' : 'CHIP PROMPT'}`);
        console.log(`   - Preview: ${systemPrompt?.substring(0, 100) || 'NENHUM'}...`);
        console.log(`   - Tamanho: ${systemPrompt?.length || 0} caracteres`);

        const isFirstMessage = true; // Sempre primeira mensagem sem histórico

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
        console.log(`✅ Resposta gerada (${responseText.length} chars, ${responseText.split('\n').length} linhas):`);
        console.log(`   ${responseText}`);

        // Atualizar última atividade do par e incrementar contador
        // Sistema continua indefinidamente alternando entre os chips
        const newCount = currentCount + 1;

        const { error: updateError } = await supabase
          .from('saas_pares_maturacao')
          .update({ 
            last_activity: new Date().toISOString(),
            messages_count: newCount
          })
          .eq('id', pair.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar par ${pair.id}:`, updateError);
        } else {
          console.log(`✅ Par ${pair.id} atualizado: messages_count=${newCount}, próximo turno: ${newCount % 2 === 0 ? chip1.nome : chip2.nome}`);
        }

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
              console.log(`✅ Mensagem enviada via WhatsApp: ${respondingChip.nome} → ${receivingChip.telefone}`);
            } else {
              const errorData = await sendResponse.text();
              console.error(`❌ Erro ${sendResponse.status} ao enviar via Evolution API:`, errorData);
              
              // Logar o erro mas CONTINUAR tentando
              if (errorData.includes('Connection Closed')) {
                console.warn(`⚠️ Connection Closed para par ${pair.id} - sistema continuará tentando no próximo ciclo`);
              }
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
