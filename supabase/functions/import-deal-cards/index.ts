// Import cards into a deal proposal from an external URL.
// Supports:
//   - Collector Companion: /p/deal/:token (public proposal lines)
//                          /vendor/:id or /v/:slug storefront-style URLs
//   - TCGplayer: mass-entry, decklist, product list pages (scraped via Firecrawl, parsed by AI)
//   - eBay: single listing page (scraped, parsed by AI)
//
// Auth: caller must own the target proposal (deal_proposals.vendor_id = auth.uid()).
// Strategy: fetch markdown via Firecrawl, then ask Lovable AI gateway to extract a card list.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Side = "input" | "output";

interface ExtractedCard {
  card_name: string;
  set_name?: string | null;
  card_number?: string | null;
  condition?: string | null;
  quantity?: number | null;
  unit_value?: number | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const detectSource = (
  url: string,
): "collector" | "tcgplayer" | "ebay" | "unknown" => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("collectorcompanion") || host.includes("lovable.app")) {
      return "collector";
    }
    if (host.includes("tcgplayer.com")) return "tcgplayer";
    if (host.includes("ebay.")) return "ebay";
    return "unknown";
  } catch {
    return "unknown";
  }
};

async function importFromCollector(
  url: string,
  serviceClient: ReturnType<typeof createClient>,
): Promise<ExtractedCard[]> {
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  // /p/deal/:token
  if (parts[0] === "p" && parts[1] === "deal" && parts[2]) {
    const token = parts[2];
    const { data } = await serviceClient.rpc("get_public_deal_proposal", {
      p_token: token,
    });
    // data shape: { proposal, lines: [...] }
    // deno-lint-ignore no-explicit-any
    const lines: any[] = (data as any)?.lines ?? [];
    return lines
      .filter((l) => l.kind === "card" && l.card_name)
      .map((l) => ({
        card_name: l.card_name,
        set_name: l.set_name,
        card_number: l.card_number,
        condition: l.condition,
        quantity: l.quantity ?? 1,
        unit_value: l.unit_value,
      }));
  }
  // /vendor/:id storefront — pull listing_status=for_sale items via public view
  if ((parts[0] === "vendor" || parts[0] === "v") && parts[1]) {
    const vendorId = parts[1];
    // Try to resolve vendor.user_id, fallback to treating param as user_id
    let userId = vendorId;
    const { data: v } = await serviceClient
      .from("vendors")
      .select("user_id")
      .eq("id", vendorId)
      .maybeSingle();
    // deno-lint-ignore no-explicit-any
    if ((v as any)?.user_id) userId = (v as any).user_id;
    const { data: items } = await serviceClient
      // deno-lint-ignore no-explicit-any
      .from("public_deal_list_items" as any)
      .select("card_name,set_name,card_number,condition,quantity,list_price")
      .eq("user_id", userId)
      .limit(200);
    // deno-lint-ignore no-explicit-any
    return ((items as any[]) ?? []).map((i) => ({
      card_name: i.card_name,
      set_name: i.set_name,
      card_number: i.card_number,
      condition: i.condition,
      quantity: i.quantity ?? 1,
      unit_value: i.list_price ?? null,
    }));
  }
  throw new Error(
    "Unrecognized Collector Companion URL — paste a /p/deal/:token or /vendor/:id link.",
  );
}

