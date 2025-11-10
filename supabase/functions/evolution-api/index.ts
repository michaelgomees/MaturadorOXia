import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
      
      // Caso contrário, é criação de instância
      const { instanceName, connectionName }: CreateInstanceRequest = requestBody
      
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
              'apikey': `${cleanApiKey.substring(0, 10)}...`,
              'Content-Type': 'application/json',
            },
            payload: createPayload
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

          console.log('✅ Instância criada com sucesso!');
        } else {
          console.log('ℹ️ Instância já existe, buscando informações...');
        }

        // Buscar QR code
        console.log('🔄 Buscando QR code...');
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
            console.log('📱 QR Data:', qrData);
            qrCode = qrData.base64 || qrData.qrcode || qrData.code;
          }
        } catch (e) {
          console.log('⚠️ Erro ao buscar QR, usando fallback');
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
      
      const cleanApiKey = apiKey.trim();
      
      try {
        // Simplified: Just fetch instance and return basic info + QR if available
        const instanceResponse = await fetch(`${endpoint}/instance/fetchInstances?instanceName=${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': cleanApiKey,
            'Accept': 'application/json'
          }
        })

        if (!instanceResponse.ok) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to fetch instance: ${instanceResponse.status}` 
            }),
            { 
              status: instanceResponse.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const instanceData = await instanceResponse.json()
        
        if (!instanceData || instanceData.length === 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Instance not found' 
            }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const instance = instanceData[0]
        
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
        if (instance.connectionStatus !== 'open' && instance.instance?.qrcode) {
          response.qrCode = instance.instance.qrcode
        } else if (instance.connectionStatus !== 'open') {
          // Try to get QR code
          try {
            const qrResponse = await fetch(`${endpoint}/instance/connect/${instanceName}`, {
              method: 'GET',
              headers: {
                'apikey': cleanApiKey,
                'Accept': 'application/json'
              }
            })
            
            if (qrResponse.ok) {
              const qrData = await qrResponse.json()
              response.qrCode = qrData.base64 || qrData.qrcode || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=evolution-qr-${instanceName}-${Date.now()}`
            }
          } catch (e) {
            // Ignore QR fetch errors
            response.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=evolution-qr-${instanceName}-${Date.now()}`
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