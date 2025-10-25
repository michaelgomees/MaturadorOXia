import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para limpar e truncar mensagens 
function truncateMessage(message: string): string {
  if (!message) return message;
  
  // Remover qualquer menção a delays, timestamps ou formatações especiais
  let cleaned = message
    .replace(/\(delay \d+s?\)/gi, '')
    .replace(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/g, '')
    .replace(/🔄\s*Maturando desde:/gi, '')
    .trim();
  
  // Pegar apenas a primeira fala (antes de qualquer quebra dupla ou nome de pessoa)
  const firstSpeech = cleaned.split(/\n\n|\n[A-Z][a-z]+:/)[0].trim();
  
  const lines = firstSpeech.split('\n').filter(line => line.trim().length > 0);
  const maxLines = 3;
  
  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join('\n');
  }
  
  // Se muito longo, cortar em 200 chars (mais generoso)
  if (firstSpeech.length > 200) {
    return firstSpeech.substring(0, 200).trim();
  }
  
  return firstSpeech;
}

// Função para formatar data brasileira
function formatBrazilianDateTime(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0'); 
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('OpenAI Chat function called');
    
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      throw new Error('OpenAI API key not configured');
    }

    const { 
      prompt, 
      chipName, 
      conversationHistory = [], 
      isFirstMessage = false,
      responseDelay = 30 
    } = await req.json();
    
    console.log('Request data:', { 
      prompt: prompt?.substring(0, 100) + '...', 
      chipName, 
      historyLength: conversationHistory.length,
      isFirstMessage,
      responseDelay 
    });

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // Remover lógica de mensagem "Maturando desde" - isso deve aparecer apenas no painel

    // Sistema prompt usando prompt específico do chip
    const systemPrompt = `Você é ${chipName}.

${prompt}

REGRAS IMPORTANTES:
- Responda SEMPRE com no máximo 2-3 linhas (máximo 100 tokens)
- Seja natural e humanizado
- Use emojis com moderação
- Mantenha o estilo de conversa do prompt acima
- NÃO gere múltiplas mensagens de uma vez
- Responda como UMA ÚNICA PESSOA (${chipName})
- NUNCA inclua delays, timestamps ou "(delay Xs)" no texto`;

    // Preparar mensagens para OpenAI - sempre reset com system fresh
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      // Apenas histórico recente para manter contexto sem prompts antigos
      ...conversationHistory.slice(-3).map((msg: any) => ({
        role: msg.isFromThisChip ? 'assistant' : 'user',
        content: msg.content
      })),
    ];

    console.log('Sending request to OpenAI with', messages.length, 'messages');
    console.log('System prompt being used:', systemPrompt.substring(0, 200) + '...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 100, // Limite rígido de tokens
        temperature: 0.8,
        frequency_penalty: 0.3, // Reduz repetição
        presence_penalty: 0.2, // Incentiva novidade
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    let generatedMessage = data.choices[0].message.content;
    
    // Aplicar truncamento para garantir 2-3 linhas máximo
    generatedMessage = truncateMessage(generatedMessage);
    
    console.log('Final processed message:', generatedMessage);

    return new Response(JSON.stringify({ 
      message: generatedMessage,
      usage: data.usage,
      model: data.model,
      delay: responseDelay * 1000, // delay em ms
      truncated: generatedMessage.endsWith('...')
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in openai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check function logs for more details'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});