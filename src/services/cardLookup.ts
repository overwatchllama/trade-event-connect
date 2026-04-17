/**
 * Unified card lookup helper for scanner results.
 * Resolves AI-detected guesses into concrete card matches with pricing.
 */
import { pokemonTcgApi, type PokemonCard } from "./pokemonTcgApi";
import { optcgApi, type OPTCGCard } from "./optcgApi";

export interface ResolvedCard {
  game: "pokemon" | "onepiece";
  externalId: string;
  name: string;
  setName: string | null;
  number: string | null;
  rarity: string | null;
  imageUrl: string | null;
  tcgplayerMarketPrice: number | null;
  tcgplayerUrl: string | null;
  ebaySearchUrl: string;
}

const buildEbaySearch = (terms: string[]) => {
  const q = terms.filter(Boolean).join(" ");
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&LH_Complete=1`;
};

const pokemonToResolved = (c: PokemonCard): ResolvedCard => {
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
    number: c.number ?? null,
    rarity: c.rarity ?? null,
    imageUrl: c.images?.small ?? null,
    tcgplayerMarketPrice: market,
    tcgplayerUrl: c.tcgplayer?.url ?? null,
    ebaySearchUrl: buildEbaySearch([c.name, c.set?.name ?? "", c.number ?? "", "pokemon"]),
  };
};

const opToResolved = (c: OPTCGCard): ResolvedCard => ({
  game: "onepiece",
  externalId: c.card_set_id,
  name: c.card_name,
  setName: c.set_name ?? null,
  number: c.card_set_id ?? null,
  rarity: c.rarity ?? null,
  imageUrl: c.card_image ?? null,
  tcgplayerMarketPrice: null, // user preference: no market price for One Piece
  tcgplayerUrl: null,
  ebaySearchUrl: buildEbaySearch([c.card_name, c.set_name ?? "", "one piece tcg"]),
});

export async function searchCards(opts: {
  game: "pokemon" | "onepiece" | "unknown";
  name?: string | null;
  number?: string | null;
  setHint?: string | null;
}): Promise<ResolvedCard[]> {
  const { game, name, number } = opts;
  if (!name) return [];

  const tryPokemon = async (): Promise<ResolvedCard[]> => {
    try {
      const parts = [`name:"${name}"`];
      if (number) parts.push(`number:${number.split("/")[0]}`);
      const resp = await pokemonTcgApi.searchCards({
        q: parts.join(" "),
        pageSize: 12,
        orderBy: "-set.releaseDate",
      });
      return (resp.data ?? []).map(pokemonToResolved);
    } catch (e) {
      console.error("Pokemon lookup error", e);
      return [];
    }
  };

  const tryOnePiece = async (): Promise<ResolvedCard[]> => {
    try {
      const resp = await optcgApi.getFilteredCards({ card_name: name });
      return (resp ?? []).slice(0, 12).map(opToResolved);
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
