import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ArrowUpDown,
  Download,
  Loader2,
  Package,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";

// One row in deal_list_items = one "lot" (a specific purchase batch of a SKU).
// "SKU" rolls up lots that match on identifying card key.
interface DealRow {
  id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  game: string;
  condition: string;
  quantity: number;
  purchase_price: number | null;
  shipping_cost: number;
  fees: number;
  target_sell_price: number | null;
  source: string | null;
  bought_at: string | null;
  status: string;
  listing_status: string;
  sold_price: number | null;
  sold_fees: number;
  sold_shipping: number;
  sold_channel: string | null;
  sold_buyer: string | null;
  sold_at: string | null;
}

interface Metrics {
  unitsBought: number;
  unitsSold: number;
  costBasis: number;          // cost of units actually sold
  costBasisTotal: number;     // cost of all units in lot (sold + remaining)
  revenue: number;
  sellCosts: number;          // sold_fees + sold_shipping
  profit: number;             // revenue - costBasis - sellCosts
  marginPct: number;          // profit / revenue
  sellThroughPct: number;     // unitsSold / unitsBought
  remainingUnits: number;
  unrealizedValue: number;    // remaining * target_sell_price
}

type GroupBy = "lot" | "sku";
type SortKey =
  | "label"
  | "unitsBought"
  | "unitsSold"
  | "sellThroughPct"
  | "revenue"
  | "costBasis"
  | "profit"
  | "marginPct";

const fmt = (n: number) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
const pct = (n: number) => `${(n || 0).toFixed(0)}%`;

const skuKey = (r: DealRow) =>
  [r.game, r.card_name, r.set_name ?? "", r.card_number ?? "", r.condition]
    .map((s) => s.toLowerCase().trim())
    .join("|");

const computeMetrics = (rows: DealRow[]): Metrics => {
  let unitsBought = 0;
  let unitsSold = 0;
  let costBasis = 0;
  let costBasisTotal = 0;
  let revenue = 0;
  let sellCosts = 0;
  let unrealizedValue = 0;

  for (const r of rows) {
    const qty = r.quantity || 0;
    const pp = r.purchase_price ?? 0;
    const unitCost = pp + (qty > 0 ? (r.shipping_cost + r.fees) / qty : 0);
    const lotTotalCost = pp * qty + (r.shipping_cost || 0) + (r.fees || 0);
    costBasisTotal += lotTotalCost;
    unitsBought += qty;

    // A row in 'sold' or 'completed' status with sold_price set = whole-lot sale.
    const isSold =
      (r.status === "sold" || r.status === "completed") && r.sold_price != null;

    if (isSold) {
      unitsSold += qty;
      costBasis += lotTotalCost;
      revenue += r.sold_price ?? 0;
      sellCosts += (r.sold_fees || 0) + (r.sold_shipping || 0);
    } else {
      unrealizedValue += (r.target_sell_price ?? 0) * qty;
    }
    // unitCost is used implicitly via lotTotalCost; kept for clarity if we
    // later support partial-quantity sales.
    void unitCost;
  }

  const profit = revenue - costBasis - sellCosts;
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
  const sellThroughPct = unitsBought > 0 ? (unitsSold / unitsBought) * 100 : 0;
  const remainingUnits = unitsBought - unitsSold;

  return {
    unitsBought,
    unitsSold,
    costBasis,
    costBasisTotal,
    revenue,
    sellCosts,
    profit,
    marginPct,
    sellThroughPct,
    remainingUnits,
    unrealizedValue,
  };
};

interface AggregatedRow {
  key: string;
  label: string;
  sublabel?: string;
  rows: DealRow[];
  metrics: Metrics;
}

