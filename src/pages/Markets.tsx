import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  ScanLine,
  Search,
  TrendingUp,
} from "lucide-react";

interface MarketRow {
  card_id: string;
  raw_price: number | null;
  psa10_price: number | null;
  psa10_ratio: number | null;
  gem_rate: number | null;
  psa10_pop: number | null;
  psa_total_pop: number | null;
  last_refreshed_at: string | null;
  market_cards: {
    id: string;
    game: string;
    name: string;
    set_name: string | null;
    number: string | null;
    rarity: string | null;
    image_url: string | null;
    tcgplayer_url: string | null;
  };
}

type SortKey =
  | "psa10_ratio"
  | "psa10_ratio_asc"
  | "gap"
  | "gem_rate"
  | "raw_asc"
  | "raw_desc"
  | "psa10_desc"
  | "refreshed";

const usd = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
const PAGE_SIZE = 25;

const Markets = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const [rows, setRows] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  // Filters
  const [game, setGame] = useState<"all" | "pokemon" | "onepiece">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [setName, setSetName] = useState<string>("__all");
  const [rarity, setRarity] = useState<string>("__all");
  const [minRaw, setMinRaw] = useState<string>("");
  const [maxRaw, setMaxRaw] = useState<string>("");
  const [minGemRate, setMinGemRate] = useState<string>("");
  const [minPop, setMinPop] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("psa10_ratio");

  // Filter option lists
  const [sets, setSets] = useState<string[]>([]);
  const [rarities, setRarities] = useState<string[]>([]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [game, debouncedSearch, setName, rarity, minRaw, maxRaw, minGemRate, minPop, sort]);

  // Load distinct filter options once
  useEffect(() => {
    const loadOptions = async () => {
      const { data: setData } = await supabase
        .from("market_cards")
        .select("set_name")
        .not("set_name", "is", null)
        .limit(2000);
      const uniqueSets = Array.from(
        new Set((setData ?? []).map((r: any) => r.set_name).filter(Boolean)),
      ).sort();
      setSets(uniqueSets);

      const { data: rarityData } = await supabase
        .from("market_cards")
        .select("rarity")
        .not("rarity", "is", null)
        .limit(2000);
      const uniqueRarities = Array.from(
        new Set((rarityData ?? []).map((r: any) => r.rarity).filter(Boolean)),
      ).sort();
      setRarities(uniqueRarities);
    };
    loadOptions();
  }, []);

  // Run query when filters/sort/page change
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        let q = supabase
          .from("market_snapshots")
          .select(
            `card_id, raw_price, psa10_price, psa10_ratio, gem_rate, psa10_pop, psa_total_pop, last_refreshed_at,
             market_cards!inner ( id, game, name, set_name, number, rarity, image_url, tcgplayer_url )`,
            { count: "exact" },
          );

        if (game !== "all") q = q.eq("market_cards.game", game);
        if (debouncedSearch) q = q.ilike("market_cards.name", `%${debouncedSearch}%`);
        if (setName !== "__all") q = q.eq("market_cards.set_name", setName);
        if (rarity !== "__all") q = q.eq("market_cards.rarity", rarity);
        if (minRaw) q = q.gte("raw_price", Number(minRaw));
        if (maxRaw) q = q.lte("raw_price", Number(maxRaw));
        if (minGemRate) q = q.gte("gem_rate", Number(minGemRate) / 100);
        if (minPop) q = q.gte("psa_total_pop", Number(minPop));

        switch (sort) {
          case "psa10_ratio":
            q = q.order("psa10_ratio", { ascending: false, nullsFirst: false });
            break;
          case "psa10_ratio_asc":
            q = q.order("psa10_ratio", { ascending: true, nullsFirst: false });
            break;
          case "gap":
            // No stored gap column; sort by psa10_price desc as a proxy then we'll
            // also have ratio. For an honest absolute-gap sort we'd need a generated col;
            // approximate with psa10_price desc filtered to ratio > 1 below.
            q = q.order("psa10_price", { ascending: false, nullsFirst: false });
            break;
          case "gem_rate":
            q = q.order("gem_rate", { ascending: false, nullsFirst: false });
            break;
          case "raw_asc":
            q = q.order("raw_price", { ascending: true, nullsFirst: false });
            break;
          case "raw_desc":
            q = q.order("raw_price", { ascending: false, nullsFirst: false });
            break;
          case "psa10_desc":
            q = q.order("psa10_price", { ascending: false, nullsFirst: false });
            break;
          case "refreshed":
            q = q.order("last_refreshed_at", { ascending: false });
            break;
        }

        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        q = q.range(from, to);

        const { data, count: total, error } = await q;
        if (error) throw error;
        setRows((data ?? []) as unknown as MarketRow[]);
        setCount(total ?? null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load market data";
        toast({ title: "Markets unavailable", description: msg, variant: "destructive" });
        setRows([]);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [game, debouncedSearch, setName, rarity, minRaw, maxRaw, minGemRate, minPop, sort, page]);

  const triggerRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("refresh-market-data", {
        body: { game: "all", ingest_limit: 1000, enrich_limit: 50 },
      });
      if (error) throw error;
      toast({
        title: "Refresh started",
        description: `Upserted ${data?.cards_upserted ?? 0} cards, ${data?.psa_lookups ?? 0} PSA lookups.`,
      });
      // Reload current page
      setPage((p) => p);
    } catch (e) {
      toast({
        title: "Refresh failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (!authLoading && !user) {
    navigate("/auth");
  }

  const totalPages = useMemo(
    () => (count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1),
    [count],
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Markets | Collector Companion</title>
        <meta
          name="description"
          content="Browse every Pokémon and One Piece card with raw price, PSA 10 price, gem rate, and population data."
        />
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-primary" />
              Markets
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Raw vs. PSA 10 prices, ratios, and gem rates for every tracked card. Updated daily.
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
            {isAdmin && (
              <Button onClick={triggerRefresh} disabled={refreshing} variant="outline">
                {refreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh now
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Card name…"
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Game</Label>
              <Select value={game} onValueChange={(v) => setGame(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All games</SelectItem>
                  <SelectItem value="pokemon">Pokémon</SelectItem>
                  <SelectItem value="onepiece">One Piece</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Set</Label>
              <Select value={setName} onValueChange={setSetName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__all">All sets</SelectItem>
                  {sets.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Rarity</Label>
              <Select value={rarity} onValueChange={setRarity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__all">All rarities</SelectItem>
                  {rarities.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Raw $ min</Label>
              <Input type="number" inputMode="decimal" value={minRaw}
                     onChange={(e) => setMinRaw(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Raw $ max</Label>
              <Input type="number" inputMode="decimal" value={maxRaw}
                     onChange={(e) => setMaxRaw(e.target.value)} placeholder="∞" />
            </div>
            <div>
              <Label className="text-xs">Min gem rate (%)</Label>
              <Input type="number" inputMode="decimal" value={minGemRate}
                     onChange={(e) => setMinGemRate(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Min PSA pop</Label>
              <Input type="number" inputMode="numeric" value={minPop}
                     onChange={(e) => setMinPop(e.target.value)} placeholder="0" />
            </div>
            <div className="lg:col-span-4 flex items-end justify-between gap-3 flex-wrap">
              <div className="flex items-end gap-2">
                <div>
                  <Label className="text-xs">Sort by</Label>
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="psa10_ratio">Raw → PSA 10 ratio (high → low)</SelectItem>
                      <SelectItem value="psa10_ratio_asc">Raw → PSA 10 ratio (low → high)</SelectItem>
                      <SelectItem value="gap">PSA 10 price (high → low)</SelectItem>
                      <SelectItem value="gem_rate">Gem rate (high → low)</SelectItem>
                      <SelectItem value="raw_desc">Raw price (high → low)</SelectItem>
                      <SelectItem value="raw_asc">Raw price (low → high)</SelectItem>
                      <SelectItem value="psa10_desc">PSA 10 price (high → low)</SelectItem>
                      <SelectItem value="refreshed">Last refreshed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {count !== null ? `${count.toLocaleString()} card${count === 1 ? "" : "s"}` : ""}
              </p>
            </div>
          </div>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-8 border-dashed border-2 flex flex-col items-center justify-center text-center gap-3">
            <TrendingUp className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No cards match your filters</p>
              <p className="text-sm text-muted-foreground max-w-md">
                {count === 0 && !debouncedSearch && setName === "__all" && rarity === "__all"
                  ? "Market data hasn't been collected yet. An admin can run the refresh job."
                  : "Try widening your filters or clearing the search."}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const card = row.market_cards;
              const gap =
                row.psa10_price && row.raw_price ? row.psa10_price - row.raw_price : null;
              return (
                <Card key={row.card_id} className="p-3 md:p-4">
                  <div className="flex gap-3 md:gap-4 items-start">
                    {card.image_url && (
                      <img
                        src={card.image_url}
                        alt={card.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-14 md:w-16 rounded shadow-sm flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{card.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {card.set_name ?? "—"} · #{card.number ?? "?"}
                            {card.rarity ? ` · ${card.rarity}` : ""}
                          </p>
                        </div>
                        {row.psa10_ratio && (
                          <Badge className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/15">
                            {row.psa10_ratio.toFixed(1)}× ratio
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Raw</p>
                          <p className="font-medium text-sm">
                            {row.raw_price ? usd.format(row.raw_price) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">PSA 10</p>
                          <p className="font-medium text-sm">
                            {row.psa10_price ? usd.format(row.psa10_price) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Raw → PSA 10</p>
                          <p className="font-medium text-sm">
                            {row.psa10_ratio != null ? `${row.psa10_ratio.toFixed(2)}×` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Gap</p>
                          <p className="font-medium text-sm">
                            {gap != null ? usd.format(gap) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Gem rate</p>
                          <p className="font-medium text-sm">
                            {row.gem_rate != null ? `${(row.gem_rate * 100).toFixed(1)}%` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pop · PSA 10</p>
                          <p className="font-medium text-sm">
                            {row.psa_total_pop != null ? row.psa_total_pop.toLocaleString() : "—"}
                            {" · "}
                            {row.psa10_pop != null ? row.psa10_pop.toLocaleString() : "—"}
                          </p>
                        </div>
                      </div>

                      {card.tcgplayer_url && (
                        <div className="mt-2">
                          <a
                            href={card.tcgplayer_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            TCGplayer <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Pagination */}
            <div className="flex items-center justify-between pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= totalPages}
              >
                Next
              </Button>
            </div>
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
