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
    const { endpoint, apiKey } = await req.json();

    if (!endpoint || !apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Endpoint e API Key são obrigatórios' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Garantir protocolo
    let fullEndpoint = endpoint;
    if (!fullEndpoint.startsWith('http://') && !fullEndpoint.startsWith('https://')) {
      fullEndpoint = `https://${fullEndpoint}`;
    }

    // Testar conexão com Evolution API
    console.log('🔍 Testando:', fullEndpoint);
    
    const response = await fetch(`${fullEndpoint}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro:', errorText);
      return new Response(JSON.stringify({
        success: false,
        error: `Erro ${response.status}: ${errorText.substring(0, 200)}`
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log('✅ Sucesso:', data);

    return new Response(JSON.stringify({
      success: true,
      message: 'Conexão bem-sucedida',
      data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro ao testar:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
