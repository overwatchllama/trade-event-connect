import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SoldStats {
  count: number;
  median: number | null;
  mean: number | null;
  min: number | null;
  max: number | null;
  currency: string;
  searchUrl: string;
  samples: Array<{ price: number; title: string; url: string | null }>;
}

const median = (nums: number[]): number | null => {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

/**
 * Fetch eBay completed+sold listings page and parse out item prices/titles.
 * eBay's sold listings page is server-rendered HTML — we extract the price
 * tokens and titles per item card.
 */
async function fetchSoldComps(query: string): Promise<SoldStats> {
  const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
    query,
  )}&LH_Sold=1&LH_Complete=1&_ipg=60`;

  const resp = await fetch(searchUrl, {
    headers: {
      // eBay blocks obvious bots; mimic a desktop browser.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!resp.ok) {
    throw new HttpError(
      "EbayFetchError",
      `eBay returned ${resp.status}`,
      502,
    );
  }
  const html = await resp.text();

  // Each result is an <li class="s-item ..."> block. Slice the page into items.
  const itemBlocks = html.split(/<li[^>]+class="s-item[^"]*"/i).slice(1);

  const samples: SoldStats["samples"] = [];
  const prices: number[] = [];
  let currency = "USD";

  for (const block of itemBlocks) {
    // Skip eBay's "Shop on eBay" placeholder
    if (/Shop on eBay/i.test(block)) continue;

    // Title — inside <span role="heading">...</span> or class s-item__title
    const titleMatch =
      block.match(/class="s-item__title"[^>]*>(?:<span[^>]*>)?([^<]{4,200})/i) ||
      block.match(/role="heading"[^>]*>([^<]{4,200})/i);
    const title = titleMatch?.[1]?.replace(/&amp;/g, "&").trim() ?? "";

    // Skip "New Listing" prefix-only or empty titles
    if (!title || /^new listing$/i.test(title)) continue;

    // Price block — class s-item__price. May contain a range "$10.00 to $25.00".
    const priceMatch = block.match(/class="s-item__price"[^>]*>([^<]+)</i);
    if (!priceMatch) continue;
    const priceText = priceMatch[1].replace(/&nbsp;/g, " ").trim();

    // Detect currency token
    if (/EUR|€/.test(priceText)) currency = "EUR";
    else if (/GBP|£/.test(priceText)) currency = "GBP";

    // Pull all numeric prices from the text; for ranges average them.
    const nums = (priceText.match(/[\d,]+\.\d{2}/g) ?? [])
      .map((s) => parseFloat(s.replace(/,/g, "")))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (nums.length === 0) continue;
    const price = nums.reduce((a, b) => a + b, 0) / nums.length;

    // Item URL
    const urlMatch = block.match(/href="(https?:\/\/www\.ebay\.com\/itm\/[^"]+)"/i);
    const url = urlMatch?.[1] ?? null;

    samples.push({ price, title, url });
    prices.push(price);

    if (samples.length >= 30) break;
  }

  // Trim outliers (top/bottom 10%) before computing mean/median for stability.
  let trimmed = prices;
  if (prices.length >= 8) {
    const sorted = [...prices].sort((a, b) => a - b);
    const cut = Math.floor(sorted.length * 0.1);
    trimmed = sorted.slice(cut, sorted.length - cut);
  }

  return {
    count: prices.length,
    median: median(trimmed),
    mean: trimmed.length
      ? trimmed.reduce((a, b) => a + b, 0) / trimmed.length
      : null,
    min: prices.length ? Math.min(...prices) : null,
    max: prices.length ? Math.max(...prices) : null,
    currency,
    searchUrl,
    samples: samples.slice(0, 8),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = newRequestId();
  try {
    // Require authentication — prevent abuse as anonymous proxy / IP banning
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new HttpError("Unauthorized", "Unauthorized", 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data: claimsData, error: authErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claimsData?.claims) {
      throw new HttpError("Unauthorized", "Unauthorized", 401);
    }

    let body: { query?: string };
    try {
      body = await req.json();
    } catch {
      throw new HttpError("InvalidJson", "Body is not valid JSON", 400);
    }
    const { query } = body;
    if (!query || typeof query !== "string" || query.length < 3) {
      throw new HttpError(
        "MissingFields",
        "query (string, min 3 chars) is required",
        400,
      );
    }
    if (query.length > 250) {
      throw new HttpError("InvalidQuery", "query too long", 400);
    }

    const stats = await fetchSoldComps(query);
    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(`[ebay-sold-comps][${requestId}] error:`, e);
    return errorResponse(e, {
      defaultType: "EbaySoldCompsError",
      requestId,
      headers: corsHeaders,
    });
  }
});
