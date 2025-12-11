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
    const body = await req.json();
    // Support both parameter naming conventions
    const title = body.title || body.blogTitle;
    const slug = body.slug || body.blogSlug;
    const generateSearches = body.generateSearches !== false; // default true
    
    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating content for:', title);

    // Generate blog content
    const contentResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are a professional blog content writer. Generate engaging blog content based on the given title.

CRITICAL REQUIREMENT: The content MUST be EXACTLY 100 words. Not more, not less. Count carefully.

The content should:
- Be informative and engaging
- Be SEO-friendly with natural keyword usage
- Have a conversational yet professional tone
- Use plain text only - NO HTML tags whatsoever (no <p>, <h2>, <strong>, <ul>, <li>, etc.)
- Use blank lines to separate paragraphs

Do NOT include the title in the content as it will be displayed separately.
Do NOT use any HTML tags at all - output plain text only.
REMEMBER: EXACTLY 100 words total.`
          },
          {
            role: 'user',
            content: `Write a blog post with the title: "${title}"${slug ? ` (URL slug: ${slug})` : ''}. Remember: EXACTLY 100 words, plain text only, no HTML tags.`
          }
        ],
      }),
    });

    if (!contentResponse.ok) {
      const errorText = await contentResponse.text();
      console.error('AI gateway error:', contentResponse.status, errorText);
      
      if (contentResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (contentResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${contentResponse.status}`);
    }

    const contentData = await contentResponse.json();
    const generatedContent = contentData.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated');
    }

    console.log('Content generated successfully');

    // Generate related searches if requested
    let relatedSearches: string[] = [];
    if (generateSearches) {
      console.log('Generating related searches...');
      const searchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: `You generate related search queries for blog posts. Generate exactly 8 related search queries that users might search for related to the given blog topic. Each query should be a natural search phrase (3-7 words). Return ONLY a JSON array of strings, nothing else.`
            },
            {
              role: 'user',
              content: `Generate 8 related search queries for a blog titled: "${title}". Return only a JSON array like ["query 1", "query 2", ...]`
            }
          ],
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const searchContent = searchData.choices?.[0]?.message?.content;
        if (searchContent) {
          try {
            // Parse the JSON array from response
            const cleanedContent = searchContent.replace(/```json\n?|\n?```/g, '').trim();
            relatedSearches = JSON.parse(cleanedContent);
            console.log('Generated related searches:', relatedSearches);
          } catch (e) {
            console.error('Failed to parse related searches:', e);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ content: generatedContent, relatedSearches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating blog content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate content';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});