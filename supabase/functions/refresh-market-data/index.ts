// Refresh market data: upserts cards from TCG APIs, then enriches with PSA pop + PSA 10 prices.
// Designed to run incrementally — each invocation processes a chunk so it stays within the
// edge function timeout. Daily pg_cron pings it; admins can also trigger it from the Markets UI.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RefreshBody {
  game?: "pokemon" | "onepiece" | "all";
  // Max cards to ingest from the TCG API in this invocation
  ingest_limit?: number;
  // Max cards to enrich with PSA in this invocation
  enrich_limit?: number;
  // Skip the TCG ingest step (just enrich existing rows)
  skip_ingest?: boolean;
  // Skip PSA enrichment (just refresh raw prices)
  skip_psa?: boolean;
}

const POKEMON_API = "https://api.pokemontcg.io/v2";
const PSA_API = "https://api.psacard.com/publicapi";

function pickPokemonRawPrice(card: any): number | null {
  const prices = card?.tcgplayer?.prices;
  if (!prices) return null;
  const variants = [
    "holofoil",
    "reverseHolofoil",
    "normal",
    "1stEditionHolofoil",
  ];
  for (const v of variants) {
    const p = prices[v];
    if (p?.market) return p.market;
    if (p?.mid) return p.mid;
  }
  return null;
}

async function ingestPokemon(
  supabase: any,
  pokemonKey: string | undefined,
  limit: number,
): Promise<{ upserted: number; pages: number }> {
  // Cards with TCGplayer market price >= $1, paged. We sort by release date
  // descending so newer cards (more relevant) come in first across runs.
  const pageSize = 250;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (pokemonKey) headers["X-Api-Key"] = pokemonKey;

  let upserted = 0;
  let page = 1;
  let pages = 0;

  while (upserted < limit) {
    const url = `${POKEMON_API}/cards?q=${encodeURIComponent(
      "tcgplayer.prices.holofoil.market:[1 TO *] OR tcgplayer.prices.normal.market:[1 TO *]",
    )}&pageSize=${pageSize}&page=${page}&orderBy=-set.releaseDate`;

    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.warn("Pokemon TCG fetch failed", resp.status);
      break;
    }
    const data = await resp.json();
    const cards: any[] = data?.data ?? [];
    if (cards.length === 0) break;
    pages++;

    const rows = cards
      .map((c) => {
        const raw = pickPokemonRawPrice(c);
        if (!raw) return null;
        return {
          game: "pokemon",
          external_id: c.id,
          name: c.name,
          set_id: c.set?.id ?? null,
          set_name: c.set?.name ?? null,
          number: c.number ?? null,
          rarity: c.rarity ?? null,
          image_url: c.images?.small ?? null,
          tcgplayer_url: c.tcgplayer?.url ?? null,
          _raw_price: raw,
        };
      })
      .filter(Boolean) as any[];

    if (rows.length === 0) {
      page++;
      continue;
    }

    // Upsert cards
    const { data: upsertedCards, error } = await supabase
      .from("market_cards")
      .upsert(
        rows.map(({ _raw_price, ...r }) => r),
        { onConflict: "game,external_id" },
      )
      .select("id, external_id");

    if (error) {
      console.error("market_cards upsert error", error);
      break;
    }

    // Upsert raw prices in market_snapshots (preserve PSA fields if already set)
    const idByExternal = new Map(
      (upsertedCards ?? []).map((r: any) => [r.external_id, r.id]),
    );
    const snapshots = rows
      .map((r) => {
        const id = idByExternal.get(r.external_id);
        if (!id) return null;
        return {
          card_id: id,
          raw_price: r._raw_price,
          last_refreshed_at: new Date().toISOString(),
        };
      })
      .filter(Boolean) as any[];

    // We can't preserve psa fields with a plain upsert because it overwrites all columns.
    // Instead, do a manual upsert: insert; on conflict only update raw_price.
    for (const snap of snapshots) {
      await supabase.rpc("noop").catch(() => {}); // placeholder no-op kept harmless
    }
    // Use a single upsert that only sets raw_price/last_refreshed_at, preserving PSA cols.
    const { error: snapErr } = await supabase.rpc("upsert_market_raw_prices", {
      payload: snapshots,
    });
    if (snapErr) {
      // Fallback: plain upsert (will null PSA fields for new rows only).
      await supabase.from("market_snapshots").upsert(snapshots, {
        onConflict: "card_id",
        ignoreDuplicates: false,
      });
    }

    upserted += snapshots.length;
    page++;
    if (cards.length < pageSize) break;
  }

  return { upserted, pages };
}

async function ingestOnePiece(supabase: any, limit: number) {
  // One Piece API exists in src/services/optcgApi.ts but raw market pricing is intentionally
  // disabled per user preference. We'll still upsert card metadata so users see them in the
  // catalog, but raw_price stays null until pricing is added.
  // Skipped for now to avoid noise; placeholder for future expansion.
  return { upserted: 0, pages: 0 };
}

