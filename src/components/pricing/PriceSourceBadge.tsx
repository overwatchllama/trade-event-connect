import { ExternalLink, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatPrice, type PriceSource } from "@/services/cardPriceSource";

interface PriceSourceBadgeProps {
  /** Resolved price + provenance. Pass null to render an "N/A" placeholder. */
  source: PriceSource | null;
  /** Visual size — `sm` is for tight result tiles, `md` for detail panels. */
  size?: "sm" | "md";
  className?: string;
}

const sourceCopy: Record<
  PriceSource["source"],
  { provider: string; description: string }
> = {
  tcgplayer: {
    provider: "TCGplayer",
    description:
      "USD market price aggregated by TCGplayer and surfaced via the Pokémon TCG API.",
  },
  cardmarket: {
    provider: "Cardmarket",
    description:
      "EUR average sell price from Cardmarket, surfaced via the Pokémon TCG API.",
  },
  scryfall: {
    provider: "Scryfall",
    description:
      "Snapshot price from Scryfall. The link points to the corresponding TCGplayer or Cardmarket listing when available.",
  },
};

const formatUpdated = (iso: string | null): string | null => {
  if (!iso) return null;
  // Some upstreams send "YYYY/MM/DD"; normalize for the Date constructor.
  const normalized = iso.includes("/") ? iso.replace(/\//g, "-") : iso;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
};

export const PriceSourceBadge = ({
  source,
  size = "sm",
  className,
}: PriceSourceBadgeProps) => {
  if (!source) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-muted-foreground",
          size === "sm" ? "text-[10px]" : "text-xs",
          className,
        )}
      >
        Price N/A
      </Badge>
    );
  }

  const copy = sourceCopy[source.source];
  const updated = formatUpdated(source.updatedAt);
  const priceText = formatPrice(source);

  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-medium",
        "bg-secondary text-secondary-foreground border-border",
        "hover:bg-accent hover:text-accent-foreground transition-colors",
        size === "sm" ? "text-[10px]" : "text-xs",
        className,
      )}
    >
      <span>{priceText}</span>
      <span className="opacity-60">·</span>
      <span className="font-normal opacity-80">{copy.provider}</span>
      {source.url ? (
        <ExternalLink className="h-2.5 w-2.5 opacity-70" />
      ) : (
        <Info className="h-2.5 w-2.5 opacity-70" />
      )}
    </span>
  );

  const tooltipBody = (
    <div className="max-w-xs space-y-1 text-xs">
      <p className="font-semibold">
        {priceText} via {copy.provider}
      </p>
      {source.variantLabel && (
        <p className="opacity-80">Variant: {source.variantLabel}</p>
      )}
      <p className="opacity-80">{copy.description}</p>
      {updated && (
        <p className="opacity-60">Last updated {updated}</p>
      )}
      {source.url && (
        <p className="opacity-70">Click to open the listing in a new tab.</p>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${priceText} on ${copy.provider} (opens in new tab)`}
              onClick={(e) => e.stopPropagation()}
            >
              {inner}
            </a>
          ) : (
            <span aria-label={`${priceText} from ${copy.provider}`}>{inner}</span>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          {tooltipBody}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
