/**
 * Unified card lookup helper for scanner results.
 * Resolves AI-detected guesses into concrete card matches with pricing.
 *
 * Strategy: prioritize the bottom-of-card markers (set + collector number) over the
 * card name. The same name is reprinted across many sets at very different prices,
 * so a name-only match is the LEAST useful for accurate pricing.
 *
 * Order of preference:
 *   1. set + number  → exact printing → exact price
 *   2. number only   → narrow to a few candidates across sets
 *   3. set + name    → reprint within a known set
 *   4. name only     → broad fallback (sorted newest-first)
 */
import { pokemonTcgApi, type PokemonCard } from "./pokemonTcgApi";
import { optcgApi, type OPTCGCard } from "./optcgApi";

export interface ResolvedCard {
  game: "pokemon" | "onepiece";
  externalId: string;
  name: string;
  setName: string | null;
  setCode: string | null;
  setSymbolUrl: string | null;
  number: string | null;
  rarity: string | null;
  imageUrl: string | null;
  tcgplayerMarketPrice: number | null;
  tcgplayerUrl: string | null;
  ebaySearchUrl: string;
  /** How this match was found — drives the "matched on..." badge in the UI. */
  matchedOn: "set+number" | "number" | "set+name" | "name" | "unknown";
}

const buildEbaySearch = (terms: string[]) => {
  const q = terms.filter(Boolean).join(" ");
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&LH_Complete=1`;
};

const pokemonToResolved = (
  c: PokemonCard,
  matchedOn: ResolvedCard["matchedOn"],
): ResolvedCard => {
  const market =
    c.tcgplayer?.prices?.holofoil?.market ??
    c.tcgplayer?.prices?.normal?.market ??
    c.tcgplayer?.prices?.reverseHolofoil?.market ??
    null;
  return {
    game: "pokemon",
    externalId: c.id,
    name: c.name,
    setName: c.set?.name ?? null,
    setCode: c.set?.ptcgoCode ?? null,
    setSymbolUrl: c.set?.images?.symbol ?? null,
    number: c.number ?? null,
    rarity: c.rarity ?? null,
    imageUrl: c.images?.small ?? null,
    tcgplayerMarketPrice: market,
    tcgplayerUrl: c.tcgplayer?.url ?? null,
    ebaySearchUrl: buildEbaySearch([
      c.name,
      c.set?.name ?? "",
      c.number ?? "",
      "pokemon",
    ]),
    matchedOn,
  };
};

const opToResolved = (
  c: OPTCGCard,
  matchedOn: ResolvedCard["matchedOn"],
): ResolvedCard => ({
  game: "onepiece",
  externalId: c.card_set_id,
  name: c.card_name,
  setName: c.set_name ?? null,
  setCode: null,
  setSymbolUrl: null,
  number: c.card_set_id ?? null,
  rarity: c.rarity ?? null,
  imageUrl: c.card_image ?? null,
  tcgplayerMarketPrice: null, // user preference: no market price for One Piece
  tcgplayerUrl: null,
  ebaySearchUrl: buildEbaySearch([c.card_name, c.set_name ?? "", "one piece tcg"]),
  matchedOn,
});

/**
 * Build a Pokémon TCG API query that prefers structural markers over the name.
 * The Pokémon TCG API supports Lucene-like queries on:
 *   - number:25
 *   - set.id:sv1
 *   - set.ptcgoCode:SVI
 *   - set.name:"Paldea Evolved"
 *   - name:"Charizard"
 */
const buildPokemonQuery = (parts: {
  name?: string | null;
  number?: string | null;
  setCode?: string | null;
  setHint?: string | null;
}) => {
  const q: string[] = [];
  if (parts.number) {
    // Strip leading zeros and any "/total" suffix
    const numericPart = parts.number.split("/")[0].replace(/^0+/, "") || "0";
    q.push(`number:${numericPart}`);
  }
  if (parts.setCode) {
    q.push(`set.ptcgoCode:${parts.setCode.toUpperCase()}`);
  } else if (parts.setHint) {
    // Quoted fuzzy set name — useful when the AI guessed a full set name string
    q.push(`set.name:"${parts.setHint.replace(/"/g, "")}"`);
  }
  if (parts.name) {
    q.push(`name:"${parts.name.replace(/"/g, "")}"`);
  }
  return q.join(" ");
};

export async function searchCards(opts: {
  game: "pokemon" | "onepiece" | "unknown";
  name?: string | null;
  number?: string | null;
  setHint?: string | null;
  setCode?: string | null;
}): Promise<ResolvedCard[]> {
  const { game, name, number, setHint, setCode } = opts;

  // Need at least one usable signal.
  if (!name && !number) return [];

  const tryPokemon = async (): Promise<ResolvedCard[]> => {
    // Build a list of attempts, narrowest first.
    const attempts: Array<{
      label: ResolvedCard["matchedOn"];
      query: string | null;
    }> = [];

    if (number && (setCode || setHint)) {
      attempts.push({
        label: "set+number",
        query: buildPokemonQuery({ number, setCode, setHint }),
      });
    }
    if (number) {
      attempts.push({
        label: "number",
        query: buildPokemonQuery({ number, name }),
      });
    }
    if (name && (setCode || setHint)) {
      attempts.push({
        label: "set+name",
        query: buildPokemonQuery({ name, setCode, setHint }),
      });
    }
    if (name) {
      attempts.push({
        label: "name",
        query: buildPokemonQuery({ name }),
      });
    }

    for (const attempt of attempts) {
      if (!attempt.query) continue;
      try {
        const resp = await pokemonTcgApi.searchCards({
          q: attempt.query,
          pageSize: 12,
          orderBy: "-set.releaseDate",
        });
        const data = resp.data ?? [];
        if (data.length > 0) {
          return data.map((c) => pokemonToResolved(c, attempt.label));
        }
      } catch (e) {
        console.error(
          `Pokemon lookup error (matchedOn=${attempt.label})`,
          e,
        );
      }
    }
    return [];
  };

  const tryOnePiece = async (): Promise<ResolvedCard[]> => {
    try {
      // OPTCG API doesn't expose a number-by-itself filter here; fall back to name.
      if (!name) return [];
      const resp = await optcgApi.getFilteredCards({ card_name: name });
      const matchedOn: ResolvedCard["matchedOn"] = setHint
        ? "set+name"
        : "name";
      return (resp ?? []).slice(0, 12).map((c) => opToResolved(c, matchedOn));
    } catch (e) {
      console.error("One Piece lookup error", e);
      return [];
    }
  };

  if (game === "pokemon") return tryPokemon();
  if (game === "onepiece") return tryOnePiece();
  // unknown — try both
  const [a, b] = await Promise.all([tryPokemon(), tryOnePiece()]);
  return [...a, ...b];
}
