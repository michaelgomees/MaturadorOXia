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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Iniciando ciclo de maturação contínua (3x por minuto)...');

    // Executar 3 vezes com intervalo de 20 segundos (0s, 20s, 40s)
    for (let i = 0; i < 3; i++) {
      if (i > 0) {
        console.log(`⏳ Aguardando 20s para próxima execução (${i}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 20000));
      }

      console.log(`\n🎯 Execução ${i + 1}/3 - ${new Date().toISOString()}`);
      const now = new Date();

    // Buscar pares que estão prontos para enviar mensagem
    // Agora verificamos: status ativo E (não está esperando resposta OU já passou o tempo da próxima mensagem)
    const { data: activePairs, error: pairsError } = await supabase
      .from('saas_pares_maturacao')
      .select('*')
      .in('status', ['running', 'active'])
      .eq('is_active', true)
      .or('waiting_response.eq.false,next_message_time.lte.' + now.toISOString());

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

        // Determinar qual chip deve responder baseado no último remetente
        // Isso garante alternância real de mensagens
        const currentCount = (pair as any).messages_count || 0;
        const lastSender = (pair as any).last_sender;
        const waitingResponse = (pair as any).waiting_response || false;
        
        // Se estamos esperando resposta do outro chip, pular este par
        if (waitingResponse) {
          console.log(`⏳ Par ${pair.id} aguardando resposta - pulando...`);
          continue;
        }
        
        // Primeira mensagem: chip1 começa
        // Mensagens seguintes: sempre o chip que NÃO enviou por último
        let isChip1Turn: boolean;
        if (currentCount === 0 || !lastSender) {
          isChip1Turn = true; // chip1 sempre começa
        } else {
          // Alternar: se chip1 enviou por último, agora é vez do chip2 e vice-versa
          isChip1Turn = lastSender === pair.nome_chip2;
        }
        
        let respondingChip = isChip1Turn ? chip1 : chip2;
        let receivingChip = isChip1Turn ? chip2 : chip1;

        const lastActivity = (pair as any).last_activity ? new Date((pair as any).last_activity) : null;
        const timeSinceLastMessage = lastActivity ? Math.floor((now.getTime() - lastActivity.getTime()) / 1000) : null;
        
        console.log(`💬 Turno ${currentCount + 1}: ${respondingChip.nome} (${respondingChip.evolution_instance_name}) vai responder para ${receivingChip.nome} (${receivingChip.telefone})`);
        console.log(`📊 Par ${pair.id}: messages_count=${currentCount}, status=${pair.status}, is_active=${pair.is_active}`);
        console.log(`⏱️ Tempo desde última mensagem: ${timeSinceLastMessage ? `${timeSinceLastMessage}s` : 'primeira mensagem'}`);

        // Preparar histórico vazio (sem banco de dados)
        const conversationHistory: any[] = [];

        // Buscar e gerenciar mídia
        let shouldSendMediaContent = false;
        let mediaContent: any = null;
        
        try {
          // Buscar configuração de mídia do usuário
          const { data: mediaConfig, error: configError } = await supabase
            .from('saas_media_config')
            .select('*')
            .eq('usuario_id', pair.usuario_id)
            .single();

          if (!configError && mediaConfig) {
            // Buscar ou criar tracker para este par
            let { data: tracker, error: trackerError } = await supabase
              .from('saas_media_usage_trackers')
              .select('*')
              .eq('pair_id', pair.id)
              .single();

            const currentHour = new Date().getHours();

            if (trackerError || !tracker) {
              // Criar novo tracker
              const { data: newTracker, error: createError } = await supabase
                .from('saas_media_usage_trackers')
                .insert({
                  pair_id: pair.id,
                  usuario_id: pair.usuario_id,
                  images_used_this_hour: 0,
                  links_used_in_conversation: 0,
                  message_count: currentCount,
                  last_reset_hour: currentHour
                })
                .select()
                .single();

              if (!createError) tracker = newTracker;
            } else {
              // Reset contador de imagens se mudou a hora
              if (tracker.last_reset_hour !== currentHour) {
                await supabase
                  .from('saas_media_usage_trackers')
                  .update({
                    images_used_this_hour: 0,
                    last_reset_hour: currentHour
                  })
                  .eq('id', tracker.id);
                
                tracker.images_used_this_hour = 0;
              }

              // Atualizar contador de mensagens
              await supabase
                .from('saas_media_usage_trackers')
                .update({ message_count: currentCount })
                .eq('id', tracker.id);
            }

            if (tracker) {
              // Buscar itens de mídia ativos
              const { data: mediaItems, error: itemsError } = await supabase
                .from('saas_media_items')
                .select('*')
                .eq('usuario_id', pair.usuario_id)
                .eq('is_active', true);

              if (!itemsError && mediaItems && mediaItems.length > 0) {
                // Verificar cada tipo de mídia
                for (const item of mediaItems) {
                  // Verificar se deve enviar baseado na frequência
                  if (currentCount > 0 && currentCount % item.frequency === 0) {
                    // Verificar limites
                    if (item.type === 'image' && tracker.images_used_this_hour >= mediaConfig.max_images_per_hour) {
                      console.log(`⚠️ Limite de imagens atingido (${tracker.images_used_this_hour}/${mediaConfig.max_images_per_hour})`);
                      continue;
                    }
                    
                    if (item.type === 'link' && tracker.links_used_in_conversation >= mediaConfig.max_links_per_conversation) {
                      console.log(`⚠️ Limite de links atingido (${tracker.links_used_in_conversation}/${mediaConfig.max_links_per_conversation})`);
                      continue;
                    }

                    // Selecionar item aleatório ou por ordem
                    const eligibleItems = mediaItems.filter(m => 
                      m.type === item.type && 
                      m.is_active &&
                      currentCount % m.frequency === 0
                    );

                    if (eligibleItems.length > 0) {
                      if (mediaConfig.randomize_selection) {
                        mediaContent = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
                      } else {
                        // Ordenar por usage_count (menor primeiro)
                        eligibleItems.sort((a, b) => a.usage_count - b.usage_count);
                        mediaContent = eligibleItems[0];
                      }

                      shouldSendMediaContent = true;
                      console.log(`📷 Momento de enviar mídia! Mensagem #${currentCount}, Tipo: ${mediaContent.type}, Nome: ${mediaContent.name}`);

                      // Atualizar contadores
                      if (mediaContent.type === 'image') {
                        await supabase
                          .from('saas_media_usage_trackers')
                          .update({ 
                            images_used_this_hour: tracker.images_used_this_hour + 1,
                            last_image_time: new Date().toISOString()
                          })
                          .eq('id', tracker.id);
                      } else if (mediaContent.type === 'link') {
                        await supabase
                          .from('saas_media_usage_trackers')
                          .update({ 
                            links_used_in_conversation: tracker.links_used_in_conversation + 1
                          })
                          .eq('id', tracker.id);
                      }

                      // Atualizar item de mídia
                      await supabase
                        .from('saas_media_items')
                        .update({ 
                          usage_count: mediaContent.usage_count + 1,
                          last_used: new Date().toISOString()
                        })
                        .eq('id', mediaContent.id);

                      break; // Enviar apenas um tipo de mídia por mensagem
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.log('⚠️ Erro ao processar mídia:', e);
          console.log('⚠️ Continuando apenas com texto');
        }

        let responseText = '';

        // Verificar modo de maturação
        const maturationMode = (pair as any).maturation_mode || 'prompts';
        console.log(`🎯 Modo de maturação: ${maturationMode}`);

        if (maturationMode === 'messages') {
          // Modo mensagens: buscar mensagem ALEATÓRIA do arquivo
          console.log(`📋 Buscando mensagem aleatória do arquivo para o par ${pair.id}`);
          
          // Buscar arquivo de mensagens ativo do usuário
          const { data: messageFile, error: messageFileError } = await supabase
            .from('saas_maturation_messages')
            .select('*')
            .eq('usuario_id', pair.usuario_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (messageFileError || !messageFile) {
            console.error(`❌ Nenhum arquivo de mensagens ativo encontrado:`, messageFileError);
            responseText = 'oi, tudo bem?';
          } else {
            const messages = messageFile.mensagens || [];
            const totalMessages = messages.length;
            
            console.log(`📚 Arquivo: ${messageFile.nome}, Total: ${totalMessages} mensagens`);
            
            if (totalMessages === 0) {
              console.error(`❌ Arquivo de mensagens vazio`);
              responseText = 'oi, tudo bem?';
            } else {
              // Pegar mensagem ALEATÓRIA
              const randomIndex = Math.floor(Math.random() * totalMessages);
              responseText = messages[randomIndex];
              
              console.log(`🎲 Mensagem aleatória ${randomIndex + 1}/${totalMessages}: ${responseText}`);
            }
          }
        } else {
          // Modo prompts: usar IA
          console.log(`🤖 Usando IA para gerar mensagem`);
          
          const systemPrompt = pair.use_instance_prompt && pair.instance_prompt
            ? pair.instance_prompt
            : respondingChip.prompt;

          console.log(`📝 Prompt sendo usado para ${respondingChip.nome}:`);
          console.log(`   - Tipo: ${pair.use_instance_prompt ? 'INSTANCE PROMPT' : 'CHIP PROMPT'}`);
          console.log(`   - Preview: ${systemPrompt?.substring(0, 100) || 'NENHUM'}...`);
          console.log(`   - Tamanho: ${systemPrompt?.length || 0} caracteres`);

          const isFirstMessage = true;

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
            responseText = 'oi, tudo bem?';
          } else {
            responseText = aiResponse.message;
            console.log(`✅ Resposta gerada (${responseText.length} chars, ${responseText.split('\n').length} linhas):`);
            console.log(`   ${responseText}`);
          }
        }

        // Atualizar última atividade do par e configurar para esperar resposta
        // Sistema agora espera resposta antes de enviar próxima mensagem
        const newCount = currentCount + 1;
        
        // Calcular próximo horário de mensagem (delay humanizado entre 30-90 segundos)
        const delaySeconds = Math.floor(Math.random() * 61) + 30; // 30-90 segundos
        const nextMessageTime = new Date(now.getTime() + delaySeconds * 1000);

        const updateData: any = {
          last_activity: new Date().toISOString(),
          messages_count: newCount,
          last_sender: respondingChip.nome,
          waiting_response: true, // Agora vamos esperar a resposta
          next_message_time: nextMessageTime.toISOString()
        };

        const { error: updateError } = await supabase
          .from('saas_pares_maturacao')
          .update(updateData)
          .eq('id', pair.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar par ${pair.id}:`, updateError);
        } else {
          console.log(`✅ Par ${pair.id} atualizado: messages_count=${newCount}`);
          console.log(`   🔄 Aguardando resposta de ${receivingChip.nome}`);
          console.log(`   ⏱️ Próxima janela em ${delaySeconds}s (${nextMessageTime.toLocaleTimeString()})`);
        }

        // Enviar mensagem via Evolution API
        try {
          const evolutionEndpoint = Deno.env.get('EVOLUTION_API_ENDPOINT');
          const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

          if (!evolutionEndpoint || !evolutionApiKey) {
            console.warn('⚠️ Evolution API não configurada, pulando envio');
          } else {
            // Determinar tipo de envio baseado em mídia
            let sendMessageUrl: string;
            let messageBody: any;

            if (shouldSendMediaContent && mediaContent) {
              // Enviar com mídia
              if (mediaContent.type === 'image') {
                sendMessageUrl = `${evolutionEndpoint}/message/sendMedia/${respondingChip.evolution_instance_name}`;
                messageBody = {
                  number: receivingChip.telefone,
                  mediatype: 'image',
                  media: mediaContent.url,
                  caption: mediaContent.mode === 'image_text' ? responseText : ''
                };
                console.log(`📷 Enviando imagem: ${mediaContent.name}`);
              } else if (mediaContent.type === 'link') {
                sendMessageUrl = `${evolutionEndpoint}/message/sendText/${respondingChip.evolution_instance_name}`;
                messageBody = {
                  number: receivingChip.telefone,
                  text: `${responseText}\n\n🔗 ${mediaContent.url}`
                };
                console.log(`🔗 Enviando link: ${mediaContent.name}`);
              } else if (mediaContent.type === 'audio') {
                sendMessageUrl = `${evolutionEndpoint}/message/sendMedia/${respondingChip.evolution_instance_name}`;
                messageBody = {
                  number: receivingChip.telefone,
                  mediatype: 'audio',
                  media: mediaContent.url
                };
                console.log(`🔊 Enviando áudio: ${mediaContent.name}`);
              } else {
                // Fallback para texto simples
                sendMessageUrl = `${evolutionEndpoint}/message/sendText/${respondingChip.evolution_instance_name}`;
                messageBody = {
                  number: receivingChip.telefone,
                  text: responseText
                };
              }
            } else {
              // Enviar apenas texto
              sendMessageUrl = `${evolutionEndpoint}/message/sendText/${respondingChip.evolution_instance_name}`;
              messageBody = {
                number: receivingChip.telefone,
                text: responseText
              };
            }

            const sendResponse = await fetch(sendMessageUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionApiKey
              },
              body: JSON.stringify(messageBody)
            });

            if (sendResponse.ok) {
              const contentType = shouldSendMediaContent && mediaContent 
                ? `${mediaContent.type} (${mediaContent.name})` 
                : 'texto';
              console.log(`✅ Mensagem enviada via WhatsApp (${contentType}): ${respondingChip.nome} → ${receivingChip.telefone}`);
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
