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

        console.log(`💬 Turno ${currentCount + 1}: ${respondingChip.nome} vai responder para ${receivingChip.nome}`);

        // Preparar histórico vazio (sem banco de dados)
        const conversationHistory: any[] = [];

        // Determinar o prompt a usar
        const systemPrompt = pair.use_instance_prompt && pair.instance_prompt
          ? pair.instance_prompt
          : respondingChip.prompt;

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
        console.log(`✅ Resposta gerada: ${responseText.substring(0, 50)}...`);

        // Atualizar última atividade do par (SEM SALVAR MENSAGEM)
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
              
              // Apenas logar o erro, não pausar automaticamente
              if (errorData.includes('Connection Closed')) {
                console.warn(`⚠️ Conexão fechada detectada para par ${pair.id}, mas continuando tentativas`);
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
