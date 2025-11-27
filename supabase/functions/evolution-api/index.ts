import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0'

// Função para enviar mensagens
async function handleSendMessage(request: SendMessageRequest) {
  console.log('📤 Enviando mensagem:', request);
  
  // Validar entrada
  if (!request.instanceName || !request.to || !request.message) {
    return new Response(JSON.stringify({
      success: false,
      error: 'instanceName, to, and message are required'
    }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Usar dados dos secrets configurados
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  let endpoint = Deno.env.get('EVOLUTION_API_ENDPOINT');
  
  if (!apiKey || !endpoint) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Evolution API credentials not configured. Please configure EVOLUTION_API_KEY and EVOLUTION_API_ENDPOINT in Supabase secrets.'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Garantir protocolo
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = `https://${endpoint}`;
  }
  
  // Remover barras finais para evitar URLs malformadas
  endpoint = endpoint.replace(/\/+$/, '');
  
  // Limpar API Key
  const cleanApiKey = apiKey.trim();

  try {
    // Construir payload para a Evolution API
    const payload = {
      number: request.to,
      text: request.message
    };

    console.log('🔄 Enviando para Evolution API:', {
      url: `${endpoint}/message/sendText/${request.instanceName}`,
      payload
    });

    // Fazer a requisição para a Evolution API
    const response = await fetch(`${endpoint}/message/sendText/${request.instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cleanApiKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    console.log('📥 Resposta da Evolution API:', responseData);

    if (!response.ok) {
      console.error('❌ Erro na Evolution API:', responseData);
      
      // Apenas logar o erro, não pausar automaticamente
      const errorMessage = JSON.stringify(responseData);
      if (errorMessage.includes('Connection Closed')) {
        console.warn('⚠️ Conexão WhatsApp fechada detectada para:', request.instanceName);
        console.log('💡 Usuário deve reconectar o WhatsApp manualmente');
      }
      
      return new Response(JSON.stringify({
        success: false,
        error: responseData.message || 'Failed to send message',
        details: responseData
      }), { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Sucesso
    return new Response(JSON.stringify({
      success: true,
      message: 'Message sent successfully',
      data: responseData
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro interno ao enviar mensagem:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateInstanceRequest {
  instanceName: string;
  connectionName: string;
  evolutionEndpoint?: string;
  evolutionApiKey?: string;
}

interface SendMessageRequest {
  action: 'sendMessage';
  instanceName: string;
  to: string;
  message: string;
}

interface EvolutionAPIResponse {
  success: boolean;
  qrCode?: string;
  instanceName?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      const requestBody = await req.json()

      // Normaliza payloads antigos e novos para envio de mensagem
      const isSendMessage =
        requestBody.action === 'sendMessage' ||
        ((requestBody.instanceName || requestBody.instance) &&
          (requestBody.to || requestBody.number) &&
          (requestBody.message || requestBody.text));

      if (isSendMessage) {
        const normalized: SendMessageRequest = {
          action: 'sendMessage',
          instanceName: requestBody.instanceName || requestBody.instance,
          to: requestBody.to || requestBody.number,
          message: requestBody.message || requestBody.text,
        };
        console.log('➡️ Normalized sendMessage payload:', normalized);
        return await handleSendMessage(normalized);
      }
      
      // Criação de instância (action: 'create' ou sem action)
      const { instanceName, connectionName, action }: CreateInstanceRequest & { action?: string } = requestBody
      
      console.log('📋 Request para criar instância:', { instanceName, connectionName, action });
      
      if (!instanceName || !connectionName) {
        return new Response(
          JSON.stringify({ success: false, error: 'instanceName and connectionName are required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Usar APENAS credenciais dos secrets do Supabase (mais seguro)
      const apiKey = Deno.env.get('EVOLUTION_API_KEY')
      let endpoint = Deno.env.get('EVOLUTION_API_ENDPOINT')
      
      console.log('🔍 Verificando secrets:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        hasEndpoint: !!endpoint,
        endpoint: endpoint,
        allEnvKeys: Object.keys(Deno.env.toObject()).filter(k => k.includes('EVOLUTION'))
      });
      
      if (!apiKey || !endpoint) {
        console.error('❌ Secrets não encontrados!');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Evolution API não configurada. Por favor, adicione os secrets EVOLUTION_API_KEY e EVOLUTION_API_ENDPOINT no Supabase.',
            availableSecrets: Object.keys(Deno.env.toObject()).filter(k => k.includes('EVOLUTION'))
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Garantir que o endpoint tenha o protocolo HTTPS
      if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        endpoint = `https://${endpoint}`;
      }
      
      // Remover barras finais para evitar URLs malformadas
      endpoint = endpoint.replace(/\/+$/, '');
      
      const cleanApiKey = apiKey.trim();

      try {
        // Primeiro, verificar se a instância já existe
        console.log('📋 Verificando se instância existe:', instanceName);
        
        const checkResponse = await fetch(`${endpoint}/instance/fetchInstances?instanceName=${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': cleanApiKey,
            'Accept': 'application/json'
          }
        });

        let instanceExists = false;
        if (checkResponse.ok) {
          const instances = await checkResponse.json();
          instanceExists = Array.isArray(instances) && instances.length > 0;
        }

        // Se não existir, criar a instância
        if (!instanceExists) {
          console.log('➕ Criando nova instância na Evolution API...');
          
          const createPayload = {
            instanceName: instanceName,
            token: cleanApiKey,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
          };

          console.log('📤 Requisição:', {
            url: `${endpoint}/instance/create`,
            method: 'POST',
            headers: {
              'apikey': cleanApiKey,
              'Content-Type': 'application/json'
            }
          });

          const createResponse = await fetch(`${endpoint}/instance/create`, {
            method: 'POST',
            headers: {
              'apikey': cleanApiKey,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(createPayload)
          });

          const createData = await createResponse.json();
          console.log('📥 Resposta da Evolution API:', {
            status: createResponse.status,
            statusText: createResponse.statusText,
            data: createData
          });

          if (!createResponse.ok) {
            // Se o erro for 403 e a mensagem indicar que já existe, continuar normalmente
            if (createResponse.status === 403 && 
                (createData.message?.some((m: string) => m.includes('already in use')) || 
                 createData.error?.includes('already in use'))) {
              console.log('ℹ️ Instância já existe (erro 403), continuando...');
              instanceExists = true;
            } else {
              console.error('❌ Erro ao criar instância:', {
                status: createResponse.status,
                response: createData
              });
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  error: `Erro ao criar instância: ${createData.message || createData.error || 'Erro desconhecido'}`,
                  details: {
                    status: createResponse.status,
                    error: createData.error,
                    response: createData.response || createData
                  }
                }),
                { 
                  status: createResponse.status, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              );
            }
          } else {
            console.log('✅ Instância criada com sucesso!');
          }
        } else {
          console.log('ℹ️ Instância já existe, buscando informações...');
        }

        // Buscar QR code
        console.log('🔄 Buscando QR code da instância criada/existente...');
        let qrCode = null;
        
        try {
          const qrResponse = await fetch(`${endpoint}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: {
              'apikey': cleanApiKey,
              'Accept': 'application/json'
            }
          });

          if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            console.log('📱 QR Data completo:', JSON.stringify(qrData, null, 2));
            
            // Tentar diferentes formatos possíveis
            qrCode = qrData.base64 || 
                    qrData.qrcode || 
                    qrData.code ||
                    qrData.qr ||
                    qrData.pairingCode ||
                    (qrData.instance && qrData.instance.qrcode);
            
            if (qrCode) {
              console.log('✅ QR code encontrado!');
            } else {
              console.log('⚠️ QR code não encontrado na resposta. Campos disponíveis:', Object.keys(qrData));
            }
          } else {
            console.log('❌ Falha ao buscar QR code:', qrResponse.status);
          }
        } catch (e) {
          console.log('❌ Erro ao buscar QR code:', e);
        }

        // Retornar sucesso com QR code
        return new Response(
          JSON.stringify({
            success: true,
            qrCode: qrCode,
            instanceName: instanceName,
            created: !instanceExists
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('❌ Erro de rede ao conectar com Evolution API:', error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Erro de conexão: ${error.message}. Verifique se o endpoint ${endpoint} está acessível.`,
            details: error.stack,
            endpoint: endpoint
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const instanceName = url.searchParams.get('instanceName')
      const action = url.searchParams.get('action') || 'qrcode'
      
      console.log('📥 GET Request:', { instanceName, action });
      
      // Endpoint para listar TODAS as instâncias
      if (action === 'listAll') {
        console.log('📋 Listing all instances from Evolution API');
        
        const apiKey = Deno.env.get('EVOLUTION_API_KEY');
        let endpoint = Deno.env.get('EVOLUTION_API_ENDPOINT');
        
        if (!apiKey || !endpoint) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Evolution API credentials not configured'
          }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
          endpoint = `https://${endpoint}`;
        }
        
        // Remover barras finais para evitar URLs malformadas
        endpoint = endpoint.replace(/\/+$/, '');
        
        const cleanApiKey = apiKey.trim();
        
        try {
          console.log('🔄 Fetching all instances from:', `${endpoint}/instance/fetchInstances`);
          
          const response = await fetch(`${endpoint}/instance/fetchInstances`, {
            method: 'GET',
            headers: {
              'apikey': cleanApiKey,
              'Accept': 'application/json'
            }
          });

          // Ler resposta como texto para evitar erros de JSON quando a API retorna HTML
          const rawBody = await response.text();
          const contentSnippet = rawBody.slice(0, 500);

          if (!response.ok) {
            console.error('❌ Failed to fetch instances (non-200):', {
              status: response.status,
              bodyPreview: contentSnippet
            });
            
            return new Response(JSON.stringify({
              success: false,
              error: `Failed to fetch instances: ${response.status}`,
              details: contentSnippet
            }), { 
              status: response.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          let instances: unknown;
          try {
            instances = JSON.parse(rawBody);
          } catch (parseError) {
            console.error('❌ Evolution API returned non-JSON body for fetchInstances:', contentSnippet);
            return new Response(JSON.stringify({
              success: false,
              error: 'Evolution API returned invalid JSON for fetchInstances',
              details: contentSnippet
            }), {
              status: 502,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          console.log('✅ Instances fetched:', Array.isArray(instances) ? instances.length : 0);
          
          return new Response(JSON.stringify({
            success: true,
            instances: Array.isArray(instances) ? instances : [],
            total: Array.isArray(instances) ? instances.length : 0
          }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('❌ Error fetching instances:', error);
          
          return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            details: error.message
          }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      
      if (!instanceName) {
        return new Response(
          JSON.stringify({ success: false, error: 'instanceName parameter is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Usar dados dos secrets configurados
      const apiKey = Deno.env.get('EVOLUTION_API_KEY')
      let endpoint = Deno.env.get('EVOLUTION_API_ENDPOINT')
      
      console.log('🔑 Credentials check:', { hasApiKey: !!apiKey, hasEndpoint: !!endpoint });
      
      if (!apiKey || !endpoint) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Evolution API credentials not configured' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Garantir que o endpoint tenha o protocolo HTTPS
      if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        endpoint = `https://${endpoint}`;
      }
      
      // Remover barras finais para evitar URLs malformadas
      endpoint = endpoint.replace(/\/+$/, '');
      
      const cleanApiKey = apiKey.trim();
      
      try {
        console.log('🔄 Fetching instance from Evolution API:', `${endpoint}/instance/fetchInstances?instanceName=${instanceName}`);
        
        // Simplified: Just fetch instance and return basic info + QR if available
        const instanceResponse = await fetch(`${endpoint}/instance/fetchInstances?instanceName=${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': cleanApiKey,
            'Accept': 'application/json'
          }
        })

        console.log('📥 Evolution API response status:', instanceResponse.status);

        if (!instanceResponse.ok) {
          const errorData = await instanceResponse.text();
          console.error('❌ Failed to fetch instance:', { status: instanceResponse.status, error: errorData });
          
          // Se erro 500 (erro interno da Evolution API), tentar conectar diretamente
          if (instanceResponse.status === 500) {
            console.log('⚠️ Evolution API internal error (500), trying direct connect as fallback...');
            
            try {
              const connectResponse = await fetch(`${endpoint}/instance/connect/${instanceName}`, {
                method: 'GET',
                headers: {
                  'apikey': cleanApiKey,
                  'Accept': 'application/json'
                }
              });

              console.log('📱 Fallback connect response status:', connectResponse.status);

              if (connectResponse.ok) {
                const connectData = await connectResponse.json();
                console.log('✅ Instance found via fallback! Connect data:', connectData);
                
                const qrCode = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode || connectData.code || connectData.pairingCode || null;
                
                return new Response(
                  JSON.stringify({
                    success: true,
                    qrCode: qrCode,
                    instanceName: instanceName,
                    instance: {
                      connectionStatus: connectData.instance?.state || 'close',
                      ownerJid: connectData.instance?.ownerJid || null,
                      profileName: connectData.instance?.profileName || null,
                      profilePicUrl: connectData.instance?.profilePicUrl || null
                    }
                  }),
                  { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                  }
                );
              }
            } catch (fallbackError) {
              console.error('❌ Fallback connect also failed:', fallbackError);
            }
            
            // Se fallback falhou, retornar erro mais amigável
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Erro interno da Evolution API. Tente novamente em alguns segundos.',
                details: 'Evolution API retornou erro 500 (problema de banco de dados)',
                technicalDetails: errorData.substring(0, 200)
              }),
              { 
                status: 503, // Service Unavailable
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          
          // Se a instância não existe (404), vamos criar ela
          if (instanceResponse.status === 404) {
            console.log('🔨 Instance not found, creating new instance...');
            
            const createPayload = {
              instanceName: instanceName,
              token: cleanApiKey,
              qrcode: true,
              integration: 'WHATSAPP-BAILEYS'
            };

            console.log('📤 Creating instance with payload:', createPayload);

            const createResponse = await fetch(`${endpoint}/instance/create`, {
              method: 'POST',
              headers: {
                'apikey': cleanApiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(createPayload)
            });

            const createData = await createResponse.json();
            console.log('📥 Create response:', { status: createResponse.status, data: createData });

            if (!createResponse.ok) {
              console.error('❌ Failed to create instance:', createData);
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  error: `Failed to create instance: ${createData.message || 'Unknown error'}`,
                  details: createData
                }),
                { 
                  status: createResponse.status, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              );
            }

            // Tentar buscar QR code
            try {
              const qrResponse = await fetch(`${endpoint}/instance/connect/${instanceName}`, {
                method: 'GET',
                headers: {
                  'apikey': cleanApiKey,
                  'Accept': 'application/json'
                }
              });

              if (qrResponse.ok) {
                const qrData = await qrResponse.json();
                console.log('📱 QR Data:', qrData);
                return new Response(
                  JSON.stringify({
                    success: true,
                    qrCode: qrData.base64 || qrData.qrcode || qrData.code,
                    instanceName: instanceName,
                    created: true
                  }),
                  { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                  }
                );
              }
            } catch (e) {
              console.log('⚠️ Could not fetch QR code:', e);
            }

            // Retornar sucesso mesmo sem QR code
            return new Response(
              JSON.stringify({
                success: true,
                instanceName: instanceName,
                created: true,
                message: 'Instance created, waiting for connection'
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          
          // Para outros erros, retornar erro genérico
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to fetch instance: ${instanceResponse.status}`,
              details: errorData
            }),
            { 
              status: instanceResponse.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const instanceData = await instanceResponse.json()
        
        console.log('📊 Instance data received:', {
          type: typeof instanceData,
          isArray: Array.isArray(instanceData),
          length: Array.isArray(instanceData) ? instanceData.length : 'N/A',
          keys: instanceData ? Object.keys(instanceData) : [],
          data: JSON.stringify(instanceData).substring(0, 500)
        });
        
        // Se instanceData é um objeto (não array), transformar em array
        let instances = Array.isArray(instanceData) ? instanceData : [instanceData];
        
        // Se o array está vazio OU se não há dados válidos
        if (!instances || instances.length === 0 || !instances[0]) {
          console.log('⚠️ Instance not found in fetchInstances, trying direct connect...');
          
          // Tentar conectar diretamente primeiro (instância pode existir mas não aparecer no fetch)
          try {
            const connectResponse = await fetch(`${endpoint}/instance/connect/${instanceName}`, {
              method: 'GET',
              headers: {
                'apikey': cleanApiKey,
                'Accept': 'application/json'
              }
            });

            console.log('📱 Connect response status:', connectResponse.status);

            if (connectResponse.ok) {
              const connectData = await connectResponse.json();
              console.log('✅ Instance exists! Connect data:', connectData);
              
              const qrCode = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode || connectData.code || connectData.pairingCode || null;
              
              return new Response(
                JSON.stringify({
                  success: true,
                  qrCode: qrCode,
                  instanceName: instanceName,
                  instance: {
                    connectionStatus: connectData.instance?.state || 'close',
                    ownerJid: connectData.instance?.ownerJid || null,
                    profileName: connectData.instance?.profileName || null,
                    profilePicUrl: connectData.instance?.profilePicUrl || null
                  }
                }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              );
            }
            
            // Se connect falhou com 404, aí sim a instância não existe
            if (connectResponse.status === 404) {
              console.log('🔨 Instance truly does not exist, creating new instance...');
              
              const createPayload = {
                instanceName: instanceName,
                token: cleanApiKey,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS'
              };

              console.log('📤 Creating instance with payload:', createPayload);

              const createResponse = await fetch(`${endpoint}/instance/create`, {
                method: 'POST',
                headers: {
                  'apikey': cleanApiKey,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(createPayload)
              });

              const createData = await createResponse.json();
              console.log('📥 Create response:', { status: createResponse.status, data: createData });

              if (!createResponse.ok) {
                console.error('❌ Failed to create instance:', createData);
                return new Response(
                  JSON.stringify({ 
                    success: false, 
                    error: `Failed to create instance: ${createData.message || createData.error || 'Unknown error'}`,
                    details: createData
                  }),
                  { 
                    status: createResponse.status, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                  }
                );
              }

              console.log('✅ Instance created successfully!');
              
              // Tentar buscar QR code da nova instância
              const newQrResponse = await fetch(`${endpoint}/instance/connect/${instanceName}`, {
                method: 'GET',
                headers: {
                  'apikey': cleanApiKey,
                  'Accept': 'application/json'
                }
              });

              if (newQrResponse.ok) {
                const newQrData = await newQrResponse.json();
                const qrCode = newQrData.base64 || newQrData.qrcode?.base64 || newQrData.qrcode || newQrData.code || null;
                
                return new Response(
                  JSON.stringify({
                    success: true,
                    qrCode: qrCode,
                    instanceName: instanceName,
                    created: true,
                    instance: {
                      connectionStatus: 'close',
                      ownerJid: null,
                      profileName: null,
                      profilePicUrl: null
                    }
                  }),
                  { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                  }
                );
              }
              
              // Retornar sucesso mesmo sem QR code imediato
              return new Response(
                JSON.stringify({
                  success: true,
                  instanceName: instanceName,
                  created: true,
                  qrCode: null,
                  message: 'Instance created, QR code will be available shortly'
                }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              );
            }
            
            // Outro erro no connect
            const connectError = await connectResponse.text();
            console.error('❌ Connect failed:', { status: connectResponse.status, error: connectError });
            
          } catch (connectError) {
            console.error('❌ Error trying to connect:', connectError);
          }
          
          // Se chegou aqui, não conseguimos nem conectar nem criar
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Instance not found and could not create or connect',
              instanceName: instanceName
            }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const instance = instances[0];
        console.log('✅ Instance found:', {
          instanceName: instance.instanceName || instanceName,
          connectionStatus: instance.connectionStatus,
          ownerJid: instance.ownerJid
        });
        
        // Build simple response
        const response: any = {
          success: true,
          instanceName: instanceName,
          instance: {
            connectionStatus: instance.connectionStatus,
            ownerJid: instance.ownerJid,
            profileName: instance.profileName,
            profilePicUrl: instance.profilePicUrl,
            disconnectionReasonCode: instance.disconnectionReasonCode
          }
        }

        // Add QR code if not connected
        if (instance.connectionStatus !== 'open') {
          console.log('🔍 Instance not connected, trying to get QR code...');
          
          try {
            // Tentar conectar a instância (SEM DELAY - uma única tentativa rápida)
            const connectUrl = `${endpoint}/instance/connect/${instanceName}`;
            
            const connectResponse = await fetch(connectUrl, {
              method: 'GET',
              headers: {
                'apikey': cleanApiKey,
                'Content-Type': 'application/json'
              }
            });
            
            if (connectResponse.ok) {
              const connectData = await connectResponse.json();
              console.log('📥 Connect response:', JSON.stringify(connectData, null, 2));
              
              // Extrair QR code (tentar múltiplos campos)
              const qrCode = connectData.base64 || 
                            connectData.qrcode?.base64 ||
                            connectData.qrcode || 
                            connectData.code ||
                            connectData.pairingCode ||
                            null;
              
              if (qrCode) {
                response.qrCode = qrCode;
                console.log('✅ QR Code found');
              } else {
                console.log('⚠️ QR code not available yet');
                response.qrCode = null;
              }
            } else {
              console.log(`⚠️ Connect failed: ${connectResponse.status}`);
              response.qrCode = null;
            }
          } catch (qrError) {
            console.error('❌ Error fetching QR code:', qrError);
            response.qrCode = null;
          }
        }

        // Add profile data if connected
        if (instance.connectionStatus === 'open') {
          response.phoneNumber = instance.ownerJid?.replace('@s.whatsapp.net', '')
          response.displayName = instance.profileName
          response.profilePicture = instance.profilePicUrl
        }

        return new Response(
          JSON.stringify(response),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

      } catch (error) {
        console.error('GET error:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Internal server error',
            message: error.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Handle DELETE requests - apagar instância
    if (req.method === 'DELETE') {
      const { instanceName } = await req.json();
      
      console.log('🗑️ DELETE Request:', { instanceName });
      
      if (!instanceName) {
        return new Response(
          JSON.stringify({ success: false, error: 'instanceName is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const apiKey = Deno.env.get('EVOLUTION_API_KEY');
      let endpoint = Deno.env.get('EVOLUTION_API_ENDPOINT');

      if (!apiKey || !endpoint) {
        return new Response(
          JSON.stringify({ success: false, error: 'Evolution API credentials not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        endpoint = `https://${endpoint}`;
      }
      
      // Remover barras finais para evitar URLs malformadas
      endpoint = endpoint.replace(/\/+$/, '');
      
      const cleanApiKey = apiKey.trim();

      try {
        console.log('🗑️ Deleting instance from Evolution API...');
        
        const deleteResponse = await fetch(`${endpoint}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': cleanApiKey,
            'Accept': 'application/json'
          }
        });

        const deleteData = await deleteResponse.json();
        console.log('📥 Delete response:', { status: deleteResponse.status, data: deleteData });

        if (!deleteResponse.ok) {
          console.error('❌ Failed to delete instance:', deleteData);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to delete instance: ${deleteData.message || 'Unknown error'}`,
              details: deleteData
            }),
            { 
              status: deleteResponse.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Instance deleted successfully',
            instanceName: instanceName
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('DELETE error:', error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Internal server error',
            message: error.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})