import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, apiKey } = await req.json();
    
    if (!endpoint || !apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'endpoint and apiKey are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add https:// if missing
    let fullEndpoint = endpoint;
    if (!fullEndpoint.startsWith('http://') && !fullEndpoint.startsWith('https://')) {
      fullEndpoint = `https://${fullEndpoint}`;
    }

    console.log('🧪 Testing Evolution API connection...');
    console.log('📡 Endpoint:', fullEndpoint);
    console.log('🔑 API Key length:', apiKey.length);
    console.log('🔑 First 8 chars:', apiKey.substring(0, 8) + '...');

    // Test 1: Try to fetch instances (should work with valid credentials)
    console.log('\n🧪 Test 1: Fetching instances list...');
    const testUrl = `${fullEndpoint}/instance/fetchInstances`;
    console.log('URL:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey.trim(),
        'Accept': 'application/json'
      }
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📥 Response body:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = responseText;
    }

    if (response.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Evolution API credentials are valid!',
          status: response.status,
          data: result
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication failed',
          status: response.status,
          message: result.message || responseText,
          details: result,
          suggestions: [
            'Verify your API key is correct',
            'Check if your endpoint URL is correct',
            'Ensure your Evolution API server is running',
            'Verify the API key has the necessary permissions'
          ]
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('❌ Test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Test failed',
        message: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