async function enrichWithPSA(
  supabase: any,
  psaToken: string,
  limit: number,
): Promise<{ enriched: number; psa_lookups: number; errors: number }> {
  // Pull cards needing enrichment: never enriched OR last_refreshed_at > 24h ago.
  const { data: candidates, error } = await supabase
    .from("market_snapshots")
    .select("card_id, raw_price, last_refreshed_at, market_cards!inner(name, number, set_name, game)")
    .eq("market_cards.game", "pokemon")
    .gte("raw_price", 1)
    .or(
      `psa10_pop.is.null,last_refreshed_at.lt.${new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString()}`,
    )
    .order("raw_price", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("PSA candidate fetch error", error);
    return { enriched: 0, psa_lookups: 0, errors: 1 };
  }

  let enriched = 0;
  let lookups = 0;
  let errors = 0;

  for (const row of candidates ?? []) {
    const card = (row as any).market_cards;
    lookups++;
    try {
      // PSA Public API: search specs by description.
      // Endpoint shape: /pop/GetPSASpecPopulationFromSetID/... or search by free-text.
      // Most stable public endpoint is the spec search:
      // https://api.psacard.com/publicapi/pop/GetSetItems/{setId}
      // We don't have PSA setIDs mapped, so we use the search endpoint:
      const q = `${card.name} ${card.number ?? ""} ${card.set_name ?? ""}`.trim();
      const psaUrl = `${PSA_API}/pop/GetPSASpecPopulationByItemName?itemName=${encodeURIComponent(
        q,
      )}`;
      const resp = await fetch(psaUrl, {
        headers: {
          authorization: `Bearer ${psaToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!resp.ok) {
        // 404 = no match; other = transient. Don't blow up the whole run.
        errors++;
        continue;
      }
      const data = await resp.json();
      const specs: any[] = Array.isArray(data) ? data : data?.specs ?? data?.Specs ?? [];
      const best = specs[0];
      if (!best) continue;

      const totalPop =
        Number(best.TotalPopulation ?? best.totalPopulation ?? best.Total ?? 0) || 0;
      const psa10Pop =
        Number(best.PSA10 ?? best.psa10 ?? best.Grade10 ?? 0) || 0;
      const gemRate = totalPop > 0 ? psa10Pop / totalPop : null;

      // PSA 10 price via Auction Prices Realized
      let psa10Price: number | null = null;
      let sampleSize = 0;
      if (best.SpecID || best.specID || best.id) {
        const specId = best.SpecID ?? best.specID ?? best.id;
        try {
          const aprResp = await fetch(
            `${PSA_API}/auctionprices/GetAuctionPrices/${specId}?grade=10`,
            { headers: { authorization: `Bearer ${psaToken}` } },
          );
          if (aprResp.ok) {
            const apr = await aprResp.json();
            const sales: any[] = apr?.AuctionPrices ?? apr?.prices ?? apr ?? [];
            if (sales.length > 0) {
              const prices = sales
                .map((s: any) => Number(s.SalePrice ?? s.price ?? s.amount))
                .filter((n) => Number.isFinite(n) && n > 0)
                .sort((a, b) => a - b);
              sampleSize = prices.length;
              if (prices.length > 0) {
                psa10Price = prices[Math.floor(prices.length / 2)];
              }
            }
          }
        } catch (e) {
          // Non-fatal
        }
      }

      const ratio =
        psa10Price && (row as any).raw_price
          ? psa10Price / Number((row as any).raw_price)
          : null;

      await supabase
        .from("market_snapshots")
        .update({
          psa10_pop: psa10Pop || null,
          psa_total_pop: totalPop || null,
          gem_rate: gemRate,
          psa10_price: psa10Price,
          psa10_ratio: ratio,
          sample_size: sampleSize,
          last_refreshed_at: new Date().toISOString(),
        })
        .eq("card_id", (row as any).card_id);

      enriched++;
    } catch (e) {
      console.error("PSA enrich error", e);
      errors++;
    }
  }

  return { enriched, psa_lookups: lookups, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const psaToken = Deno.env.get("PSA_API_TOKEN") ?? "";
  const pokemonKey = Deno.env.get("POKEMON_TCG_API_KEY") ?? undefined;

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: RefreshBody = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const game = body.game ?? "all";
  const ingestLimit = Math.min(body.ingest_limit ?? 1000, 5000);
  const enrichLimit = Math.min(body.enrich_limit ?? 50, 200);

  const { data: run } = await supabase
    .from("market_refresh_runs")
    .insert({
      game,
      status: "running",
      notes: `ingest_limit=${ingestLimit} enrich_limit=${enrichLimit}`,
    })
    .select("id")
    .single();

  let cardsUpserted = 0;
  let psaLookups = 0;
  let snapshotsUpserted = 0;
  let errs = 0;

  try {
    if (!body.skip_ingest && (game === "all" || game === "pokemon")) {
      const r = await ingestPokemon(supabase, pokemonKey, ingestLimit);
      cardsUpserted += r.upserted;
      snapshotsUpserted += r.upserted;
    }
    if (!body.skip_ingest && (game === "all" || game === "onepiece")) {
      const r = await ingestOnePiece(supabase, ingestLimit);
      cardsUpserted += r.upserted;
    }
    if (!body.skip_psa && psaToken) {
      const r = await enrichWithPSA(supabase, psaToken, enrichLimit);
      psaLookups = r.psa_lookups;
      errs += r.errors;
    }

    if (run?.id) {
      await supabase
        .from("market_refresh_runs")
        .update({
          finished_at: new Date().toISOString(),
          cards_upserted: cardsUpserted,
          snapshots_upserted: snapshotsUpserted,
          psa_lookups: psaLookups,
          errors: errs,
          status: "ok",
        })
        .eq("id", run.id);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        cards_upserted: cardsUpserted,
        snapshots_upserted: snapshotsUpserted,
        psa_lookups: psaLookups,
        errors: errs,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (run?.id) {
      await supabase
        .from("market_refresh_runs")
        .update({
          finished_at: new Date().toISOString(),
          status: "error",
          notes: msg,
        })
        .eq("id", run.id);
    }
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
