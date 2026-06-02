import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, ImageOff, ExternalLink, Package, ArrowUpDown, Printer } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PrintLabelsDialog } from "@/components/inventory/PrintLabelsDialog";

interface InventoryItem {
  id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  image_url: string | null;
  game: string;
  condition: string;
  quantity: number;
  purchase_price: number | null;
  shipping_cost: number;
  fees: number;
  target_sell_price: number | null;
  source: string | null;
  bought_at: string | null;
  tcgplayer_url: string | null;
  tcgplayer_market_price: number | null;
}

type SortKey = "bought_at" | "card_name" | "invested" | "projected" | "profit" | "margin";

const fmt = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const calc = (i: InventoryItem) => {
  const invested = (i.purchase_price ?? 0) * i.quantity + (i.shipping_cost ?? 0) + (i.fees ?? 0);
  const projected = (i.target_sell_price ?? 0) * i.quantity;
  const profit = projected - invested;
  const margin = projected > 0 ? (profit / projected) * 100 : 0;
  return { invested, projected, profit, margin };
};

const Inventory = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("bought_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("deal_list_items")
        .select(
          "id, card_name, set_name, card_number, rarity, image_url, game, condition, quantity, purchase_price, shipping_cost, fees, target_sell_price, source, bought_at, tcgplayer_url, tcgplayer_market_price"
        )
        .eq("user_id", user.id)
        .eq("status", "bought")
        .order("bought_at", { ascending: false });
      if (error) {
        toast({ title: "Failed to load inventory", description: error.message, variant: "destructive" });
      } else {
        setItems((data ?? []) as InventoryItem[]);
      }
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? items.filter(
          (i) =>
            i.card_name.toLowerCase().includes(q) ||
            (i.set_name ?? "").toLowerCase().includes(q) ||
            (i.source ?? "").toLowerCase().includes(q),
        )
      : items;
    const sorted = [...base].sort((a, b) => {
      const ca = calc(a);
      const cb = calc(b);
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sortKey) {
        case "card_name":
          av = a.card_name.toLowerCase();
          bv = b.card_name.toLowerCase();
          break;
        case "bought_at":
          av = a.bought_at ?? "";
          bv = b.bought_at ?? "";
          break;
        case "invested":
          av = ca.invested; bv = cb.invested; break;
        case "projected":
          av = ca.projected; bv = cb.projected; break;
        case "profit":
          av = ca.profit; bv = cb.profit; break;
        case "margin":
          av = ca.margin; bv = cb.margin; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [items, search, sortKey, sortDir]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, i) => {
        const c = calc(i);
        acc.units += i.quantity;
        acc.invested += c.invested;
        acc.projected += c.projected;
        acc.profit += c.profit;
        return acc;
      },
      { units: 0, invested: 0, projected: 0, profit: 0 },
    );
  }, [filtered]);

  const totalMargin = totals.projected > 0 ? (totals.profit / totals.projected) * 100 : 0;

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "card_name" ? "asc" : "desc");
    }
  };

  const SortBtn = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? "opacity-100" : "opacity-40"}`} />
    </button>
  );

  return (
    <>
      <Helmet>
        <title>Inventory · Cost Basis & P&L | Collector Companion</title>
        <meta
          name="description"
          content="Review every bought card with cost basis, projected sell price, profit and margin per item."
        />
      </Helmet>

      <Header />
      <main className="container mx-auto px-3 md:px-4 py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" /> Inventory
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bought deals with cost basis, projected sell price, and per-item P&amp;L.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Search card, set, source…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-72"
            />
            <Button
              variant="default"
              onClick={() => setPrintOpen(true)}
              disabled={filtered.length === 0}
              title={selected.size > 0 ? `Print ${selected.size} selected` : "Print all visible"}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print labels{selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/deal-list">Deal Pipeline</Link>
            </Button>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Items</p>
            <p className="text-lg font-semibold">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">{totals.units} units</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Total invested</p>
            <p className="text-lg font-semibold">{fmt(totals.invested)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Projected revenue</p>
            <p className="text-lg font-semibold">{fmt(totals.projected)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Projected profit</p>
            <p className={`text-lg font-semibold ${totals.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {fmt(totals.profit)}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Avg margin</p>
            <p className={`text-lg font-semibold ${totalMargin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {totalMargin.toFixed(1)}%
            </p>
          </Card>
        </div>

        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading inventory…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No bought items yet</p>
              <p className="text-sm">
                Mark deals as <span className="font-medium">Bought</span> from the{" "}
                <Link to="/deal-list" className="underline">deal pipeline</Link> to populate inventory.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[36px]">
                      <Checkbox
                        checked={filtered.length > 0 && filtered.every((i) => selected.has(i.id))}
                        onCheckedChange={(v) => {
                          if (v) setSelected(new Set(filtered.map((i) => i.id)));
                          else setSelected(new Set());
                        }}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[280px]"><SortBtn k="card_name">Card</SortBtn></TableHead>
                    <TableHead><SortBtn k="bought_at">Bought</SortBtn></TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead className="text-right">Ship + fees</TableHead>
                    <TableHead className="text-right"><SortBtn k="invested">Invested</SortBtn></TableHead>
                    <TableHead className="text-right">Target / unit</TableHead>
                    <TableHead className="text-right"><SortBtn k="projected">Projected</SortBtn></TableHead>
                    <TableHead className="text-right"><SortBtn k="profit">Profit</SortBtn></TableHead>
                    <TableHead className="text-right"><SortBtn k="margin">Margin</SortBtn></TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i) => {
                    const { invested, projected, profit, margin } = calc(i);
                    const positive = profit >= 0;
                    return (
                      <TableRow key={i.id}>
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-9 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                              {i.image_url ? (
                                <img
                                  src={i.image_url}
                                  alt={i.card_name}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ImageOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{i.card_name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {[i.set_name, i.card_number && `#${i.card_number}`, i.rarity].filter(Boolean).join(" · ")}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5">{i.condition.replace("_", " ")}</Badge>
                                {i.source && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{i.source}</Badge>}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {i.bought_at ? new Date(i.bought_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">{i.quantity}</TableCell>
                        <TableCell className="text-right">{i.purchase_price != null ? fmt(i.purchase_price) : "—"}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmt((i.shipping_cost ?? 0) + (i.fees ?? 0))}
                        </TableCell>
                        <TableCell className="text-right font-medium">{fmt(invested)}</TableCell>
                        <TableCell className="text-right">{i.target_sell_price != null ? fmt(i.target_sell_price) : "—"}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(projected)}</TableCell>
                        <TableCell className={`text-right font-semibold ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {fmt(profit)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {projected > 0 ? `${margin.toFixed(1)}%` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {i.tcgplayer_url && (
                            <Button variant="ghost" size="icon" asChild title="View on TCGplayer">
                              <a href={i.tcgplayer_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>
    </>
  );
};

export default Inventory;
