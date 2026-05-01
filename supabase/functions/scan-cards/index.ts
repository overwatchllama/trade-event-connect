import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

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
  guess_set_code: string | null;
  guess_set_symbol_description: string | null;
  guess_number: string | null;
  guess_total: string | null;
  confidence_basis: "number_and_set" | "number_only" | "set_only" | "name_only" | "low" | null;
  notes: string | null;
  // Slab (graded card) fields — null when the card is raw.
  is_slab: boolean | null;
  grading_company: "PSA" | "BGS" | "CGC" | "SGC" | "TAG" | "HGA" | "GMA" | "OTHER" | null;
  grade: string | null;
  cert_number: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = newRequestId();
  try {
    let body: { imageUrl?: string };
    try {
      body = await req.json();
    } catch {
      throw new HttpError("InvalidJson", "Request body is not valid JSON", 400);
    }
    const { imageUrl } = body;
    if (!imageUrl || typeof imageUrl !== "string") {
      throw new HttpError("MissingFields", "imageUrl (string) is required", 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new HttpError("ConfigError", "LOVABLE_API_KEY is not configured", 500);

    const systemPrompt = `You are a trading card identifier specialized in Pokémon TCG and One Piece TCG.

A card's NAME alone is unreliable for pricing — the same Pokémon (e.g. Charizard, Pikachu) is reprinted in dozens of sets at very different values. The TWO markers that uniquely identify a printing are printed together at the BOTTOM of the card:

  1. SET SYMBOL — a small icon (lightning bolt, crown, sword, etc.) usually in the BOTTOM-RIGHT of the card art (just above the card number). Modern Pokémon cards also print a 3-letter SET CODE next to it (e.g. "SVI", "PAL", "OBF", "BRS", "SIT", "PAR", "TEF", "TWM").
  2. CARD NUMBER — printed as "<num>/<total>" or just "<num>/SV" — for example "025/198", "199/091", "SWSH284". The number on the LEFT of the slash is the collector number; the number on the RIGHT is the set's printed total.

YOUR PRIORITY when reading each card is, in order:
  a) Read the CARD NUMBER (digits + slash) — this is usually clearly printed in small black/white text in the bottom-left or bottom-right.
  b) Read the SET CODE (3-4 uppercase letters) — printed right next to the card number on modern Pokémon cards.
  c) Describe the SET SYMBOL shape if you can see it (e.g. "lightning bolt in a circle", "crown", "sword and shield"), even if you can't read a code.
  d) Only THEN read the card name from the top.

Return bounding boxes in NORMALIZED coordinates (0..1) relative to the full image:
- x, y = top-left corner
- w, h = width / height

Only return cards that are clearly visible. Do not invent details. If text is unreadable, leave the field null — do NOT guess. A confident "null" is more useful than a wrong guess.`;

    const userPrompt = `Detect every trading card in this photo. For each card, return:
- bbox { x, y, w, h } normalized 0..1
- game: "pokemon" | "onepiece" | "unknown"
- guess_name: card name printed at the TOP of the card, or null
- guess_set: full set name if you recognize it (e.g. "Scarlet & Violet—Paldea Evolved"), or null
- guess_set_code: the 3-4 letter SET CODE printed near the card number (e.g. "SVI", "PAL", "OP01"), or null
- guess_set_symbol_description: a short description of the set symbol shape/style if visible (e.g. "lightning bolt", "crown silhouette"), or null
- guess_number: ONLY the collector number on the LEFT of the slash (e.g. "25" from "025/198"), or null. Strip leading zeros.
- guess_total: the number on the RIGHT of the slash (e.g. "198"), or null
- confidence_basis: which markers you actually read — "number_and_set" (best), "number_only", "set_only", "name_only", or "low"
- notes: any extra hint (rarity symbol, holo pattern, edition stamp, etc.)

Reminder: prioritize the bottom-of-card markers (number + set code/symbol) over the name. They are what makes pricing accurate.`;

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
                          guess_set_code: { type: ["string", "null"] },
                          guess_set_symbol_description: { type: ["string", "null"] },
                          guess_number: { type: ["string", "null"] },
                          guess_total: { type: ["string", "null"] },
                          confidence_basis: {
                            type: ["string", "null"],
                            enum: ["number_and_set", "number_only", "set_only", "name_only", "low", null],
                          },
                          notes: { type: ["string", "null"] },
                        },
                        required: [
                          "bbox",
                          "game",
                          "guess_name",
                          "guess_set",
                          "guess_set_code",
                          "guess_set_symbol_description",
                          "guess_number",
                          "guess_total",
                          "confidence_basis",
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
        throw new HttpError("RateLimited", "Rate limits exceeded, please try again later.", 429);
      }
      if (aiResp.status === 402) {
        throw new HttpError(
          "PaymentRequired",
          "Lovable AI credits required. Please add funds in Settings → Workspace → Usage.",
          402,
        );
      }
      const errText = await aiResp.text();
      console.error(`[scan-cards][${requestId}] AI gateway error:`, aiResp.status, errText);
      throw new HttpError("UpstreamError", `AI gateway error: ${errText}`, 502);
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
    console.error(`[scan-cards][${requestId}] error:`, e);
    return errorResponse(e, {
      defaultType: "ScanCardsError",
      requestId,
      headers: corsHeaders,
    });
  }
});
