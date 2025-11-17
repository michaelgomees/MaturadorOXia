import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EvolutionApiConfig {
  apiKey: string;
  endpoint: string;
}

function getEvolutionConfig(): EvolutionApiConfig {
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  let endpoint = Deno.env.get('EVOLUTION_API_ENDPOINT');
  
  if (!apiKey || !endpoint) {
    throw new Error('Evolution API credentials not configured');
  }
  
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = `https://${endpoint}`;
  }
  
  return { apiKey: apiKey.trim(), endpoint };
}

async function callEvolutionAPI(path: string, method: string = 'GET', body?: any) {
  const config = getEvolutionConfig();
  
  console.log(`🔄 Calling Evolution API: ${method} ${config.endpoint}${path}`);
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.apiKey,
    },
  };
  
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${config.endpoint}${path}`, options);
  const data = await response.json();
  
  console.log(`📥 Evolution API response (${response.status}):`, JSON.stringify(data).substring(0, 500));
  
  return { status: response.status, data, ok: response.ok };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'status';
    const instanceName = url.searchParams.get('instanceName');

    console.log(`📥 Request: ${req.method} action=${action} instanceName=${instanceName}`);

    // Buscar todas as instâncias
    if (action === 'fetchAll') {
      const result = await callEvolutionAPI('/instance/fetchInstances');
      
      if (result.ok && Array.isArray(result.data)) {
        // Filtrar apenas instâncias conectadas (state === 'open')
        const connectedInstances = result.data.filter((inst: any) => 
          inst.connectionStatus === 'open'
        );

        console.log(`✅ Encontradas ${connectedInstances.length} instâncias conectadas de ${result.data.length} total`);

        return new Response(JSON.stringify({
          success: true,
          instances: connectedInstances.map((inst: any) => ({
            instanceName: inst.name,
            connectionStatus: inst.connectionStatus,
            phoneNumber: inst.ownerJid?.split('@')[0] || '',
            displayName: inst.profileName || inst.name,
            instance: {
              instanceName: inst.name,
              state: inst.connectionStatus,
              ownerJid: inst.ownerJid,
              profileName: inst.profileName
            }
          }))
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch instances',
        instances: []
      }), { 
        status: result.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Requisições que precisam de instanceName
    if (!instanceName) {
      return new Response(JSON.stringify({
        success: false,
        error: 'instanceName is required'
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar status da instância
    if (action === 'status') {
      const result = await callEvolutionAPI(`/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`);
      
      // Se a API retornou 404, a instância não existe
      if (result.status === 404) {
        console.log(`⚠️ Instância ${instanceName} não encontrada na Evolution API`);
        return new Response(JSON.stringify({
          success: false,
          error: 'Instance not found',
          instance: {
            instanceName: instanceName,
            connectionStatus: 'not_found',
            ownerJid: null,
            profileName: null,
            qrCode: null
          }
        }), { 
          status: 200, // Retorna 200 mas com success: false
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
        const instance = result.data[0];
        return new Response(JSON.stringify({
          success: true,
          instance: {
            instanceName: instance.name,
            connectionStatus: instance.connectionStatus,
            ownerJid: instance.ownerJid,
            profileName: instance.profileName,
            qrCode: null
          }
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Instance not found',
        instance: {
          instanceName: instanceName,
          connectionStatus: 'not_found',
          ownerJid: null,
          profileName: null,
          qrCode: null
        }
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Conectar instância (GET QR Code)
    if (action === 'connect') {
      // Primeiro verifica se já existe
      const checkResult = await callEvolutionAPI(`/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`);
      
      if (checkResult.ok && Array.isArray(checkResult.data) && checkResult.data.length > 0) {
        const instance = checkResult.data[0];
        
        // Se já está conectada
        if (instance.connectionStatus === 'open') {
          return new Response(JSON.stringify({
            success: true,
            message: 'Instance already connected',
            qrCode: null,
            instance: {
              instanceName: instance.name,
              connectionStatus: instance.connectionStatus,
              ownerJid: instance.ownerJid
            }
          }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Se está conectando, busca QR code
        if (instance.connectionStatus === 'connecting' || instance.connectionStatus === 'close') {
          const qrResult = await callEvolutionAPI(`/instance/connect/${encodeURIComponent(instanceName)}`);
          
          return new Response(JSON.stringify({
            success: true,
            qrCode: qrResult.data?.qrcode?.base64 || qrResult.data?.base64 || null,
            message: 'QR Code retrieved',
            instance: {
              instanceName: instance.name,
              connectionStatus: 'connecting'
            }
          }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Se não existe, criar nova instância
      console.log('🔨 Creating new instance:', instanceName);
      const createResult = await callEvolutionAPI('/instance/create', 'POST', {
        instanceName: instanceName,
        token: Deno.env.get('EVOLUTION_API_KEY'),
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });

      if (createResult.ok) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Instance created successfully',
          qrCode: createResult.data?.qrcode?.base64 || createResult.data?.base64 || null,
          instance: createResult.data
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Se falhar ao criar (já existe), tenta conectar
      if (createResult.status === 403 || createResult.status === 409) {
        console.log('⚠️ Instance exists, getting QR code...');
        const qrResult = await callEvolutionAPI(`/instance/connect/${encodeURIComponent(instanceName)}`);
        
        return new Response(JSON.stringify({
          success: true,
          qrCode: qrResult.data?.qrcode?.base64 || qrResult.data?.base64 || null,
          message: 'Connecting to existing instance'
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create instance',
        details: createResult.data
      }), { 
        status: createResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enviar mensagem
    if (action === 'sendMessage' && req.method === 'POST') {
      const body = await req.json();
      
      if (!body.to || !body.message) {
        return new Response(JSON.stringify({
          success: false,
          error: 'to and message are required'
        }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const result = await callEvolutionAPI(`/message/sendText/${encodeURIComponent(instanceName)}`, 'POST', {
        number: body.to,
        text: body.message
      });

      return new Response(JSON.stringify({
        success: result.ok,
        message: result.ok ? 'Message sent successfully' : 'Failed to send message',
        data: result.data
      }), { 
        status: result.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action'
    }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
