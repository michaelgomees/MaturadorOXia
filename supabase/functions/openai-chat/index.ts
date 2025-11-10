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

    // SEMPRE usar EXATAMENTE o prompt fornecido pelo chip, SEM NENHUMA modificação
    // Este prompt já vem com todas as instruções de personalidade e comportamento
    const systemPrompt = prompt;
    
    console.log(`📝 Usando prompt EXATO do chip ${chipName} (${prompt.length} chars)`);

    // Preparar mensagens para OpenAI com histórico completo
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      // Usar todo o histórico disponível para manter contexto completo
      ...conversationHistory.map((msg: any) => ({
        role: msg.isFromThisChip ? 'assistant' : 'user',
        content: msg.content
      })),
    ];

    console.log('Enviando para OpenAI:', {
      chipName,
      messagesCount: messages.length,
      systemPromptLength: systemPrompt.length,
      promptUsed: prompt.substring(0, 100) + '...'
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 150,
        temperature: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.6,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log('Resposta da OpenAI recebida:', {
      finishReason: data.choices[0].finish_reason,
      contentLength: data.choices[0].message.content.length
    });
    
    let generatedMessage = data.choices[0].message.content;
    
    // Remover qualquer prefixo com nome do chip ou formatação indevida
    generatedMessage = generatedMessage
      .replace(new RegExp(`^${chipName}:\\s*`, 'i'), '') // Remove "ChipName: " do início
      .replace(/^[A-Z][a-zà-ú]+:\s*/, '') // Remove "NomeQualquer: " do início
      .trim();
    
    // Aplicar truncamento para garantir 2-3 linhas máximo
    generatedMessage = truncateMessage(generatedMessage);
    
    console.log('Mensagem processada final:', {
      length: generatedMessage.length,
      preview: generatedMessage.substring(0, 100),
      wasTruncated: generatedMessage.endsWith('...')
    });

    return new Response(JSON.stringify({ 
      message: generatedMessage,
      usage: data.usage,
      model: data.model,
      delay: responseDelay * 1000,
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