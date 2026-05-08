import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { pokemonTcgApi, type PokemonCard } from "@/services/pokemonTcgApi";
import { getPokemonPriceSource } from "@/services/cardPriceSource";
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  ScanLine,
  TrendingUp,
} from "lucide-react";

interface GapRow {
  card: PokemonCard;
  nmPrice: number;
  psa10Median: number;
  gap: number;
  multiple: number;
  sampleCount: number;
  ebayUrl: string;
}

interface EbaySoldCompsResponse {
  median?: number | null;
  count?: number;
  searchUrl?: string;
  blocked?: boolean;
  blockedReason?: string | null;
  sourceStatus?: number | null;
}

const usd = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

const CANDIDATE_POOL = 60;
const TOP_N = 10;
// Floor to filter out true bulk commons that never have PSA 10 comps
const RAW_MIN = 1;

const Markets = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<GapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [blockedCount, setBlockedCount] = useState(0);

  const loadGaps = async () => {
    setLoading(true);
    setRows([]);
    setProgress({ done: 0, total: CANDIDATE_POOL });
    setBlockedCount(0);

    try {
      let blocked = 0;
      // Fetch a broad pool of Pokémon cards with market pricing — no rarity
      // ceiling so expensive chase cards (e.g. $200 raw → $600 PSA 10) are
      // included alongside cheap grading flips.
      const resp = await pokemonTcgApi.searchCards({
        q: `tcgplayer.prices.holofoil.market:[${RAW_MIN} TO *]`,
        orderBy: "-tcgplayer.prices.holofoil.market",
        pageSize: CANDIDATE_POOL,
      });
      const candidates = resp.data ?? [];

      // For each candidate, scrape eBay PSA 10 sold comps and compute the gap.
      // Run with limited concurrency so we don't slam the edge function.
      const results: GapRow[] = [];
      const concurrency = 4;
      let cursor = 0;
      let done = 0;

      const worker = async () => {
        while (cursor < candidates.length) {
          const idx = cursor++;
          const card = candidates[idx];
          try {
            const ps = getPokemonPriceSource(card);
            const nmPrice = ps?.price ?? null;
            if (!nmPrice) {
              done++;
              setProgress({ done, total: candidates.length });
              continue;
            }

            // eBay query: "PSA 10 <name> <number>" — same shape used by the scanner
            const numberClean = card.number?.replace(/^0+/, "") ?? "";
            const query = `PSA 10 ${card.name} ${numberClean}`.trim();
            const { data, error } = await supabase.functions.invoke(
              "ebay-sold-comps",
              { body: { query } },
            );
            if (error) throw error;
            const ebayData = (data ?? {}) as EbaySoldCompsResponse;
            if (ebayData.blocked) {
              blocked += 1;
              setBlockedCount(blocked);
              done++;
              setProgress({ done, total: candidates.length });
              continue;
            }

            const median = ebayData.median ?? null;
            const count = ebayData.count ?? 0;
            const multiple = median ? median / nmPrice : 0;
            const gap = median ? median - nmPrice : 0;
            // Keep any card with a meaningful PSA 10 premium and enough samples.
            if (median && count >= 3 && multiple > 1) {
              results.push({
                card,
                nmPrice,
                psa10Median: median,
                gap,
                multiple,
                sampleCount: count,
                ebayUrl: ebayData.searchUrl ?? `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`,
              });
            }
          } catch (e) {
            console.error("gap fetch failed for", card.id, e);
          } finally {
            done++;
            setProgress({ done, total: candidates.length });
          }
        }
      };

      await Promise.all(
        Array.from({ length: concurrency }, () => worker()),
      );

      // Rank by multiple (best flip ratio) rather than absolute gap.
      results.sort((a, b) => b.multiple - a.multiple);
      setRows(results.slice(0, TOP_N));

      if (results.length === 0 && blocked > 0) {
        toast({
          title: "eBay blocked the sold-comp scan",
          description: "The server was rate-limited by eBay, so live PSA 10 comps could not be loaded right now.",
          variant: "destructive",
        });
      } else if (results.length === 0) {
        toast({
          title: "No PSA 10 comps found",
          description: "eBay returned no graded sold comps for the top candidates.",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load market data";
      toast({ title: "Markets unavailable", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && !user) {
    navigate("/auth");
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Markets | Collector Companion</title>
        <meta
          name="description"
          content="Discover Pokémon cards with the largest PSA 10 premium across the entire market."
        />
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-primary" />
              Markets
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              The biggest PSA 10 premiums across all priced Pokémon cards —
              ranked by multiple (PSA 10 ÷ Near Mint).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value="markets">
              <TabsList>
                <TabsTrigger value="pricing" asChild>
                  <Link to="/scanner">
                    <ScanLine className="h-4 w-4 mr-1.5" /> Pricing
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="markets">
                  <TrendingUp className="h-4 w-4 mr-1.5" /> Markets
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={loadGaps} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {rows.length > 0 ? "Refresh" : "Load gaps"}
            </Button>
          </div>
        </div>

        {loading && (
          <Card className="p-4 mb-4 flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Scoring candidates… {progress.done} / {progress.total}
              </p>
              <p className="text-xs text-muted-foreground">
                Fetching live PSA 10 sold comps from eBay. This can take a minute.
              </p>
            </div>
          </Card>
        )}

        {!loading && blockedCount > 0 && rows.length === 0 && (
          <Card className="p-4 mb-4 border-destructive/40 bg-destructive/5">
            <p className="text-sm font-medium">Live eBay comps are temporarily blocked</p>
            <p className="text-xs text-muted-foreground mt-1">
              eBay is rejecting the server-side sold-comp requests right now, so the market scan can’t calculate PSA 10 gaps until that clears.
            </p>
          </Card>
        )}

        {!loading && rows.length === 0 && (
          <Card className="p-8 border-dashed border-2 flex flex-col items-center justify-center text-center gap-3">
            <TrendingUp className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No gaps loaded yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Click "Load gaps" to scan priced Pokémon cards across the
                whole market and compare each one to its live PSA 10 sold-comp
                median.
              </p>
            </div>
          </Card>
        )}

        {loading && rows.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((row, i) => (
              <Card key={row.card.id} className="p-3 md:p-4">
                <div className="flex gap-3 md:gap-4 items-start">
                  <div className="flex flex-col items-center gap-1 w-10 md:w-12 flex-shrink-0">
                    <Badge variant="secondary" className="text-base font-bold">
                      #{i + 1}
                    </Badge>
                  </div>
                  <img
                    src={row.card.images.small}
                    alt={row.card.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-16 md:w-20 rounded shadow-sm flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">
                          {row.card.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.card.set.name} · #{row.card.number}
                          {row.card.rarity ? ` · ${row.card.rarity}` : ""}
                        </p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/15">
                        +{usd.format(row.gap)} gap
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">NM market</p>
                        <p className="font-medium text-sm">
                          {usd.format(row.nmPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">PSA 10 median</p>
                        <p className="font-medium text-sm">
                          {usd.format(row.psa10Median)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Multiple</p>
                        <p className="font-medium text-sm">
                          {row.multiple.toFixed(1)}×
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{row.sampleCount} sold comps</span>
                      <a
                        href={row.ebayUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        View eBay <ExternalLink className="h-3 w-3" />
                      </a>
                      {row.card.tcgplayer?.url && (
                        <a
                          href={row.card.tcgplayer.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          TCGplayer <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <p className="text-xs text-muted-foreground text-center pt-2">
              Gaps are computed from live eBay sold comps and TCGplayer market
              prices. They do not include grading fees, shipping, or the risk
              of a sub-10 grade — treat them as a starting point, not a
              guaranteed margin.
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate("/scanner")}>
            Back to Pricing <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Markets;