async function firecrawlScrape(url: string): Promise<string> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Firecrawl error (${res.status}): ${data?.error ?? "scrape failed"}`,
    );
  }
  // Firecrawl v2 may return either { data: { markdown } } or { markdown }
  const md = data?.markdown ?? data?.data?.markdown;
  if (!md) throw new Error("Firecrawl returned no markdown content.");
  return md as string;
}

async function aiExtractCards(
  markdown: string,
  source: "tcgplayer" | "ebay",
): Promise<ExtractedCard[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const truncated = markdown.slice(0, 24000);

  const systemPrompt =
    source === "ebay"
      ? "You extract a single trading card from an eBay listing page. Use the listing title to fill card_name (just the card name, not the full title), set_name, and card_number when present. Use the Buy It Now / current price as unit_value (number, USD)."
      : "You extract every trading card listed on a TCGplayer page (mass entry, decklist, search results, or product list). For each card extract card_name, set_name (if shown), card_number (if shown), quantity (default 1), and unit_value (market/listed price as a number in USD, if visible). Do not invent data — leave fields null when unknown.";

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Page content (markdown):\n\n${truncated}\n\nReturn cards via the extract_cards tool.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_cards",
            description: "Return the list of cards found on the page.",
            parameters: {
              type: "object",
              properties: {
                cards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      card_name: { type: "string" },
                      set_name: { type: "string", nullable: true },
                      card_number: { type: "string", nullable: true },
                      quantity: { type: "number", nullable: true },
                      unit_value: { type: "number", nullable: true },
                    },
                    required: ["card_name"],
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
        function: { name: "extract_cards" },
      },
    }),
  });

  if (res.status === 429) {
    throw new Error("AI rate limit reached. Please try again shortly.");
  }
  if (res.status === 402) {
    throw new Error("AI credits exhausted. Add credits in Lovable settings.");
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`AI extraction failed: ${JSON.stringify(data).slice(0, 200)}`);
  }
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  const argStr = call?.function?.arguments;
  if (!argStr) return [];
  let parsed: { cards?: ExtractedCard[] } = {};
  try {
    parsed = JSON.parse(argStr);
  } catch {
    return [];
  }
  return (parsed.cards ?? []).filter((c) => c && c.card_name);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const url: string = body.url;
    const proposalId: string | null = body.proposal_id ?? null;
    const side: Side = body.side === "output" ? "output" : "input";
    const createNew: boolean = !!body.create_new;
    const title: string | undefined = body.title;

    if (!url || typeof url !== "string") {
      return json({ error: "Missing url" }, 400);
    }
    try {
      new URL(url);
    } catch {
      return json({ error: "Invalid URL" }, 400);
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const source = detectSource(url);

    let cards: ExtractedCard[] = [];
    if (source === "collector") {
      cards = await importFromCollector(url, serviceClient);
    } else if (source === "tcgplayer" || source === "ebay") {
      const md = await firecrawlScrape(url);
      cards = await aiExtractCards(md, source);
    } else {
      return json(
        {
          error:
            "Unsupported link. Use a Collector Companion, TCGplayer, or eBay URL.",
        },
        400,
      );
    }

    if (cards.length === 0) {
      return json({ error: "No cards could be extracted from that link." }, 422);
    }

    // Resolve target proposal — either existing (must own) or create a new draft.
    let targetId = proposalId;
    if (createNew || !targetId) {
      const { data, error } = await serviceClient
        .from("deal_proposals")
        .insert({
          vendor_id: user.id,
          title: title?.trim() || `Imported from ${source}`,
        })
        .select("id")
        .single();
      if (error) return json({ error: error.message }, 500);
      // deno-lint-ignore no-explicit-any
      targetId = (data as any).id as string;
    } else {
      const { data: prop, error } = await serviceClient
        .from("deal_proposals")
        .select("id,vendor_id")
        .eq("id", targetId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      // deno-lint-ignore no-explicit-any
      if (!prop || (prop as any).vendor_id !== user.id) {
        return json({ error: "Forbidden" }, 403);
      }
    }

    // Determine starting sort_order for this side.
    const { count } = await serviceClient
      .from("deal_proposal_lines")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", targetId)
      .eq("side", side);
    const startIdx = count ?? 0;

    const rows = cards.slice(0, 100).map((c, i) => ({
      proposal_id: targetId!,
      side,
      kind: "card" as const,
      card_name: c.card_name?.slice(0, 200) ?? null,
      set_name: c.set_name?.slice(0, 200) ?? null,
      card_number: c.card_number?.slice(0, 50) ?? null,
      condition: c.condition || "near_mint",
      quantity:
        typeof c.quantity === "number" && c.quantity > 0
          ? Math.floor(c.quantity)
          : 1,
      unit_value:
        typeof c.unit_value === "number" && c.unit_value >= 0
          ? c.unit_value
          : null,
      sort_order: startIdx + i,
    }));

    const { error: insErr } = await serviceClient
      .from("deal_proposal_lines")
      .insert(rows);
    if (insErr) return json({ error: insErr.message }, 500);

    return json({
      success: true,
      proposal_id: targetId,
      imported: rows.length,
      source,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("import-deal-cards error", msg);
    return json({ error: msg }, 500);
  }
});
