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

    const systemPrompt = `You are a trading card identifier specialized in Pokémon TCG and One Piece TCG. You also identify GRADED SLABS (cards encased in hard plastic by PSA, BGS/Beckett, CGC, SGC, TAG, HGA, GMA, etc.).

A card's NAME alone is unreliable for pricing — the same Pokémon (e.g. Charizard, Pikachu) is reprinted in dozens of sets at very different values. The TWO markers that uniquely identify a printing are printed together at the BOTTOM of the card:

  1. SET SYMBOL — a small icon (lightning bolt, crown, sword, etc.) usually in the BOTTOM-RIGHT of the card art (just above the card number). Modern Pokémon cards also print a 3-letter SET CODE next to it (e.g. "SVI", "PAL", "OBF", "BRS", "SIT", "PAR", "TEF", "TWM").
  2. CARD NUMBER — printed as "<num>/<total>" or just "<num>/SV" — for example "025/198", "199/091", "SWSH284". The number on the LEFT of the slash is the collector number; the number on the RIGHT is the set's printed total.

YOUR PRIORITY when reading each card is, in order:
  a) Read the CARD NUMBER (digits + slash).
  b) Read the SET CODE (3-4 uppercase letters) printed right next to the card number.
  c) Describe the SET SYMBOL shape if you can see it.
  d) Only THEN read the card name from the top.

SLABS (graded cards) — READ THE LABEL, NOT THE CARD:
  - A slab is a card sealed inside a clear hard-plastic case with a colored LABEL bar across the top.
  - The label is the SOURCE OF TRUTH for slab identification. It already contains everything you need: YEAR, SET name, CARD NAME, COLLECTOR NUMBER, and GRADE. Do NOT try to read the card art through the plastic — the label is more reliable and the case adds glare/reflections.
  - LABEL LAYOUT (typical PSA / CGC / SGC):
      • Top row: grading company logo + cert/serial number.
      • Middle row(s): YEAR + SET NAME + sometimes language/edition (e.g. "2023 POKEMON SV-PALDEA EVOLVED").
      • CARD NAME prominently below or beside the set line (e.g. "CHARIZARD EX").
      • CARD NUMBER printed in the TOP-RIGHT area of the label (e.g. "#54", "54/193", "199/091"). On PSA labels this is often a small "#NNN" in the upper-right corner of the label.
      • GRADE printed large on the right side or bottom-right ("GEM MT 10", "MINT 9", "9.5", "BGS 9.5 BLACK LABEL").
  - BGS labels are vertical with sub-grades on the right edge; the card name/set/number are stacked on the left and the overall grade is the large number on the right.
  - Set is_slab=true and fill grading_company, grade, and cert_number from the label. Read guess_name, guess_set, guess_number FROM THE LABEL TEXT — never guess them from the card art.
  - If a label field is unreadable, leave it null. Do not fabricate.
  - The bbox should cover the WHOLE SLAB (label + card area), not just the card window.

Return bounding boxes in NORMALIZED coordinates (0..1) relative to the FULL ORIGINAL image dimensions:
- x, y = top-left corner of the card/slab as a fraction of image width / height
- w, h = width / height as a fraction of image width / height
- The box must TIGHTLY hug the visible edges of THAT specific card/slab — no large margins, no padding, and crucially NO drift onto a neighboring card.
- Double-check each bbox by mentally cropping the image to (x, y, x+w, y+h) and confirming the crop contains exactly ONE card and that card matches the guess_name/guess_number you returned for it.
- If two cards are close together, shrink the boxes inward rather than letting them overlap. A box that covers the wrong card is worse than no box.

Only return cards that are clearly visible. Do not invent details. If text is unreadable, leave the field null — do NOT guess. A confident "null" is more useful than a wrong guess.`;

    const userPrompt = `Detect every trading card AND every graded slab in this photo. For each, return:
- bbox { x, y, w, h } normalized 0..1 — TIGHT to the card/slab edges
- game: "pokemon" | "onepiece" | "unknown"
- guess_name, guess_set, guess_set_code, guess_set_symbol_description
- guess_number: collector number LEFT of slash, leading zeros stripped, or null
- guess_total: number RIGHT of slash, or null
- confidence_basis: "number_and_set" | "number_only" | "set_only" | "name_only" | "low"
- notes: any extra hint (rarity symbol, holo pattern, edition stamp, etc.)
- is_slab: true if encased in a graded slab, false if raw, null if unsure
- grading_company: "PSA" | "BGS" | "CGC" | "SGC" | "TAG" | "HGA" | "GMA" | "OTHER" or null
- grade: the printed numeric grade as a string ("10", "9.5", "BGS 9.5 Black Label", "GEM MT 10"), or null
- cert_number: the serial/cert number on the slab label, or null

Reminder: For RAW cards, prioritize bottom-of-card markers (number + set code/symbol) over the name. For SLABS, read everything from the LABEL — especially the card NUMBER in the top-right of the label and the card NAME/SET in the middle. Do NOT try to read through the plastic case.`;

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
                          is_slab: { type: ["boolean", "null"] },
                          grading_company: {
                            type: ["string", "null"],
                            enum: ["PSA", "BGS", "CGC", "SGC", "TAG", "HGA", "GMA", "OTHER", null],
                          },
                          grade: { type: ["string", "null"] },
                          cert_number: { type: ["string", "null"] },
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
                          "is_slab",
                          "grading_company",
                          "grade",
                          "cert_number",
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