const InventoryPnL = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DealRow[]>([]);
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("sku");
  const [dateRange, setDateRange] = useState<"all" | "30" | "90" | "365" | "ytd">("all");
  const [sortKey, setSortKey] = useState<SortKey>("profit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("deal_list_items")
        .select(
          "id, card_name, set_name, card_number, rarity, game, condition, quantity, purchase_price, shipping_cost, fees, target_sell_price, source, bought_at, status, listing_status, sold_price, sold_fees, sold_shipping, sold_channel, sold_buyer, sold_at",
        )
        .eq("user_id", user.id)
        .in("status", ["bought", "in_stock", "sold", "completed"]);
      if (error) {
        toast({
          title: "Failed to load P&L data",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setRows((data ?? []) as DealRow[]);
      }
      setLoading(false);
    })();
  }, [user]);

  // Date filter applies to bought_at for cost basis context; for sold rows
  // we also keep them if the sale falls inside the window.
  const dateCutoff = useMemo(() => {
    if (dateRange === "all") return null;
    const now = new Date();
    if (dateRange === "ytd") {
      return new Date(now.getFullYear(), 0, 1);
    }
    const days = Number(dateRange);
    return new Date(now.getTime() - days * 86400000);
  }, [dateRange]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = [r.card_name, r.set_name, r.source, r.sold_channel]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (dateCutoff) {
        const bought = r.bought_at ? new Date(r.bought_at) : null;
        const sold = r.sold_at ? new Date(r.sold_at) : null;
        const inWindow =
          (bought && bought >= dateCutoff) || (sold && sold >= dateCutoff);
        if (!inWindow) return false;
      }
      return true;
    });
  }, [rows, search, dateCutoff]);

  const totals = useMemo(() => computeMetrics(filteredRows), [filteredRows]);

  const grouped = useMemo<AggregatedRow[]>(() => {
    const map = new Map<string, AggregatedRow>();
    for (const r of filteredRows) {
      let key: string;
      let label: string;
      let sublabel: string | undefined;
      if (groupBy === "sku") {
        key = skuKey(r);
        label = r.card_name;
        sublabel = [r.set_name, r.card_number ? `#${r.card_number}` : null, r.condition]
          .filter(Boolean)
          .join(" · ");
      } else {
        // lot = each row is its own lot, identified by id
        key = r.id;
        label = r.card_name;
        sublabel = [
          r.set_name,
          r.bought_at ? new Date(r.bought_at).toLocaleDateString() : null,
          r.source ?? null,
        ]
          .filter(Boolean)
          .join(" · ");
      }
      if (!map.has(key)) {
        map.set(key, { key, label, sublabel, rows: [], metrics: {} as Metrics });
      }
      map.get(key)!.rows.push(r);
    }
    const arr = Array.from(map.values()).map((g) => ({
      ...g,
      metrics: computeMetrics(g.rows),
    }));
    arr.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortKey === "label") {
        av = a.label.toLowerCase();
        bv = b.label.toLowerCase();
      } else {
        av = a.metrics[sortKey as keyof Metrics] as number;
        bv = b.metrics[sortKey as keyof Metrics] as number;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredRows, groupBy, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "label" ? "asc" : "desc");
    }
  };

  const SortBtn = ({ k, children, align }: { k: SortKey; children: React.ReactNode; align?: "right" }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={`inline-flex items-center gap-1 hover:text-foreground ${align === "right" ? "ml-auto" : ""}`}
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? "opacity-100" : "opacity-40"}`} />
    </button>
  );

  const exportCsv = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = [
      groupBy === "sku" ? "SKU" : "Lot",
      "Details",
      "Units bought",
      "Units sold",
      "Sell-through %",
      "Cost basis (sold)",
      "Cost basis (total)",
      "Revenue",
      "Sell costs",
      "Realized profit",
      "Margin %",
      "Remaining units",
      "Unrealized value",
    ];
    const lines = [header.map(esc).join(",")];
    for (const g of grouped) {
      const m = g.metrics;
      lines.push(
        [
          g.label,
          g.sublabel ?? "",
          m.unitsBought,
          m.unitsSold,
          m.sellThroughPct.toFixed(1),
          m.costBasis.toFixed(2),
          m.costBasisTotal.toFixed(2),
          m.revenue.toFixed(2),
          m.sellCosts.toFixed(2),
          m.profit.toFixed(2),
          m.marginPct.toFixed(1),
          m.remainingUnits,
          m.unrealizedValue.toFixed(2),
        ]
          .map(esc)
          .join(","),
      );
    }
    lines.push("");
    lines.push(["TOTALS", "", totals.unitsBought, totals.unitsSold, totals.sellThroughPct.toFixed(1), totals.costBasis.toFixed(2), totals.costBasisTotal.toFixed(2), totals.revenue.toFixed(2), totals.sellCosts.toFixed(2), totals.profit.toFixed(2), totals.marginPct.toFixed(1), totals.remainingUnits, totals.unrealizedValue.toFixed(2)].map(esc).join(","));

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-pnl-${groupBy}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${grouped.length} ${groupBy === "sku" ? "SKUs" : "lots"} + totals.` });
  };

  return (
    <>
      <Helmet>
        <title>Inventory P&amp;L Report | Collector Companion</title>
        <meta
          name="description"
          content="Track cost basis, sell-through, revenue and realized profit per SKU and per lot."
        />
      </Helmet>

      <Header />
      <main className="container mx-auto px-3 md:px-4 py-6 max-w-7xl">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/vending">Vending</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/inventory">Inventory</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>P&amp;L Report</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" /> P&amp;L report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cost basis, sell-through, revenue and realized profit, grouped by{" "}
              {groupBy === "sku" ? "SKU" : "lot"}.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Search card, set, source, channel…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-72"
            />
            <Select value={dateRange} onValueChange={(v: typeof dateRange) => setDateRange(v)}>
              <SelectTrigger className="w-[150px]" aria-label="Date range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last 365 days</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={grouped.length === 0}
              title="Download report as CSV"
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)} className="mb-4">
          <TabsList>
            <TabsTrigger value="sku">By SKU</TabsTrigger>
            <TabsTrigger value="lot">By lot</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* KPI roll-up */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Units bought</p>
            <p className="text-lg font-semibold">{totals.unitsBought}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Units sold</p>
            <p className="text-lg font-semibold">{totals.unitsSold}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Sell-through</p>
            <p className="text-lg font-semibold">{pct(totals.sellThroughPct)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="text-lg font-semibold">{fmt(totals.revenue)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Cost basis (sold)</p>
            <p className="text-lg font-semibold">{fmt(totals.costBasis + totals.sellCosts)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Realized profit</p>
            <p
              className={`text-lg font-semibold ${
                totals.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              }`}
            >
              {fmt(totals.profit)}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({pct(totals.marginPct)})
              </span>
            </p>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading P&amp;L…
          </div>
        ) : grouped.length === 0 ? (
          <Card className="p-10 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No data in this view</p>
            <p className="text-sm text-muted-foreground mt-1">
              Buy and sell deals from the{" "}
              <Link to="/deal-list" className="underline">
                deal list
              </Link>{" "}
              to populate this report.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortBtn k="label">{groupBy === "sku" ? "SKU" : "Lot"}</SortBtn>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortBtn k="unitsBought">Bought</SortBtn>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortBtn k="unitsSold">Sold</SortBtn>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortBtn k="sellThroughPct">Sell-through</SortBtn>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortBtn k="costBasis">Cost basis</SortBtn>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortBtn k="revenue">Revenue</SortBtn>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortBtn k="profit">Profit</SortBtn>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortBtn k="marginPct">Margin</SortBtn>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map((g) => {
                    const m = g.metrics;
                    const positive = m.profit >= 0;
                    const totalSoldCost = m.costBasis + m.sellCosts;
                    return (
                      <TableRow key={g.key}>
                        <TableCell>
                          <div className="font-medium">{g.label}</div>
                          {g.sublabel && (
                            <div className="text-xs text-muted-foreground">{g.sublabel}</div>
                          )}
                          {m.remainingUnits > 0 && (
                            <Badge variant="secondary" className="mt-1 text-[10px]">
                              {m.remainingUnits} on hand · {fmt(m.unrealizedValue)} unrealized
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{m.unitsBought}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.unitsSold}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {pct(m.sellThroughPct)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmt(totalSoldCost)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(m.revenue)}</TableCell>
                        <TableCell
                          className={`text-right tabular-nums font-semibold ${
                            positive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : m.profit < 0
                                ? "text-destructive"
                                : ""
                          }`}
                        >
                          {fmt(m.profit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m.revenue > 0 ? pct(m.marginPct) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>
    </>
  );
};

export default InventoryPnL;
