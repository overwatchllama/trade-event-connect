import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, ExternalLink, Loader2, Library, ScanLine, ImageOff, RotateCcw, ShoppingCart, CheckCircle2, XCircle, Eye, MessageSquare } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkAsBoughtDialog, type MarkAsBoughtTarget } from "@/components/deals/MarkAsBoughtDialog";

type DealStatus = "watching" | "negotiating" | "bought" | "passed";

interface DealItem {
  id: string;
  game: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  image_url: string | null;
  tcgplayer_market_price: number | null;
  tcgplayer_url: string | null;
  ebay_search_url: string | null;
  quantity: number;
  condition: string;
  notes: string | null;
  created_at: string;
  /** Manual per-card price entered by the user. When non-null, wins over the condition-adjusted market price. */
  price_override: number | null;
  /** Per-card trade % (0-200). When non-null, this card uses its own buy-at % instead of the global one. */
  trade_pct_override: number | null;
  status: DealStatus;
  purchase_price: number | null;
  shipping_cost: number;
  fees: number;
  source: string | null;
  target_sell_price: number | null;
  bought_at: string | null;
  passed_at: string | null;
  collection_item_id: string | null;
}

const STATUS_META: Record<DealStatus, { label: string; icon: typeof Eye; tone: string }> = {
  watching: { label: "Watching", icon: Eye, tone: "bg-muted text-muted-foreground" },
  negotiating: { label: "Negotiating", icon: MessageSquare, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  bought: { label: "Bought", icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  passed: { label: "Passed", icon: XCircle, tone: "bg-muted/40 text-muted-foreground line-through" },
};


// TCGplayer-style conditions. The DB enum value is on the left, the user-facing label and
// price multiplier (vs. Near Mint market) are derived from typical TCGplayer condition discounts.
const CONDITION_OPTIONS: Array<{ value: string; label: string; multiplier: number }> = [
  { value: "near_mint", label: "Near Mint", multiplier: 1.0 },
  { value: "light_play", label: "Lightly Played", multiplier: 0.85 },
  { value: "moderate_play", label: "Moderately Played", multiplier: 0.65 },
  { value: "heavy_play", label: "Heavily Played", multiplier: 0.45 },
  { value: "damaged", label: "Damaged", multiplier: 0.3 },
];

const CONDITION_MULTIPLIERS: Record<string, number> = Object.fromEntries(
  CONDITION_OPTIONS.map((c) => [c.value, c.multiplier]),
);

const CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  CONDITION_OPTIONS.map((c) => [c.value, c.label]),
);

/** Treat the stored TCGplayer market price as the Near Mint baseline and scale by condition. */
const adjustedPrice = (nmPrice: number | null, condition: string): number | null => {
  if (nmPrice == null) return null;
  const mult = CONDITION_MULTIPLIERS[condition] ?? 1;
  return Math.round(nmPrice * mult * 100) / 100;
};

/** The per-card price actually used for totals: manual override (if set) > condition-adjusted market. */
const effectivePrice = (item: DealItem): number | null =>
  item.price_override ?? adjustedPrice(item.tcgplayer_market_price, item.condition);

const DealList = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<{ id: string; name: string; category: string }[]>([]);
  const [targetCollection, setTargetCollection] = useState<string>("");
  const [savingAll, setSavingAll] = useState(false);
  /** Buy-side cost target as a % of total market value (e.g. 60 = pay 60% of comps). Persists locally. */
  const [costPct, setCostPct] = useState<number>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("dealList:costPct") : null;
    const parsed = stored ? parseFloat(stored) : NaN;
    return Number.isFinite(parsed) ? parsed : 60;
  });
  /** Track which row's price is being inline-edited and its draft string value. */
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<string>("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resettingOverrides, setResettingOverrides] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DealStatus | "active" | "all">(() => {
    if (typeof window === "undefined") return "active";
    return (window.localStorage.getItem("dealList:statusFilter") as DealStatus | "active" | "all") || "active";
  });
  const [buyTarget, setBuyTarget] = useState<MarkAsBoughtTarget | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("dealList:statusFilter", statusFilter);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("dealList:costPct", String(costPct));
    }
  }, [costPct]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [itemsRes, colsRes] = await Promise.all([
        supabase.from("deal_list_items").select("*").order("created_at", { ascending: false }),
        supabase.from("collections").select("id, name, category").order("created_at", { ascending: false }),
      ]);
      if (itemsRes.error) toast({ title: "Failed to load", description: itemsRes.error.message, variant: "destructive" });
      else {
        // Map legacy non-TCGplayer condition values to the closest TCGplayer-style equivalent
        // so the Select always reflects a valid option.
        const legacyMap: Record<string, string> = {
          mint: "near_mint",
          excellent: "light_play",
          good: "moderate_play",
        };
        const normalized = (itemsRes.data as DealItem[]).map((it) => ({
          ...it,
          condition: legacyMap[it.condition] ?? it.condition,
        }));
        setItems(normalized);
      }
      if (colsRes.data) setCollections(colsRes.data as typeof collections);
      setLoading(false);
    })();
  }, [user]);

  /** Effective trade % for a row: per-card override (if set) > global costPct. */
  const effectiveTradePct = (item: DealItem): number =>
    item.trade_pct_override ?? costPct;

  /** Per-card modified (deal) price = effective price × effective trade % / 100. */
  const modifiedPrice = (item: DealItem): number | null => {
    const eff = effectivePrice(item);
    if (eff == null) return null;
    return Math.round(eff * (effectiveTradePct(item) / 100) * 100) / 100;
  };

  // Group items by status for tab counts and the visible filter.
  const statusCounts = items.reduce(
    (acc, it) => {
      acc[it.status] = (acc[it.status] ?? 0) + 1;
      return acc;
    },
    { watching: 0, negotiating: 0, bought: 0, passed: 0 } as Record<DealStatus, number>,
  );
  const visibleItems = items.filter((it) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return it.status === "watching" || it.status === "negotiating";
    return it.status === statusFilter;
  });

  // Pipeline totals (active deals only — bought/passed shouldn't inflate "spend" math).
  const pipelineItems = items.filter((it) => it.status === "watching" || it.status === "negotiating");
  const totalValue = pipelineItems.reduce(
    (sum, i) => sum + (effectivePrice(i) ?? 0) * i.quantity,
    0,
  );
  const targetSpend = pipelineItems.reduce(
    (sum, i) => sum + (modifiedPrice(i) ?? 0) * i.quantity,
    0,
  );
  const blendedPct = totalValue > 0 ? (targetSpend / totalValue) * 100 : costPct;

  // P&L roll-up across every "Bought" deal: invested = unit×qty + ship + fees, projected = target_sell×qty.
  const boughtItems = items.filter((it) => it.status === "bought");
  const totalInvested = boughtItems.reduce(
    (s, i) => s + (i.purchase_price ?? 0) * i.quantity + (i.shipping_cost ?? 0) + (i.fees ?? 0),
    0,
  );
  const projectedRevenue = boughtItems.reduce(
    (s, i) => s + (i.target_sell_price ?? 0) * i.quantity,
    0,
  );
  const projectedProfit = projectedRevenue - totalInvested;
  const projectedMarginPct = totalInvested > 0 ? (projectedProfit / totalInvested) * 100 : 0;

  /**
   * Apply a manual price change AND surface an undo toast that restores the previous
   * `price_override` value if the user clicks it within the toast's lifetime.
   * Kept generic so both the inline editor commit and the inline "reset" button can use it.
   */
  const applyPriceOverride = (
    id: string,
    nextOverride: number | null,
    cardName: string,
  ) => {
    const previous = items.find((it) => it.id === id);
    if (!previous) return;
    if (previous.price_override === nextOverride) return; // no-op, don't spam toasts

    void updateItem(id, { price_override: nextOverride });

    const prevDisplay =
      previous.price_override != null ? `$${previous.price_override.toFixed(2)}` : "auto";
    const nextDisplay = nextOverride != null ? `$${nextOverride.toFixed(2)}` : "auto";

    sonnerToast(`Price updated · ${cardName}`, {
      description: `${prevDisplay} → ${nextDisplay}`,
      duration: 8000,
      action: {
        label: "Undo",
        onClick: () => {
          void updateItem(id, { price_override: previous.price_override });
          sonnerToast.success("Reverted to previous price");
        },
      },
    });
  };

  const commitPriceEdit = (id: string) => {
    const trimmed = priceDraft.trim();
    const card = items.find((it) => it.id === id);
    const cardName = card?.card_name ?? "card";
    if (trimmed === "") {
      // Empty input clears the override → fall back to auto price.
      applyPriceOverride(id, null, cardName);
    } else {
      const num = parseFloat(trimmed);
      if (Number.isFinite(num) && num >= 0) {
        applyPriceOverride(id, Math.round(num * 100) / 100, cardName);
      }
    }
    setEditingPriceId(null);
    setPriceDraft("");
  };

  const updateItem = async (id: string, patch: Partial<DealItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    const { error } = await supabase.from("deal_list_items").update(patch).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("deal_list_items").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  /**
   * Move a deal between lifecycle stages (watching → negotiating → bought/passed).
   * "bought" is intentionally NOT routed through here — it requires the cost-basis dialog
   * (MarkAsBoughtDialog) so we always capture purchase price + ship/fees and create the
   * matching inventory row.
   */
  const setDealStatus = async (id: string, next: Exclude<DealStatus, "bought">) => {
    const patch: Partial<DealItem> = {
      status: next,
      passed_at: next === "passed" ? new Date().toISOString() : null,
    };
    await updateItem(id, patch);
  };

  const openBuyDialog = (item: DealItem) => {
    const eff = effectivePrice(item);
    const dealUnit = modifiedPrice(item);
    setBuyTarget({
      id: item.id,
      card_name: item.card_name,
      set_name: item.set_name,
      card_number: item.card_number,
      rarity: item.rarity,
      image_url: item.image_url,
      quantity: item.quantity,
      condition: item.condition,
      game: item.game,
      notes: item.notes,
      // Default the purchase price to the per-card "deal" price you've already negotiated for.
      suggested_unit_price: dealUnit ?? eff,
      suggested_sell_price: eff,
    });
  };

  /** How many rows currently have a manual price override applied. Drives the reset action's enabled state. */
  const overrideCount = items.reduce((n, i) => n + (i.price_override != null ? 1 : 0), 0);

  /**
   * Bulk-clear every manual price_override on the user's deal list. After this completes, totals fall
   * back to the condition-adjusted TCGplayer market price for every row.
   */
  const resetAllOverrides = async () => {
    if (!user || overrideCount === 0) return;
    setResettingOverrides(true);
    // Optimistically clear in the local UI so the totals update instantly.
    const prevSnapshot = items;
    setItems((prev) => prev.map((it) => ({ ...it, price_override: null })));
    const { error } = await supabase
      .from("deal_list_items")
      .update({ price_override: null })
      .eq("user_id", user.id)
      .not("price_override", "is", null);
    setResettingOverrides(false);
    setResetConfirmOpen(false);
    if (error) {
      // Rollback on failure so the UI doesn't lie about persistence.
      setItems(prevSnapshot);
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Manual prices cleared",
      description: `Reverted ${overrideCount} card${overrideCount === 1 ? "" : "s"} to auto pricing.`,
    });
  };

  const saveAllToCollection = async () => {
    // Bulk-import only acts on the current pipeline (active deals); already-bought rows are inventoried elsewhere.
    if (!user || !targetCollection || pipelineItems.length === 0) return;
    setSavingAll(true);
    try {
      const rows = pipelineItems.map((i) => ({
        collection_id: targetCollection,
        user_id: user.id,
        name: i.card_name,
        set_name: i.set_name,
        card_number: i.card_number,
        rarity: i.rarity,
        condition: i.condition as "mint" | "near_mint" | "excellent" | "good" | "light_play" | "moderate_play" | "heavy_play" | "damaged",
        quantity: i.quantity,
        current_market_price: effectivePrice(i),
        estimated_value: effectivePrice(i) != null ? (effectivePrice(i) as number) * i.quantity : null,
        image_url: i.image_url,
        notes: i.notes,
      }));
      const { error } = await supabase.from("collection_items").insert(rows);
      if (error) throw error;
      // Clear the pipeline rows we just imported (keeps your bought/passed history intact).
      const ids = pipelineItems.map((i) => i.id);
      await supabase.from("deal_list_items").delete().in("id", ids);
      setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
      toast({ title: "Saved to collection", description: `${rows.length} card(s) added.` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Deal List | Collector Companion</title>
        <meta name="description" content="Review scanned cards, edit quantities and conditions, then save them to your collection." />
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold">Deal List</h1>
            <p className="text-muted-foreground text-sm">
              {pipelineItems.length} active deal{pipelineItems.length === 1 ? "" : "s"} · est. ${totalValue.toFixed(2)} pipeline
            </p>
            {items.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <label htmlFor="cost-pct" className="text-xs text-muted-foreground">
                  Buy at
                </label>
                <div className="relative">
                  <Input
                    id="cost-pct"
                    type="number"
                    min={0}
                    max={200}
                    step={1}
                    value={costPct}
                    onChange={(e) => setCostPct(Math.max(0, Math.min(200, parseFloat(e.target.value) || 0)))}
                    className="h-7 w-20 pr-6 text-xs"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  of market = <span className="font-semibold text-foreground">${targetSpend.toFixed(2)}</span> target spend
                  {items.some((i) => i.trade_pct_override != null) && (
                    <span className="ml-1 opacity-80">
                      (blended {blendedPct.toFixed(1)}% — some cards overridden)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {overrideCount > 0 && (
              <Button
                variant="outline"
                onClick={() => setResetConfirmOpen(true)}
                title="Clear every manual price you typed and revert to auto pricing"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset {overrideCount} manual price{overrideCount === 1 ? "" : "s"}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/scanner")}>
              <ScanLine className="h-4 w-4 mr-2" /> Scan more
            </Button>
          </div>
        </div>

        <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all manual prices?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear the {overrideCount} price{overrideCount === 1 ? "" : "s"} you typed in
                manually and revert every card to its auto-calculated price (TCGplayer market scaled by
                condition). Your quantities and conditions are not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={resettingOverrides}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  // Prevent the dialog from auto-closing before the network call resolves.
                  e.preventDefault();
                  void resetAllOverrides();
                }}
                disabled={resettingOverrides}
              >
                {resettingOverrides ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resetting…
                  </>
                ) : (
                  "Reset prices"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <p className="text-muted-foreground mb-4">Your Deal List is empty.</p>
            <Button onClick={() => navigate("/scanner")}>
              <ScanLine className="h-4 w-4 mr-2" /> Start scanning
            </Button>
          </Card>
        ) : (
          <>
            {/* Lifecycle tabs — drives which rows render below. Counts come from the unfiltered list. */}
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} className="mb-4">
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="active">
                  Active <span className="ml-1.5 text-xs opacity-70">{statusCounts.watching + statusCounts.negotiating}</span>
                </TabsTrigger>
                <TabsTrigger value="watching">
                  Watching <span className="ml-1.5 text-xs opacity-70">{statusCounts.watching}</span>
                </TabsTrigger>
                <TabsTrigger value="negotiating">
                  Negotiating <span className="ml-1.5 text-xs opacity-70">{statusCounts.negotiating}</span>
                </TabsTrigger>
                <TabsTrigger value="bought">
                  Bought <span className="ml-1.5 text-xs opacity-70">{statusCounts.bought}</span>
                </TabsTrigger>
                <TabsTrigger value="passed">
                  Passed <span className="ml-1.5 text-xs opacity-70">{statusCounts.passed}</span>
                </TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* P&L roll-up shown when relevant to the current view. */}
            {boughtItems.length > 0 && (statusFilter === "bought" || statusFilter === "all") && (
              <Card className="p-4 mb-4 border-emerald-500/30 bg-emerald-500/5">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Inventoried</p>
                    <p className="font-semibold">{boughtItems.length} deal{boughtItems.length === 1 ? "" : "s"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total invested</p>
                    <p className="font-semibold">${totalInvested.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Projected revenue</p>
                    <p className="font-semibold">${projectedRevenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Projected profit</p>
                    <p className={`font-semibold ${projectedProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      ${projectedProfit.toFixed(2)} ({projectedMarginPct.toFixed(0)}%)
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Bought deals also live in your <button className="underline" onClick={() => navigate("/my-collection")}>Inventory</button> collection with full cost basis.
                </p>
              </Card>
            )}
            <div className="space-y-3 mb-6">
              {visibleItems.length === 0 && (
                <Card className="p-10 text-center border-dashed">
                  <p className="text-muted-foreground text-sm">No deals in this view.</p>
                </Card>
              )}
              {visibleItems.map((i) => (
                <Card key={i.id} className="p-3 flex gap-3">
                  <div className="w-16 h-22 shrink-0 bg-muted rounded overflow-hidden flex items-center justify-center">
                    {i.image_url ? (
                      <img src={i.image_url} alt={i.card_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                    ) : (
                      <ImageOff className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{i.card_name}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => deleteItem(i.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {i.set_name ?? "—"} {i.card_number ? `· ${i.card_number}` : ""}
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                      {(() => {
                        const meta = STATUS_META[i.status];
                        const Icon = meta.icon;
                        return (
                          <Badge className={`text-[10px] gap-1 ${meta.tone}`} variant="secondary">
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        );
                      })()}
                      <Badge variant="outline" className="text-[10px]">{i.game}</Badge>
                      {i.rarity && <Badge variant="outline" className="text-[10px]">{i.rarity}</Badge>}
                      {(() => {
                        const auto = adjustedPrice(i.tcgplayer_market_price, i.condition);
                        const eff = effectivePrice(i);
                        const isOverride = i.price_override != null;
                        const isAdjusted = !isOverride && auto !== i.tcgplayer_market_price && i.tcgplayer_market_price != null;
                        const isEditing = editingPriceId === i.id;

                        if (isEditing) {
                          return (
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                autoFocus
                                value={priceDraft}
                                placeholder={auto != null ? auto.toFixed(2) : "0.00"}
                                onChange={(e) => setPriceDraft(e.target.value)}
                                onBlur={() => commitPriceEdit(i.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitPriceEdit(i.id);
                                  if (e.key === "Escape") {
                                    setEditingPriceId(null);
                                    setPriceDraft("");
                                  }
                                }}
                                className="h-6 w-20 text-[11px] px-1.5"
                              />
                              {isOverride && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-[10px]"
                                  onMouseDown={(e) => {
                                    // Use mouseDown so it fires before the input's onBlur cancels.
                                    e.preventDefault();
                                    setPriceDraft("");
                                    applyPriceOverride(i.id, null, i.card_name);
                                    setEditingPriceId(null);
                                  }}
                                  title="Reset to auto price"
                                >
                                  reset
                                </Button>
                              )}
                            </div>
                          );
                        }

                        if (eff == null) {
                          return (
                            <Badge
                              variant="outline"
                              className="text-[10px] cursor-pointer hover:bg-muted"
                              onClick={() => {
                                setEditingPriceId(i.id);
                                setPriceDraft("");
                              }}
                              title="Click to set a price"
                            >
                              Set price
                            </Badge>
                          );
                        }

                        return (
                          <Badge
                            variant="secondary"
                            className="text-[10px] cursor-pointer hover:bg-secondary/80 gap-1"
                            onClick={() => {
                              setEditingPriceId(i.id);
                              setPriceDraft(eff.toFixed(2));
                            }}
                            title={
                              isOverride
                                ? `Manual price $${eff.toFixed(2)} · auto would be $${auto != null ? auto.toFixed(2) : "—"}. Click to edit.`
                                : isAdjusted
                                  ? `${CONDITION_LABELS[i.condition] ?? i.condition} estimate · NM market $${(i.tcgplayer_market_price ?? 0).toFixed(2)}. Click to override.`
                                  : "Near Mint market price. Click to override."
                            }
                          >
                            {isOverride ? (
                              <>
                                {/* Manual price wins — show it as the primary value, with the auto price struck-through alongside for comparison. */}
                                <span className="font-semibold">${eff.toFixed(2)}</span>
                                <span className="opacity-70">(manual)</span>
                                {auto != null && (
                                  <span className="opacity-60 line-through ml-0.5">
                                    ${auto.toFixed(2)}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="font-semibold">${eff.toFixed(2)}</span>
                                {isAdjusted && (
                                  <span className="opacity-70">
                                    ({CONDITION_LABELS[i.condition] ?? i.condition})
                                  </span>
                                )}
                              </>
                            )}
                          </Badge>
                        );
                      })()}
                      {/* Live "deal price" badge: market × this card's trade %. Highlights when the row uses a per-card override. */}
                      {(() => {
                        const mod = modifiedPrice(i);
                        if (mod == null) return null;
                        const pct = effectiveTradePct(i);
                        const hasPctOverride = i.trade_pct_override != null;
                        return (
                          <Badge
                            variant={hasPctOverride ? "default" : "outline"}
                            className="text-[10px] gap-1"
                            title={
                              hasPctOverride
                                ? `Per-card trade ${pct}% applied to this row.`
                                : `Using global ${costPct}% buy-at rate.`
                            }
                          >
                            <span className="opacity-70">deal</span>
                            <span className="font-semibold">${mod.toFixed(2)}</span>
                            <span className="opacity-70">@ {pct}%</span>
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Qty</span>
                        <Input
                          type="number"
                          min={1}
                          value={i.quantity}
                          onChange={(e) => updateItem(i.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="h-7 w-16 text-xs"
                        />
                      </div>
                      <Select value={i.condition} onValueChange={(v) => updateItem(i.id, { condition: v })}>
                        <SelectTrigger className="h-7 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value} className="text-xs">
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Per-card trade % override. Empty = inherit the global costPct. */}
                      <div className="flex items-center gap-1" title="Override the buy-at % for just this card. Leave blank to use the global rate.">
                        <span className="text-xs text-muted-foreground">Trade</span>
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            max={200}
                            step={1}
                            value={i.trade_pct_override ?? ""}
                            placeholder={String(costPct)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                updateItem(i.id, { trade_pct_override: null });
                                return;
                              }
                              const num = parseFloat(raw);
                              if (!Number.isFinite(num)) return;
                              updateItem(i.id, {
                                trade_pct_override: Math.max(0, Math.min(200, num)),
                              });
                            }}
                            className="h-7 w-16 pr-5 text-xs"
                          />
                          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                            %
                          </span>
                        </div>
                        {i.trade_pct_override != null && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            title="Clear per-card trade % (use global rate)"
                            onClick={() => updateItem(i.id, { trade_pct_override: null })}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {i.tcgplayer_url && (
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2">
                          <a href={i.tcgplayer_url} target="_blank" rel="noreferrer">TCG <ExternalLink className="h-3 w-3 ml-1" /></a>
                        </Button>
                      )}
                      {i.ebay_search_url && (
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2">
                          <a href={i.ebay_search_url} target="_blank" rel="noreferrer">eBay <ExternalLink className="h-3 w-3 ml-1" /></a>
                        </Button>
                      )}
                      {/* Lifecycle actions — bought goes through the cost-basis dialog so we capture P&L. */}
                      <div className="ml-auto flex items-center gap-1">
                        {i.status !== "bought" && (
                          <>
                            {i.status !== "negotiating" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2"
                                onClick={() => setDealStatus(i.id, "negotiating")}
                                title="Move to Negotiating"
                              >
                                <MessageSquare className="h-3 w-3 mr-1" /> Negotiate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => openBuyDialog(i)}
                              title="Mark as bought and add to Inventory"
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" /> Bought
                            </Button>
                            {i.status !== "passed" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2"
                                onClick={() => setDealStatus(i.id, "passed")}
                                title="Mark as passed"
                              >
                                <XCircle className="h-3 w-3 mr-1" /> Pass
                              </Button>
                            )}
                          </>
                        )}
                        {i.status === "bought" && (
                          <span className="text-[11px] text-muted-foreground">
                            Cost ${(((i.purchase_price ?? 0) * i.quantity) + (i.shipping_cost ?? 0) + (i.fees ?? 0)).toFixed(2)}
                            {i.target_sell_price ? ` · target $${(i.target_sell_price * i.quantity).toFixed(2)}` : ""}
                          </span>
                        )}
                        {i.status === "passed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => setDealStatus(i.id, "watching")}
                            title="Restore to Watching"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {pipelineItems.length > 0 && (
              <Card className="p-4 sticky bottom-4 border-primary/40 shadow-lg">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Bulk save active deals to collection (no cost basis)
                    </label>
                    <Select value={targetCollection} onValueChange={setTargetCollection}>
                      <SelectTrigger>
                        <SelectValue placeholder={collections.length === 0 ? "Create a collection first" : "Choose a collection"} />
                      </SelectTrigger>
                      <SelectContent>
                        {collections.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.category})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={saveAllToCollection}
                    disabled={!targetCollection || savingAll || pipelineItems.length === 0}
                    className="shrink-0"
                    variant="outline"
                  >
                    {savingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Library className="h-4 w-4 mr-2" />}
                    Save {pipelineItems.length} active
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  For full P&amp;L tracking, mark each row as <strong>Bought</strong> instead — that captures purchase price, shipping, fees, and target sell.
                </p>
              </Card>
            )}
          </>
        )}

        {user && (
          <MarkAsBoughtDialog
            open={!!buyTarget}
            target={buyTarget}
            userId={user.id}
            onClose={() => setBuyTarget(null)}
            onSuccess={(dealId, patch) => {
              setItems((prev) => prev.map((it) => (it.id === dealId ? { ...it, ...patch } : it)));
            }}
          />
        )}
      </main>
    </div>
  );
};

export default DealList;
