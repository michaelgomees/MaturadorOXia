import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Buscar credenciais dos secrets do Supabase
    let endpoint = Deno.env.get('EVOLUTION_API_ENDPOINT');
    const apiKey = Deno.env.get('EVOLUTION_API_KEY');

    console.log('📋 Verificando secrets...');
    console.log('Endpoint encontrado:', endpoint ? 'SIM' : 'NÃO');
    console.log('API Key encontrada:', apiKey ? 'SIM' : 'NÃO');

    if (!endpoint || !apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Evolution API não configurada nos secrets. Verifique se EVOLUTION_API_ENDPOINT e EVOLUTION_API_KEY foram salvos corretamente.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Garantir protocolo HTTPS
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = `https://${endpoint}`;
    }

    console.log('🔍 Testando conexão com:', endpoint);
    console.log('🔑 Usando API Key:', apiKey.substring(0, 10) + '...');
    
    const testUrl = `${endpoint}/instance/fetchInstances`;
    console.log('📡 URL completa:', testUrl);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:', errorText);
      return new Response(JSON.stringify({
        success: false,
        error: `Erro ${response.status}: Não foi possível conectar à Evolution API. Verifique se o endpoint (${endpoint}) está correto e se a API Key é válida.`,
        details: errorText.substring(0, 300)
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log('✅ Conexão bem-sucedida! Instâncias encontradas:', Array.isArray(data) ? data.length : 'N/A');

    return new Response(JSON.stringify({
      success: true,
      message: 'Conexão bem-sucedida com a Evolution API',
      endpoint: endpoint,
      instanceCount: Array.isArray(data) ? data.length : 0,
      data: data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error);
    return new Response(JSON.stringify({
      success: false,
      error: `Erro de conexão: ${error.message}. Verifique se o endpoint está acessível.`,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
