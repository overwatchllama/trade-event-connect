import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DetectedCard {
  bbox: { x: number; y: number; w: number; h: number };
  game: "pokemon" | "onepiece" | "unknown";
  guess_name: string | null;
  guess_set: string | null;
  guess_number: string | null;
  notes: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "imageUrl (string) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a trading card detector. Given a photo containing one or more trading cards (Pokémon TCG or One Piece TCG), detect each individual card and return its bounding box and any visible identifying info.

Return bounding boxes in NORMALIZED coordinates (0..1) relative to the full image:
- x, y = top-left corner
- w, h = width / height

Only return cards that are clearly visible. Do not invent cards. If text is unreadable, leave the field null.`;

    const userPrompt = `Detect every trading card in this photo. For each card, return:
- bbox { x, y, w, h } normalized 0..1
- game: "pokemon" | "onepiece" | "unknown"
- guess_name: card name visible on the card, or null
- guess_set: set symbol/name if visible, or null
- guess_number: card number like "025/198" if visible, or null
- notes: any extra hint to identify it (rarity symbol, color, etc.)`;

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_detected_cards",
                description: "Report every trading card detected in the image",
                parameters: {
                  type: "object",
                  properties: {
                    cards: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          bbox: {
                            type: "object",
                            properties: {
                              x: { type: "number" },
                              y: { type: "number" },
                              w: { type: "number" },
                              h: { type: "number" },
                            },
                            required: ["x", "y", "w", "h"],
                            additionalProperties: false,
                          },
                          game: {
                            type: "string",
                            enum: ["pokemon", "onepiece", "unknown"],
                          },
                          guess_name: { type: ["string", "null"] },
                          guess_set: { type: ["string", "null"] },
                          guess_number: { type: ["string", "null"] },
                          notes: { type: ["string", "null"] },
                        },
                        required: [
                          "bbox",
                          "game",
                          "guess_name",
                          "guess_set",
                          "guess_number",
                          "notes",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["cards"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "report_detected_cards" },
          },
        }),
      },
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Lovable AI credits required. Please add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      return new Response(
        JSON.stringify({ error: "AI gateway error", detail: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ cards: [] as DetectedCard[] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ cards: args.cards ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-cards error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
