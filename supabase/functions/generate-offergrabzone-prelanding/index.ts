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
    const { webResultName, webResultTitle, webResultLink } = await req.json();
    
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

    console.log('Generating OfferGrabZone prelanding content for:', webResultTitle);

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
            content: `You are a marketing copywriter creating compelling pre-landing page content for OfferGrabZone. 
Generate engaging headlines, descriptions, and CTA button text that will make users want to continue to the offer.
The content should build anticipation and curiosity while being professional and offer-focused.`
          },
          {
            role: 'user',
            content: `Create pre-landing page content for a web result with:
Name: "${webResultName || 'Offer'}"
Title: "${webResultTitle}"
Link: "${webResultLink || 'Not provided'}"

Return a JSON object with these fields:
{
  "headline": "A compelling headline that creates urgency (max 60 chars)",
  "description": "A persuasive description that builds anticipation for the offer (max 200 chars)",
  "email_placeholder": "Engaging email placeholder text",
  "cta_button_text": "Action-oriented CTA button text (max 20 chars)",
  "background_color": "A hex color code that matches the offer theme (e.g., #1a1a2e)"
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
    console.log('Generating image for OfferGrabZone prelanding...');
    
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
            content: `Generate a professional, high-quality hero image for an offer landing page about: "${webResultTitle}". 
The image should be modern, clean, and visually appealing with vibrant colors.
It should convey excitement and value for an exclusive offer.
Use professional design elements suitable for a marketing/promotional page.
16:9 aspect ratio, ultra high resolution.`
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    let mainImageUrl = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80';
    
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) {
        mainImageUrl = imageUrl;
        console.log('Image generated successfully');
      }
    } else {
      console.log('Image generation failed, using default image');
    }

    const result = {
      ...parsedContent,
      main_image_url: mainImageUrl
    };

    console.log('Generated OfferGrabZone prelanding content:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating OfferGrabZone prelanding content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate prelanding content';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
