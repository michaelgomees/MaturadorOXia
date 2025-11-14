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
  maturation_mode: string;
  current_message_index: number;
  loop_messages: boolean;
  message_file_id: string | null;
}

interface Connection {
  id: string;
  nome: string;
  telefone: string;
  prompt: string;
  evolution_instance_name: string;
}

// 🔧 Função auxiliar para processar lista de pares
async function processPairs(pairs: ChipPair[], supabase: any, now: Date) {
  const results = [];
  
  for (const pair of pairs) {
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ✨ VERIFICAR SE É UMA CHAMADA FORÇADA PARA UM PAR ESPECÍFICO
    let forcedPairId: string | null = null;
    try {
      const body = await req.json();
      forcedPairId = body?.pairId || null;
    } catch (e) {
      // Não é problema se não tem body
    }

    if (forcedPairId) {
      // 🔥 MODO FORÇADO: Processar APENAS este par IMEDIATAMENTE
      console.log(`🔥 MODO FORÇADO ATIVADO! Processando par específico: ${forcedPairId}`);
      const now = new Date();

      const { data: specificPair, error: pairError } = await supabase
        .from('saas_pares_maturacao')
        .select('*')
        .eq('id', forcedPairId)
        .single();

      if (pairError || !specificPair) {
        console.error('❌ Par não encontrado:', pairError);
        return new Response(
          JSON.stringify({ error: 'Par não encontrado', pairId: forcedPairId }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Forçar status como running e is_active = true
      if (specificPair.status !== 'running' || !specificPair.is_active) {
        console.log(`🔧 Forçando par para running/active...`);
        await supabase
          .from('saas_pares_maturacao')
          .update({ status: 'running', is_active: true, last_activity: now.toISOString() })
          .eq('id', forcedPairId);
      }

      const activePairs = [specificPair];
      console.log(`✅ Par ${forcedPairId} carregado para processamento IMEDIATO`);

      // Processar o par (código compartilhado abaixo)
      const results = await processPairs(activePairs as ChipPair[], supabase, now);

      return new Response(
        JSON.stringify({ 
          message: '🔥 Par processado imediatamente via MODO FORÇADO',
          forced: true,
          pairId: forcedPairId,
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔄 MODO NORMAL: Ciclo de 3 execuções
    console.log('🔄 Iniciando ciclo de maturação contínua (3x por minuto)...');

    // Executar 3 vezes com intervalo de 20 segundos (0s, 20s, 40s)
    for (let i = 0; i < 3; i++) {
      if (i > 0) {
        console.log(`⏳ Aguardando 20s para próxima execução (${i}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 20000));
      }

      console.log(`\n🎯 Execução ${i + 1}/3 - ${new Date().toISOString()}`);
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

    // Processar cada par usando a função auxiliar
    const results = await processPairs(activePairs as ChipPair[], supabase, now);

      console.log(`✅ Execução ${i + 1}/3 concluída: ${results.length} pares processados`);
    }

    console.log(`\n🎉 Ciclo completo de maturação finalizado!`);

    return new Response(
      JSON.stringify({ 
        message: 'Ciclo de maturação concluído (3 execuções)',
        totalExecutions: 3,
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
