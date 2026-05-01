import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Plus, ImageOff, Hash, Sparkles, Award, TrendingUp } from "lucide-react";
import type { ResolvedCard } from "@/services/cardLookup";
import { PriceSourceBadge } from "@/components/pricing/PriceSourceBadge";
import type { SlabComps } from "@/pages/CardScanner";

interface DetectedCard {
  bbox: { x: number; y: number; w: number; h: number };
  game: "pokemon" | "onepiece" | "unknown";
  guess_name: string | null;
  guess_set: string | null;
  guess_set_code: string | null;
  guess_set_symbol_description: string | null;
  guess_number: string | null;
  guess_total: string | null;
  confidence_basis:
    | "number_and_set"
    | "number_only"
    | "set_only"
    | "name_only"
    | "low"
    | null;
  notes: string | null;
  is_slab: boolean | null;
  grading_company:
    | "PSA"
    | "BGS"
    | "CGC"
    | "SGC"
    | "TAG"
    | "HGA"
    | "GMA"
    | "OTHER"
    | null;
  grade: string | null;
  cert_number: string | null;
}

interface Props {
  activeIdx: number | null;
  detected: DetectedCard[];
  matches: ResolvedCard[];
  loading: boolean;
  slabComps?: Record<string, SlabComps>;
  slabCompsLoading?: boolean;
  onAdd: (m: ResolvedCard) => void;
}

const formatMoney = (n: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
};

const matchedOnLabel: Record<ResolvedCard["matchedOn"], string> = {
  "set+number": "Exact: set + #",
  number: "By card #",
  "set+name": "By set + name",
  name: "By name only",
  unknown: "Unknown",
};

const matchedOnVariant: Record<
  ResolvedCard["matchedOn"],
  "default" | "secondary" | "outline"
> = {
  "set+number": "default",
  number: "secondary",
  "set+name": "secondary",
  name: "outline",
  unknown: "outline",
};

export const CardMatchPanel = ({ activeIdx, detected, matches, loading, slabComps, slabCompsLoading, onAdd }: Props) => {
  const active = activeIdx !== null ? detected[activeIdx] : null;

  // Compose printed-card-style "25/102" from what the AI saw
  const printedNumber = active
    ? active.guess_number
      ? active.guess_total
        ? `${active.guess_number}/${active.guess_total}`
        : active.guess_number
      : null
    : null;

  return (
    <Card className="p-4 space-y-4 lg:sticky lg:top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
      <div>
        <h2 className="font-semibold">
          {active ? `Card #${(activeIdx as number) + 1}` : "Pick a card"}
        </h2>
        {active ? (
          <div className="mt-2 space-y-2">
            {/* Primary identifiers — what the AI read off the BOTTOM of the card */}
            <div className="flex flex-wrap items-center gap-1.5">
              {active.is_slab && (
                <Badge className="text-[11px] gap-1 bg-amber-500 text-white hover:bg-amber-500/90 border-transparent">
                  <Award className="h-3 w-3" />
                  {active.grading_company ?? "Slab"}
                  {active.grade ? ` ${active.grade}` : ""}
                </Badge>
              )}
              {printedNumber && (
                <Badge variant="default" className="text-[11px] gap-1">
                  <Hash className="h-3 w-3" />
                  {printedNumber}
                </Badge>
              )}
              {active.guess_set_code && (
                <Badge variant="default" className="text-[11px] gap-1">
                  <Sparkles className="h-3 w-3" />
                  {active.guess_set_code}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {active.game}
              </Badge>
            </div>

            {/* Secondary context */}
            <div className="text-xs text-muted-foreground space-y-0.5">
              {active.guess_name && <p>Name: {active.guess_name}</p>}
              {active.guess_set && <p>Set: {active.guess_set}</p>}
              {active.guess_set_symbol_description &&
                !active.guess_set_code && (
                  <p>Set symbol: {active.guess_set_symbol_description}</p>
                )}
              {active.is_slab && active.cert_number && (
                <p>Cert #: {active.cert_number}</p>
              )}
            </div>

            {/* Slab-specific note: raw market price doesn't apply, point user at eBay sold comps. */}
            {active.is_slab && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
                Graded slab detected — TCGplayer / Cardmarket prices are for raw
                cards. The eBay sold link below is filtered to{" "}
                {active.grading_company ?? "graded"}
                {active.grade ? ` ${active.grade}` : ""} comps.
              </p>
            )}

            {/* Tell the user when we couldn't read the bottom-of-card markers */}
            {(active.confidence_basis === "name_only" ||
              active.confidence_basis === "low" ||
              (!active.guess_number && !active.guess_set_code)) && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
                Could not read the set symbol or card number on the bottom of
                the card — pricing may be off across reprints. Try a sharper,
                straight-on photo.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            Tap any numbered box on the photo to load matches.
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && active && matches.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No matches found. Try another card.
        </p>
      )}

      <div className="space-y-3">
        {matches.map((m) => {
          const compsKey = `${m.game}-${m.externalId}`;
          const comps = slabComps?.[compsKey];
          const isSlab = active?.is_slab === true;
          return (
          <div key={compsKey} className="border rounded-lg p-2 flex gap-3">
            <div className="w-16 h-22 shrink-0 bg-muted rounded overflow-hidden flex items-center justify-center">
              {m.imageUrl ? (
                <img
                  src={m.imageUrl}
                  alt={m.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <ImageOff className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-medium truncate" title={m.name}>{m.name}</p>
              <div className="flex items-center gap-1.5">
                {m.setSymbolUrl && (
                  <img
                    src={m.setSymbolUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-3.5 w-3.5 object-contain shrink-0"
                  />
                )}
                <p className="text-xs text-muted-foreground truncate">
                  {m.setName ?? "—"} {m.number ? `· #${m.number}` : ""}
                  {m.setCode ? ` · ${m.setCode}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Badge
                  variant={matchedOnVariant[m.matchedOn]}
                  className="text-[10px]"
                  title="How this match was found"
                >
                  {matchedOnLabel[m.matchedOn]}
                </Badge>
                <PriceSourceBadge source={m.priceSource} size="sm" />
                {m.rarity && (
                  <Badge variant="outline" className="text-[10px]">{m.rarity}</Badge>
                )}
              </div>

              {/* Graded sold-comp summary (slabs only) */}
              {isSlab && (
                <div className="mt-1 rounded-md border border-amber-500/30 bg-amber-500/5 p-1.5 text-[11px]">
                  {!comps && slabCompsLoading && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Fetching graded sold comps…
                    </div>
                  )}
                  {comps && comps.count === 0 && (
                    <p className="text-muted-foreground">
                      No graded sold comps found.
                    </p>
                  )}
                  {comps && comps.count > 0 && (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                          <TrendingUp className="h-3 w-3" />
                          Median {formatMoney(comps.median ?? 0, comps.currency)}
                        </span>
                        <span className="text-muted-foreground">
                          {comps.count} sold
                        </span>
                      </div>
                      {comps.min !== null && comps.max !== null && (
                        <p className="text-muted-foreground mt-0.5">
                          Range {formatMoney(comps.min, comps.currency)} –{" "}
                          {formatMoney(comps.max, comps.currency)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1 pt-1">
                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                  <a href={comps?.searchUrl ?? m.ebaySearchUrl} target="_blank" rel="noreferrer">
                    eBay sold <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => onAdd(m)}>
                  <Plus className="h-3 w-3 mr-1" /> Deal List
                </Button>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </Card>
  );
};
