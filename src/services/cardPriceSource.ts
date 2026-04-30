/**
 * Resolve where a card's displayed market price actually came from, plus a
 * deep link to the underlying listing so users can verify it.
 *
 * Pokémon TCG cards carry pricing from two upstream sources surfaced by
 * pokemontcg.io: TCGplayer (USD) and Cardmarket (EUR). MTG / Scryfall cards
 * publish their own USD/EUR price snapshots and a `purchase_uris` block
 * pointing at TCGplayer / Cardmarket listings.
 */
import type { PokemonCard } from "./pokemonTcgApi";
import type { ScryfallCard } from "./scryfallApi";

export type PriceSourceId = "tcgplayer" | "cardmarket" | "scryfall";

export interface PriceSource {
  /** Numeric market price already converted to a number. */
  price: number;
  /** Currency code for display (USD / EUR). */
  currency: "USD" | "EUR";
  /** Human-friendly source label, e.g. "TCGplayer". */
  sourceLabel: string;
  /** Stable id for icon/styling decisions. */
  source: PriceSourceId;
  /** Deep link to the listing on the source. May be null if upstream omitted it. */
  url: string | null;
  /** Last-updated timestamp from the source (ISO), if available. */
  updatedAt: string | null;
  /** Optional variant qualifier, e.g. "Holofoil", "Normal", "Foil". */
  variantLabel: string | null;
}

/**
 * Pokémon TCG: prefer TCGplayer (USD market) → fall back to Cardmarket (EUR avg).
 * Picks the most "default" foil treatment available on the card.
 */
export const getPokemonPriceSource = (
  card: PokemonCard,
): PriceSource | null => {
  const tcg = card.tcgplayer;
  if (tcg?.prices) {
    const variantOrder: Array<keyof NonNullable<typeof tcg.prices>> = [
      "normal",
      "holofoil",
      "reverseHolofoil",
      "1stEditionHolofoil",
    ];
    for (const variant of variantOrder) {
      const slot = tcg.prices[variant];
      const price = slot?.market ?? slot?.mid ?? null;
      if (typeof price === "number" && price > 0) {
        return {
          price,
          currency: "USD",
          source: "tcgplayer",
          sourceLabel: "TCGplayer",
          url: tcg.url ?? null,
          updatedAt: tcg.updatedAt ?? null,
          variantLabel: variant === "1stEditionHolofoil"
            ? "1st Ed. Holo"
            : variant === "reverseHolofoil"
              ? "Reverse Holo"
              : variant === "holofoil"
                ? "Holofoil"
                : "Normal",
        };
      }
    }
  }

  const cm = card.cardmarket;
  const cmPrice = cm?.prices?.averageSellPrice ?? cm?.prices?.trendPrice ?? null;
  if (cm && typeof cmPrice === "number" && cmPrice > 0) {
    return {
      price: cmPrice,
      currency: "EUR",
      source: "cardmarket",
      sourceLabel: "Cardmarket",
      url: cm.url ?? null,
      updatedAt: cm.updatedAt ?? null,
      variantLabel: null,
    };
  }

  return null;
};

/**
 * Scryfall (MTG): the card itself is the source of truth for the price snapshot,
 * but Scryfall conveniently exposes `purchase_uris` deep-links to TCGplayer /
 * Cardmarket so users can verify on the storefront.
 */
export const getScryfallPriceSource = (
  card: ScryfallCard,
): PriceSource | null => {
  const variants: Array<{
    key: keyof ScryfallCard["prices"];
    label: string;
    currency: "USD" | "EUR";
  }> = [
    { key: "usd", label: "Normal", currency: "USD" },
    { key: "usd_foil", label: "Foil", currency: "USD" },
    { key: "usd_etched", label: "Etched", currency: "USD" },
    { key: "eur", label: "Normal", currency: "EUR" },
    { key: "eur_foil", label: "Foil", currency: "EUR" },
  ];

  for (const v of variants) {
    const raw = card.prices?.[v.key];
    const price = raw ? parseFloat(raw) : NaN;
    if (Number.isFinite(price) && price > 0) {
      // Prefer the storefront link Scryfall provides; otherwise link back to
      // the card's Scryfall page so users can still verify.
      const purchase = card.purchase_uris?.tcgplayer ??
        card.purchase_uris?.cardmarket ?? null;
      return {
        price,
        currency: v.currency,
        // We surface "Scryfall" as the data source — that's where the snapshot
        // came from — but the link points at the actual storefront listing.
        source: "scryfall",
        sourceLabel: "Scryfall",
        url: purchase ?? card.scryfall_uri ?? null,
        updatedAt: null,
        variantLabel: v.label,
      };
    }
  }

  return null;
};

const currencyFormatters: Record<"USD" | "EUR", Intl.NumberFormat> = {
  USD: new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }),
  EUR: new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }),
};

export const formatPrice = (source: PriceSource): string =>
  currencyFormatters[source.currency].format(source.price);
