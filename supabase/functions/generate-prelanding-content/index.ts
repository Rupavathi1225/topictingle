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
    const { webResultTitle, webResultDescription, originalLink } = await req.json();
    
    if (!webResultTitle) {
      return new Response(
        JSON.stringify({ error: 'Web result title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating prelanding content for:', webResultTitle);

    // Generate text content first
    const textResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are a marketing copywriter creating compelling pre-landing page content. 
Generate engaging headlines, subtitles, and descriptions that will make users want to continue to the offer.
The content should build anticipation and curiosity while being professional.`
          },
          {
            role: 'user',
            content: `Create pre-landing page content for a web result with:
Title: "${webResultTitle}"
Description: "${webResultDescription || 'No description provided'}"
Original URL: "${originalLink || 'Not provided'}"

Return a JSON object with these fields:
{
  "headline": "A compelling headline (max 60 chars)",
  "subtitle": "An engaging subtitle (max 100 chars)",
  "description": "A persuasive description that builds anticipation (max 200 chars)",
  "redirect_description": "Text shown before redirect, e.g. 'You will be redirected to your exclusive offer...'"
}

Return ONLY valid JSON, no markdown or explanation.`
          }
        ],
      }),
    });

    if (!textResponse.ok) {
      const errorText = await textResponse.text();
      console.error('AI gateway error:', textResponse.status, errorText);
      
      if (textResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (textResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${textResponse.status}`);
    }

    const textData = await textResponse.json();
    const textContent = textData.choices?.[0]?.message?.content;

    if (!textContent) {
      throw new Error('No content generated');
    }

    console.log('Raw text response:', textContent);

    // Parse the JSON from response
    const cleanedContent = textContent.replace(/```json\n?|\n?```/g, '').trim();
    const parsedContent = JSON.parse(cleanedContent);

    // Generate image using the image model
    console.log('Generating image for prelanding...');
    
    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: `Generate a professional, high-quality hero image for a landing page about: "${webResultTitle}". 
The image should be modern, clean, and visually appealing. 
Use vibrant colors and professional design elements.
The image should be suitable for a marketing/promotional page.
16:9 aspect ratio, ultra high resolution.`
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    let mainImageUrl = null;
    
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) {
        mainImageUrl = imageUrl;
        console.log('Image generated successfully');
      }
    } else {
      console.log('Image generation failed, continuing without image');
    }

    const result = {
      ...parsedContent,
      main_image_url: mainImageUrl
    };

    console.log('Generated prelanding content:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating prelanding content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate prelanding content';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
