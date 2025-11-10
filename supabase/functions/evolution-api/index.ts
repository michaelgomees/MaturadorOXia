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
      const { instanceName, connectionName, evolutionEndpoint, evolutionApiKey }: CreateInstanceRequest = requestBody
      
      if (!instanceName || !connectionName) {
        return new Response(
          JSON.stringify({ success: false, error: 'instanceName and connectionName are required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Usar credenciais passadas OU dos secrets
      const apiKey = evolutionApiKey || Deno.env.get('EVOLUTION_API_KEY')
      let endpoint = evolutionEndpoint || Deno.env.get('EVOLUTION_API_ENDPOINT')
      
      if (!apiKey || !endpoint) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Evolution API não configurada. Configure na aba APIs primeiro.'
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
        // Check if instance exists - if yes, just return it
        const checkResponse = await fetch(`${endpoint}/instance/fetchInstances?instanceName=${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': cleanApiKey,
            'Accept': 'application/json'
          }
        });

        let instanceExists = false;
        let qrCode = null;

        if (checkResponse.ok) {
          const instances = await checkResponse.json();
          if (Array.isArray(instances) && instances.length > 0) {
            instanceExists = true;
            console.log('✅ Instance already exists');
            
            // Try to get QR code
            const qrResponse = await fetch(`${endpoint}/instance/connect/${instanceName}`, {
              method: 'GET',
              headers: {
                'apikey': cleanApiKey,
                'Accept': 'application/json'
              }
            });

            if (qrResponse.ok) {
              const qrData = await qrResponse.json();
              qrCode = qrData.base64 || qrData.qrcode || null;
            }
            
            // Return success immediately since instance exists
            return new Response(
              JSON.stringify({
                success: true,
                qrCode: qrCode,
                instanceName: instanceName,
                message: 'Instance already exists'
              }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
        }

        // Only try to create if instance doesn't exist
        console.log('📞 Instance not found, attempting to create...');
        
        const requestBody = {
          instanceName: instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        };
        
        const createResponse = await fetch(`${endpoint}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': cleanApiKey,
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Falha ao criar instância. Sua API key pode não ter permissões de escrita.',
              details: {
                status: createResponse.status,
                error: errorData.message || errorText
              }
            }),
            { 
              status: createResponse.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const createData = await createResponse.json();
        console.log('✅ Instance created');
        
        // Wait for instance to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get QR code
        const qrResponse = await fetch(`${endpoint}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': cleanApiKey,
            'Accept': 'application/json'
          }
        })

        let qrCode = null
        if (qrResponse.ok) {
          const qrData = await qrResponse.json()
          qrCode = qrData.base64 || qrData.qrcode
        }

        const response: EvolutionAPIResponse = {
          success: true,
          qrCode: qrCode,
          instanceName: instanceName
        }

        return new Response(
          JSON.stringify(response),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

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