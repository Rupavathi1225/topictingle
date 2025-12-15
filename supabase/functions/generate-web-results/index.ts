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
    const { searchText, count = 4 } = await req.json();
    
    if (!searchText) {
      return new Response(
        JSON.stringify({ error: 'Search text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating web results for:', searchText);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a web results generator. Generate realistic search engine results based on the given search query.

For each result, provide:
- title: A compelling click-worthy title (50-70 characters)
- description: A brief description of what the page offers (100-150 characters)
- name: A realistic domain name (e.g., "bestreviews.com", "expertguide.net")
- url: A realistic URL for the result
- is_sponsored: Boolean, make first 1-2 results sponsored (true), rest organic (false)

Return a JSON array with exactly ${count} results. Results should be relevant to the search query and look like real search engine results.`
          },
          {
            role: 'user',
            content: `Generate ${count} search engine results for the query: "${searchText}". Return only a valid JSON array like:
[
  {
    "title": "Result title here",
    "description": "Brief description here",
    "name": "domain.com",
    "url": "https://domain.com/page",
    "is_sponsored": true
  }
]`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated');
    }

    console.log('Raw response:', content);

    // Parse the JSON array from response
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const webResults = JSON.parse(cleanedContent);

    console.log('Generated web results:', webResults);

    return new Response(
      JSON.stringify({ webResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating web results:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate web results';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
