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
  messages_count: number;
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
  status: string;
}

// 🔧 Verificar status da instância na Evolution API
async function checkInstanceStatus(instanceName: string): Promise<boolean> {
  try {
    const EVOLUTION_API_ENDPOINT = Deno.env.get('EVOLUTION_API_ENDPOINT') || 'https://api.oxautomacoes.com.br';
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || '';

    console.log(`🔍 Verificando status da instância ${instanceName}...`);

    const response = await fetch(`${EVOLUTION_API_ENDPOINT}/instance/fetchInstances?instanceName=${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });

    if (!response.ok) {
      console.error(`❌ Erro ao verificar instância ${instanceName}: ${response.status}`);
      return false;
    }

    const data = await response.json();
    const instance = Array.isArray(data) ? data[0] : data;
    
    if (instance && instance.connectionStatus === 'open') {
      console.log(`✅ Instância ${instanceName} está conectada`);
      return true;
    }

    console.warn(`⚠️ Instância ${instanceName} não está conectada. Status: ${instance?.connectionStatus || 'desconhecido'}`);
    return false;
  } catch (error) {
    console.error(`❌ Erro ao verificar instância ${instanceName}:`, error);
    return false;
  }
}

// 🔧 Função auxiliar para processar um único par
async function processSinglePair(pair: ChipPair, supabase: any) {
  try {
    console.log(`\n🎯 Processando par: ${pair.nome_chip1} <-> ${pair.nome_chip2}`);
    console.log(`📊 Par ${pair.id}: messages_count=${pair.messages_count}, status=${pair.status}, is_active=true`);
    
    // Buscar conexões dos chips pelo evolution_instance_name
    const { data: connections, error: connError } = await supabase
      .from('saas_conexoes')
      .select('*')
      .eq('usuario_id', pair.usuario_id)
      .in('evolution_instance_name', [pair.nome_chip1, pair.nome_chip2]);

    if (connError) {
      console.error(`❌ Erro ao buscar conexões do par ${pair.id}:`, connError);
      return { error: 'Erro ao buscar conexões' };
    }

    if (!connections || connections.length === 0) {
      console.error(`❌ Nenhuma conexão encontrada para o par ${pair.id}`);
      console.log(`🔍 Tentando buscar por: ${pair.nome_chip1} e ${pair.nome_chip2}`);
      return { error: 'Conexões não encontradas' };
    }

    const chip1 = connections.find((c: Connection) => c.evolution_instance_name === pair.nome_chip1);
    const chip2 = connections.find((c: Connection) => c.evolution_instance_name === pair.nome_chip2);

    if (!chip1 || !chip2) {
      console.error(`❌ Chips não encontrados para o par ${pair.id}`);
      console.log(`📊 Conexões encontradas: ${connections.map(c => c.evolution_instance_name).join(', ')}`);
      return { error: 'Chips não encontrados' };
    }

    console.log(`📊 Status conexões: ${chip1.nome}=${chip1.status}, ${chip2.nome}=${chip2.status}`);

    // 🔐 Verificar se ambas as instâncias estão conectadas na Evolution API
    const chip1Connected = await checkInstanceStatus(chip1.evolution_instance_name);
    const chip2Connected = await checkInstanceStatus(chip2.evolution_instance_name);

    if (!chip1Connected) {
      console.error(`❌ Instância ${chip1.evolution_instance_name} não está conectada`);
      return { error: `Instância ${chip1.nome} desconectada` };
    }

    if (!chip2Connected) {
      console.error(`❌ Instância ${chip2.evolution_instance_name} não está conectada`);
      return { error: `Instância ${chip2.nome} desconectada` };
    }

    console.log(`✅ Ambas as instâncias estão conectadas!`);

    // Verificar tempo desde última atividade
    const now = new Date();
    const lastActivity = new Date(pair.last_activity || now);
    const timeSinceLastMessage = Math.floor((now.getTime() - lastActivity.getTime()) / 1000);
    console.log(`⏱️ Tempo desde última mensagem: ${timeSinceLastMessage}s`);

    // Determinar turno (alterna entre chips)
    const currentTurn = pair.messages_count % 2 === 0 ? 1 : 2;
    const sender = currentTurn === 1 ? chip1 : chip2;
    const receiver = currentTurn === 1 ? chip2 : chip1;

    console.log(`💬 Turno ${pair.messages_count + 1}: ${sender.nome} (${sender.evolution_instance_name}) vai responder para ${receiver.nome} (${receiver.telefone})`);

    // Verificar modo de maturação
    const maturationMode = pair.maturation_mode || 'prompts';
    console.log(`🎯 Modo de maturação: ${maturationMode}`);

    let messageToSend = '';
    let mediaToSend: any = null;

    // MODO MESSAGES: Buscar mensagem de TODOS os arquivos ativos
    if (maturationMode === 'messages') {
      console.log(`📋 Buscando mensagens de TODOS os arquivos ativos do usuário`);
      
      // Buscar TODOS os arquivos de mensagens ativos
      const { data: messageFiles, error: fileError } = await supabase
        .from('saas_maturation_messages')
        .select('*')
        .eq('usuario_id', pair.usuario_id)
        .eq('is_active', true);

      if (fileError || !messageFiles || messageFiles.length === 0) {
        console.error('❌ Erro ao buscar arquivos de mensagens:', fileError);
        return { error: 'Nenhum arquivo de mensagens ativo encontrado' };
      }

      // Selecionar arquivo aleatório entre os disponíveis
      const randomFileIndex = Math.floor(Math.random() * messageFiles.length);
      const messageFile = messageFiles[randomFileIndex];
      
      console.log(`🎲 Selecionado arquivo ${randomFileIndex + 1}/${messageFiles.length}: ${messageFile.nome} (${messageFile.total_mensagens} mensagens)`);

      const mensagens = messageFile.mensagens as any[];

      if (!mensagens || mensagens.length === 0) {
        console.error('❌ Arquivo sem mensagens válidas');
        return { error: 'Arquivo sem mensagens' };
      }

      // Selecionar mensagem aleatória
      const randomIndex = Math.floor(Math.random() * mensagens.length);
      const selectedMessage = mensagens[randomIndex];
      
      console.log(`🔍 Debug: tipo da mensagem = ${typeof selectedMessage}, valor inicial:`, String(selectedMessage).substring(0, 50));

      // Verificar se a mensagem é string simples ou objeto
      if (typeof selectedMessage === 'string') {
        // Mensagem é string simples (formato padrão dos arquivos TXT/CSV)
        messageToSend = selectedMessage;
        console.log(`🎲 Mensagem aleatória ${randomIndex + 1}/${mensagens.length}: ${messageToSend.substring(0, 60)}...`);
      } else if (typeof selectedMessage === 'object') {
        // Mensagem é objeto (pode ter mídia)
        console.log(`🎲 Mensagem aleatória ${randomIndex + 1}/${mensagens.length}: ${selectedMessage.texto?.substring(0, 60) || selectedMessage.nome || 'objeto'}...`);

        // Verificar se é mídia
        if (selectedMessage.tipo === 'image' || selectedMessage.tipo === 'video' || selectedMessage.tipo === 'audio') {
          console.log(`📷 Momento de enviar mídia! Mensagem #${pair.messages_count + 1}, Tipo: ${selectedMessage.tipo}, Nome: ${selectedMessage.nome}`);
          mediaToSend = {
            type: selectedMessage.tipo,
            url: selectedMessage.url || selectedMessage.nome,
            caption: selectedMessage.texto || ''
          };
        } else {
          messageToSend = selectedMessage.texto || selectedMessage.nome || 'Mensagem do arquivo';
        }
      } else {
        console.error('❌ Formato de mensagem inválido:', typeof selectedMessage);
        messageToSend = 'Olá! Tudo bem?';
      }
    } 
    // MODO PROMPTS: Gerar mensagem via AI (implementação simplificada)
    else {
      console.log('🤖 Modo prompts - gerando mensagem simples');
      messageToSend = `Olá! Como vai? ${new Date().toLocaleTimeString()}`;
    }

    // Enviar mensagem via Evolution API
    const EVOLUTION_API_ENDPOINT = Deno.env.get('EVOLUTION_API_ENDPOINT') || 'https://api.oxautomacoes.com.br';
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || '';

    try {
      let sendPayload: any;
      let sendUrl: string;

      if (mediaToSend) {
        // Enviar mídia
        console.log(`📷 Enviando ${mediaToSend.type}: ${mediaToSend.url}`);
        
        sendUrl = `${EVOLUTION_API_ENDPOINT}/message/sendMedia/${sender.evolution_instance_name}`;
        sendPayload = {
          number: receiver.telefone,
          mediatype: mediaToSend.type,
          media: mediaToSend.url,
          caption: mediaToSend.caption || ''
        };
      } else {
        // Enviar texto
        sendUrl = `${EVOLUTION_API_ENDPOINT}/message/sendText/${sender.evolution_instance_name}`;
        sendPayload = {
          number: receiver.telefone,
          text: messageToSend
        };
      }

      const sendResponse = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify(sendPayload)
      });

      const sendResult = await sendResponse.json();

      if (!sendResponse.ok) {
        console.error(`❌ Erro ${sendResponse.status} ao enviar via Evolution API:`, JSON.stringify(sendResult));
        return { error: 'Falha ao enviar mensagem' };
      }

      console.log(`✅ Mensagem enviada via WhatsApp (${mediaToSend ? mediaToSend.type : 'texto'}): ${sender.evolution_instance_name} → ${receiver.telefone}`);

      // Atualizar contador de mensagens do par
      const nextTurn = (pair.messages_count + 1) % 2 === 0 ? pair.nome_chip1 : pair.nome_chip2;
      const { error: updateError } = await supabase
        .from('saas_pares_maturacao')
        .update({
          messages_count: pair.messages_count + 1,
          last_activity: new Date().toISOString()
        })
        .eq('id', pair.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar contador:', updateError);
      } else {
        console.log(`✅ Par ${pair.id} atualizado: messages_count=${pair.messages_count + 1}, próximo turno: ${nextTurn}`);
      }

      return { success: true, messagesSent: 1 };
    } catch (sendError) {
      console.error('❌ Erro ao enviar mensagem:', sendError);
      return { error: String(sendError) };
    }
  } catch (error) {
    console.error('❌ Erro ao processar par:', error);
    return { error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🛑 VERIFICAÇÃO RÁPIDA: Se não há pares ativos, retornar imediatamente
    // (economiza recursos e para todas as operações quando não há nada para processar)
    const { data: quickCheck, error: quickCheckError } = await supabase
      .from('saas_pares_maturacao')
      .select('id')
      .eq('is_active', true)
      .eq('status', 'running')
      .limit(1);

    // Se não encontrou nenhum par ativo E não é uma chamada forçada, retornar
    let forcedPairId: string | null = null;
    try {
      const body = await req.json();
      forcedPairId = body?.pairId || null;
    } catch (e) {
      // Não é problema se não tem body
    }

    if (!forcedPairId && (quickCheckError || !quickCheck || quickCheck.length === 0)) {
      console.log('⏸️ Nenhum par ativo. Pulando execução da maturação.');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhum par ativo para processar',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ✨ VERIFICAR SE É UMA CHAMADA FORÇADA PARA UM PAR ESPECÍFICO

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
      console.log(`🔧 Forçando par para running/active...`);
      await supabase
        .from('saas_pares_maturacao')
        .update({ 
          status: 'running', 
          is_active: true, 
          last_activity: now.toISOString(),
          started_at: specificPair.started_at || now.toISOString()
        })
        .eq('id', forcedPairId);
      
      // Recarregar o par atualizado
      const { data: updatedPair } = await supabase
        .from('saas_pares_maturacao')
        .select('*')
        .eq('id', forcedPairId)
        .single();

      if (!updatedPair) {
        return new Response(
          JSON.stringify({ error: 'Erro ao recarregar par atualizado' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Processar o par imediatamente
      console.log(`⚡ Processando par AGORA...`);
      const result = await processSinglePair(updatedPair, supabase);

      return new Response(
        JSON.stringify({ 
          success: !result.error,
          pairId: forcedPairId,
          pairName: `${updatedPair.nome_chip1} <-> ${updatedPair.nome_chip2}`,
          result 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔄 MODO CONTÍNUO: Processar todos os pares ativos em ciclos
    console.log('🔄 Iniciando ciclo de maturação contínua (3x por minuto)...');

    const allResults = [];
    for (let i = 0; i < 3; i++) {
      console.log(`\n🎯 Execução ${i + 1}/3 - ${new Date().toISOString()}`);

      // Buscar todos os pares ativos
      const { data: activePairs, error: pairsError } = await supabase
        .from('saas_pares_maturacao')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'running');

      if (pairsError) {
        console.error('❌ Erro ao buscar pares ativos:', pairsError);
        continue;
      }

      console.log(`✅ Encontrados ${activePairs?.length || 0} pares ativos para processar`);
      console.log(`📊 Query retornou ${activePairs?.length || 0} pares ativos`);

      if (activePairs && activePairs.length > 0) {
        for (const pair of activePairs) {
          const now = new Date();
          const lastActivity = new Date(pair.last_activity);
          const timeSinceLastMessage = Math.floor((now.getTime() - lastActivity.getTime()) / 1000);

          // Processar apenas se passaram mais de 30 segundos
          if (timeSinceLastMessage >= 30) {
            const result = await processSinglePair(pair, supabase);
            allResults.push({ pairId: pair.id, result });
          } else {
            console.log(`⏭️ Aguardando intervalo mínimo (${30 - timeSinceLastMessage}s restantes)`);
          }
        }
      }

      // Aguardar 20 segundos antes da próxima execução (exceto na última)
      if (i < 2) {
        console.log('⏳ Aguardando 20 segundos...');
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
    }

    console.log(`\n🎉 Ciclo completo de maturação finalizado!`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        executions: 3, 
        results: allResults 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
