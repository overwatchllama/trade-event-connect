import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";

export interface MarketsChartFilters {
  game: "all" | "pokemon" | "onepiece";
  search: string;
  setName: string;
  rarity: string;
  minRaw: string;
  maxRaw: string;
  minGemRate: string;
  minPop: string;
  minRatio: string;
  maxRatio: string;
}

interface SampleRow {
  raw_price: number | null;
  psa10_price: number | null;
  psa10_ratio: number | null;
  gem_rate: number | null;
  market_cards: { name: string; set_name: string | null } | null;
}

type InsightSort =
  | "psa10_ratio"
  | "gem_rate"
  | "psa10_price"
  | "raw_price"
  | "gap";

const SAMPLE_OPTIONS = [50, 100, 250, 500, 1000] as const;
const TOP_N_OPTIONS = [15, 25, 50, 100] as const;
const STORAGE_KEY = "markets:insights:v1";

const SORT_LABELS: Record<InsightSort, string> = {
  psa10_ratio: "Raw → PSA 10 ratio",
  gem_rate: "Gem rate",
  psa10_price: "PSA 10 price",
  raw_price: "Raw price",
  gap: "PSA 10 − Raw gap",
};

const persisted = (() => {
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
})();

export const MarketsCharts = ({ filters }: { filters: MarketsChartFilters }) => {
  const [rows, setRows] = useState<SampleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sampleLimit, setSampleLimit] = useState<number>(
    persisted.sampleLimit ?? 500,
  );
  const [topN, setTopN] = useState<number>(persisted.topN ?? 15);
  const [sortBy, setSortBy] = useState<InsightSort>(
    persisted.sortBy ?? "psa10_ratio",
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sampleLimit, topN, sortBy }),
      );
    } catch {
      /* ignore */
    }
  }, [sampleLimit, topN, sortBy]);


  useEffect(() => {
    let cancelled = false;
    const cacheKey = JSON.stringify({ filters, sampleLimit, sortBy });
    const run = async () => {
      // 1. In-memory cache (instant on revisit during session)
      const memHit = chartsCache.get(cacheKey);
      if (memHit && Date.now() - memHit.ts < CACHE_TTL_MS) {
        setRows(memHit.rows);
        setLoading(false);
        return;
      }
      // 2. sessionStorage cache (survives navigation)
      const sessionHit = readSessionCache(cacheKey);
      if (sessionHit) {
        setRows(sessionHit);
        setLoading(false);
        chartsCache.set(cacheKey, { rows: sessionHit, ts: Date.now() });
        return;
      }

      setLoading(true);
      try {
        let q = supabase
          .from("market_snapshots")
          .select(
            `raw_price, psa10_price, psa10_ratio, gem_rate,
             market_cards!inner ( name, set_name, game, rarity )`,
          )
          .not("psa10_ratio", "is", null)
          .not("raw_price", "is", null);

        if (filters.game !== "all") q = q.eq("market_cards.game", filters.game);
        if (filters.search) q = q.ilike("market_cards.name", `%${filters.search}%`);
        if (filters.setName !== "__all") q = q.eq("market_cards.set_name", filters.setName);
        if (filters.rarity !== "__all") q = q.eq("market_cards.rarity", filters.rarity);
        if (filters.minRaw) q = q.gte("raw_price", Number(filters.minRaw));
        if (filters.maxRaw) q = q.lte("raw_price", Number(filters.maxRaw));
        if (filters.minGemRate) q = q.gte("gem_rate", Number(filters.minGemRate) / 100);
        if (filters.minPop) q = q.gte("psa_total_pop", Number(filters.minPop));
        if (filters.minRatio) q = q.gte("psa10_ratio", Number(filters.minRatio));
        if (filters.maxRatio) q = q.lte("psa10_ratio", Number(filters.maxRatio));

        q = q.order(sortBy === "gap" ? "psa10_price" : sortBy, {
          ascending: false,
          nullsFirst: false,
        }).limit(sampleLimit);

        const { data, error } = await q;
        if (error) throw error;
        const result = (data ?? []) as unknown as SampleRow[];
        if (!cancelled) {
          setRows(result);
          chartsCache.set(cacheKey, { rows: result, ts: Date.now() });
          writeSessionCache(cacheKey, result);
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [
    filters.game,
    filters.search,
    filters.setName,
    filters.rarity,
    filters.minRaw,
    filters.maxRaw,
    filters.minGemRate,
    filters.minPop,
    filters.minRatio,
    filters.maxRatio,
    sampleLimit,
    sortBy,
  ]);

  const topRanked = useMemo(() => {
    const metricOf = (r: SampleRow): number | null => {
      if (sortBy === "gap")
        return r.psa10_price != null && r.raw_price != null
          ? r.psa10_price - r.raw_price
          : null;
      return (r as any)[sortBy] ?? null;
    };
    const formatVal = (v: number) => {
      if (sortBy === "psa10_ratio") return `${v.toFixed(2)}×`;
      if (sortBy === "gem_rate") return `${(v * 100).toFixed(1)}%`;
      return `$${v.toFixed(2)}`;
    };
    return {
      formatVal,
      data: [...rows]
        .filter((r) => metricOf(r) != null && r.market_cards?.name)
        .sort((a, b) => (metricOf(b) ?? 0) - (metricOf(a) ?? 0))
        .slice(0, topN)
        .map((r) => ({
          name:
            (r.market_cards?.name ?? "").length > 22
              ? `${r.market_cards?.name.slice(0, 22)}…`
              : r.market_cards?.name ?? "",
          value: Number((metricOf(r) ?? 0).toFixed(4)),
        })),
    };
  }, [rows, sortBy, topN]);

  const histogram = useMemo(() => {
    // Buckets: <1×, 1-2×, 2-3×, 3-5×, 5-10×, 10-20×, 20×+
    const buckets = [
      { label: "<1×", min: 0, max: 1, count: 0 },
      { label: "1–2×", min: 1, max: 2, count: 0 },
      { label: "2–3×", min: 2, max: 3, count: 0 },
      { label: "3–5×", min: 3, max: 5, count: 0 },
      { label: "5–10×", min: 5, max: 10, count: 0 },
      { label: "10–20×", min: 10, max: 20, count: 0 },
      { label: "20×+", min: 20, max: Infinity, count: 0 },
    ];
    for (const r of rows) {
      const v = r.psa10_ratio;
      if (v == null) continue;
      const b = buckets.find((x) => v >= x.min && v < x.max);
      if (b) b.count++;
    }
    return buckets;
  }, [rows]);

  const scatter = useMemo(() => {
    return rows
      .filter((r) => r.raw_price != null && r.psa10_price != null)
      .slice(0, 300)
      .map((r) => ({
        raw: r.raw_price,
        psa10: r.psa10_price,
        name: r.market_cards?.name ?? "",
      }));
  }, [rows]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
          <BarChart3 className="h-4 w-4" />
          Insights from {rows.length.toLocaleString()} matching cards
        </div>
        <div>
          <Label className="text-xs">Sample size</Label>
          <Select
            value={String(sampleLimit)}
            onValueChange={(v) => setSampleLimit(Number(v))}
          >
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SAMPLE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n.toLocaleString()} cards</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Rank by</Label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as InsightSort)}>
            <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as InsightSort[]).map((k) => (
                <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Top N</Label>
          <Select value={String(topN)} onValueChange={(v) => setTopN(Number(v))}>
            <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TOP_N_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top by selected metric */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">
            Top {topN} by {SORT_LABELS[sortBy]}
          </h3>
          <div style={{ height: Math.max(288, topRanked.data.length * 22 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topRanked.data}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) => topRanked.formatVal(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [topRanked.formatVal(v), SORT_LABELS[sortBy]]}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Histogram */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Ratio distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogram} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [v.toLocaleString(), "Cards"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {histogram.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        i < 1
                          ? "hsl(var(--muted-foreground))"
                          : i < 3
                          ? "hsl(var(--primary) / 0.55)"
                          : "hsl(var(--primary))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Scatter */}
        <Card className="p-4 lg:col-span-2">
          <h3 className="font-semibold text-sm mb-3">Raw price vs PSA 10 price</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="raw"
                  name="Raw"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) => `$${v}`}
                  scale="log"
                  domain={[0.5, "auto"]}
                />
                <YAxis
                  type="number"
                  dataKey="psa10"
                  name="PSA 10"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) => `$${v}`}
                  scale="log"
                  domain={[1, "auto"]}
                />
                <ZAxis range={[40, 40]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, key: string) => [`$${Number(v).toFixed(2)}`, key]}
                  labelFormatter={(_, items) => (items?.[0]?.payload?.name ?? "")}
                />
                <Scatter data={scatter} fill="hsl(var(--primary))" fillOpacity={0.65} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Log-scaled. Points further above the diagonal indicate larger PSA 10 premiums.
          </p>
        </Card>
      </div>
    </div>
  );
};
