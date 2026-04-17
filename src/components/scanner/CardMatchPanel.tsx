import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Plus, ImageOff } from "lucide-react";
import type { ResolvedCard } from "@/services/cardLookup";

interface DetectedCard {
  bbox: { x: number; y: number; w: number; h: number };
  game: "pokemon" | "onepiece" | "unknown";
  guess_name: string | null;
  guess_set: string | null;
  guess_number: string | null;
  notes: string | null;
}

interface Props {
  activeIdx: number | null;
  detected: DetectedCard[];
  matches: ResolvedCard[];
  loading: boolean;
  onAdd: (m: ResolvedCard) => void;
}

export const CardMatchPanel = ({ activeIdx, detected, matches, loading, onAdd }: Props) => {
  const active = activeIdx !== null ? detected[activeIdx] : null;

  return (
    <Card className="p-4 space-y-4 lg:sticky lg:top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
      <div>
        <h2 className="font-semibold">
          {active ? `Card #${(activeIdx as number) + 1}` : "Pick a card"}
        </h2>
        {active ? (
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            <p>AI guess: {active.guess_name ?? "—"}</p>
            {active.guess_set && <p>Set: {active.guess_set}</p>}
            {active.guess_number && <p>#: {active.guess_number}</p>}
            <Badge variant="outline" className="mt-1 text-[10px]">
              {active.game}
            </Badge>
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
        {matches.map((m) => (
          <div key={`${m.game}-${m.externalId}`} className="border rounded-lg p-2 flex gap-3">
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
              <p className="text-xs text-muted-foreground truncate">
                {m.setName ?? "—"} {m.number ? `· ${m.number}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-1">
                {m.tcgplayerMarketPrice != null && (
                  <Badge variant="secondary" className="text-[10px]">
                    TCG ${m.tcgplayerMarketPrice.toFixed(2)}
                  </Badge>
                )}
                {m.rarity && (
                  <Badge variant="outline" className="text-[10px]">{m.rarity}</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {m.tcgplayerUrl && (
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                    <a href={m.tcgplayerUrl} target="_blank" rel="noreferrer">
                      TCG <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                  <a href={m.ebaySearchUrl} target="_blank" rel="noreferrer">
                    eBay sold <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => onAdd(m)}>
                  <Plus className="h-3 w-3 mr-1" /> Deal List
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
