import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link } from "react-router-dom";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Trash2, ExternalLink, Loader2, Library, ScanLine, ImageOff, RotateCcw, ShoppingCart, CheckCircle2, XCircle, Eye, Download, Pencil, ListChecks, Undo2, PackageCheck, Tag, DollarSign, Archive } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MarkAsBoughtDialog, type MarkAsBoughtTarget } from "@/components/deals/MarkAsBoughtDialog";
import { EditBoughtDialog, type EditBoughtTarget } from "@/components/deals/EditBoughtDialog";
import { BulkEditBoughtDialog, type BulkEditTarget } from "@/components/deals/BulkEditBoughtDialog";
import { LotBuyDialog, type LotBuyTarget } from "@/components/deals/LotBuyDialog";

/**
 * Deal pipeline stages:
 *  - lead       → identified opportunity, still evaluating / negotiating
 *  - bought     → purchased, cost basis captured, sitting in inventory
 *  - in_stock   → actively listed for sale (publicly or otherwise)
 *  - sold       → buyer committed, sale price + fees recorded
 *  - completed  → payout received & deal archived (final state)
 *  - passed     → walked away from the opportunity
 * Legacy 'watching'/'negotiating' values were migrated to 'lead' in the DB.
 */
type DealStatus = "lead" | "bought" | "in_stock" | "sold" | "completed" | "passed";

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
  // Sale tracking (set when advancing into the Sold stage)
  listing_status: string | null;
  list_price: number | null;
  sold_price: number | null;
  sold_at: string | null;
  sold_channel: string | null;
  sold_buyer: string | null;
  sold_fees: number;
  sold_shipping: number;
  completed_at: string | null;
}

const STATUS_META: Record<DealStatus, { label: string; icon: typeof Eye; tone: string }> = {
  lead: { label: "Lead", icon: Eye, tone: "bg-muted text-muted-foreground" },
  bought: { label: "Bought", icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  in_stock: { label: "In Stock", icon: Tag, tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  sold: { label: "Sold", icon: DollarSign, tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  completed: { label: "Completed", icon: Archive, tone: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
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
  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">(() => {
    if (typeof window === "undefined") return "lead";
    const stored = (window.localStorage.getItem("dealList:statusFilter") as DealStatus | "all" | "active" | null);
    // Migrate legacy stored values
    if (!stored || stored === "active" || (stored as string) === "watching" || (stored as string) === "negotiating") return "lead";
    return stored as DealStatus | "all";
  });
  const [buyTarget, setBuyTarget] = useState<MarkAsBoughtTarget | null>(null);
  const [editTarget, setEditTarget] = useState<EditBoughtTarget | null>(null);
  // Bulk-edit state for the Bought tab — Set<id> survives status filter changes so users
  // can re-find a row in another tab without losing their selection.
  const [selectedBoughtIds, setSelectedBoughtIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  // Pipeline selection (watching/negotiating) drives the "Buy as lot" workflow — kept
  // separate from the bought selection so the two toolbars never fight over the same Set.
  const [selectedPipelineIds, setSelectedPipelineIds] = useState<Set<string>>(new Set());
  const [lotBuyOpen, setLotBuyOpen] = useState(false);
  // Latest reversible bulk edit for this user. Refetched after each save so the
  // Undo button always reflects the freshest action and disappears once consumed.
  const [lastBulkEdit, setLastBulkEdit] = useState<{ id: string; created_at: string; entries: any[]; summary: any } | null>(null);
  const [undoing, setUndoing] = useState(false);
  // Pass-flow state — capturing a non-empty reason is mandatory so future-you knows why a deal died.
  const [passTarget, setPassTarget] = useState<DealItem | null>(null);
  const [passReason, setPassReason] = useState("");
  const [passSubmitting, setPassSubmitting] = useState(false);
  // Sell-flow state — capture realized revenue when moving Bought/In Stock → Sold.
  const [sellTarget, setSellTarget] = useState<DealItem | null>(null);
  const [sellDraft, setSellDraft] = useState({ sold_price: "", sold_channel: "", sold_buyer: "", sold_fees: "0", sold_shipping: "0" });
  const [sellSubmitting, setSellSubmitting] = useState(false);
  // List-for-sale state — sets list_price when moving Bought → In Stock.
  const [listTarget, setListTarget] = useState<DealItem | null>(null);
  const [listDraft, setListDraft] = useState({ list_price: "" });

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

  /**
   * Load the most recent reversible bulk edit for the current user. Called on mount
   * and after each successful bulk edit / undo so the Undo button stays in sync.
   */
  const refreshLastBulkEdit = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bulk_edit_audit_log")
      .select("id, created_at, entries, summary")
      .eq("user_id", user.id)
      .eq("action", "bulk_edit_bought")
      .is("undone_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastBulkEdit(data ? { ...(data as any) } : null);
  };

  useEffect(() => {
    refreshLastBulkEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * Restore every deal (and any mirrored inventory row) in the latest bulk edit
   * back to its pre-edit values, then mark the audit row consumed.
   */
  const handleUndoLastBulkEdit = async () => {
    if (!lastBulkEdit || undoing) return;
    setUndoing(true);
    try {
      const entries = (lastBulkEdit.entries ?? []) as Array<any>;
      const dealOps = entries.map((e) =>
        supabase
          .from("deal_list_items")
          .update({
            purchase_price: e.before?.purchase_price ?? null,
            shipping_cost: e.before?.shipping_cost ?? 0,
            fees: e.before?.fees ?? 0,
            target_sell_price: e.before?.target_sell_price ?? null,
          })
          .eq("id", e.deal_id),
      );
      const results = await Promise.all(dealOps);
      const firstErr = results.find((r) => r.error)?.error;
      if (firstErr) throw firstErr;

      // Restore inventory mirror values where they were captured.
      const invSnapshots = (lastBulkEdit.summary?.inventory_updates ?? []) as Array<{
        id: string;
        prev_purchase_price: number | null;
        prev_estimated_value: number | null;
      }>;
      if (invSnapshots.length > 0) {
        await Promise.all(
          invSnapshots.map((s) =>
            supabase
              .from("collection_items")
              .update({ purchase_price: s.prev_purchase_price, estimated_value: s.prev_estimated_value })
              .eq("id", s.id),
          ),
        );
      }

      // Splice restored values back into local state to avoid a refetch.
      setItems((prev) =>
        prev.map((it) => {
          const match = entries.find((e) => e.deal_id === it.id);
          if (!match) return it;
          return {
            ...it,
            purchase_price: match.before?.purchase_price ?? null,
            shipping_cost: match.before?.shipping_cost ?? 0,
            fees: match.before?.fees ?? 0,
            target_sell_price: match.before?.target_sell_price ?? null,
          };
        }),
      );

      await supabase
        .from("bulk_edit_audit_log")
        .update({ undone_at: new Date().toISOString() })
        .eq("id", lastBulkEdit.id);

      toast({ title: "Bulk edit reverted", description: `Restored ${entries.length} deal${entries.length === 1 ? "" : "s"}.` });
      setLastBulkEdit(null);
    } catch (e) {
      toast({
        title: "Undo failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUndoing(false);
    }
  };

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
    { lead: 0, bought: 0, in_stock: 0, sold: 0, completed: 0, passed: 0 } as Record<DealStatus, number>,
  );
  const visibleItems = items.filter((it) => {
    if (statusFilter === "all") return true;
    return it.status === statusFilter;
  });

  // Pipeline totals (leads only — bought/in-stock/sold/passed shouldn't inflate "spend" math).
  const pipelineItems = items.filter((it) => it.status === "lead");
  const totalValue = pipelineItems.reduce(
    (sum, i) => sum + (effectivePrice(i) ?? 0) * i.quantity,
    0,
  );
  const targetSpend = pipelineItems.reduce(
    (sum, i) => sum + (modifiedPrice(i) ?? 0) * i.quantity,
    0,
  );
  const blendedPct = totalValue > 0 ? (targetSpend / totalValue) * 100 : costPct;

  // P&L roll-up: any deal that's been purchased is "invested capital", regardless of where
  // it sits downstream (bought / in_stock / sold / completed).
  const purchasedItems = items.filter(
    (it) => it.status === "bought" || it.status === "in_stock" || it.status === "sold" || it.status === "completed",
  );
  const boughtItems = items.filter((it) => it.status === "bought");
  const inStockItems = items.filter((it) => it.status === "in_stock");
  const soldItems = items.filter((it) => it.status === "sold" || it.status === "completed");
  const totalInvested = purchasedItems.reduce(
    (s, i) => s + (i.purchase_price ?? 0) * i.quantity + (i.shipping_cost ?? 0) + (i.fees ?? 0),
    0,
  );
  const projectedRevenue = purchasedItems.reduce(
    (s, i) => s + (i.sold_price ?? i.target_sell_price ?? 0) * i.quantity,
    0,
  );
  const realizedRevenue = soldItems.reduce(
    (s, i) => s + (i.sold_price ?? 0) * i.quantity - (i.sold_fees ?? 0) - (i.sold_shipping ?? 0),
    0,
  );
  const realizedCost = soldItems.reduce(
    (s, i) => s + (i.purchase_price ?? 0) * i.quantity + (i.shipping_cost ?? 0) + (i.fees ?? 0),
    0,
  );
  const realizedProfit = realizedRevenue - realizedCost;
  const realizedMarginPct = realizedRevenue > 0 ? (realizedProfit / realizedRevenue) * 100 : 0;
  const projectedProfit = projectedRevenue - totalInvested;
  const projectedMarginPct = totalInvested > 0 ? (projectedProfit / totalInvested) * 100 : 0;

  // Bulk-edit derivations: only bought rows are eligible. Selection is intersected with the
  // current bought set so deleted rows can't linger as ghost selections.
  const selectedBoughtItems = boughtItems.filter((b) => selectedBoughtIds.has(b.id));
  const selectedBoughtCount = selectedBoughtItems.length;
  const visibleBoughtItems = visibleItems.filter((it) => it.status === "bought");
  const allVisibleBoughtSelected =
    visibleBoughtItems.length > 0 && visibleBoughtItems.every((b) => selectedBoughtIds.has(b.id));

  const toggleBoughtSelection = (id: string) => {
    setSelectedBoughtIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAllVisibleBought = () => {
    setSelectedBoughtIds((prev) => {
      const next = new Set(prev);
      if (allVisibleBoughtSelected) {
        for (const b of visibleBoughtItems) next.delete(b.id);
      } else {
        for (const b of visibleBoughtItems) next.add(b.id);
      }
      return next;
    });
  };
  const clearBoughtSelection = () => setSelectedBoughtIds(new Set());

  // Pipeline (lead) selection — mirrors the bought-selection helpers above
  // so the row gutter checkbox + lot toolbar can be wired identically.
  const visiblePipelineItems = visibleItems.filter((it) => it.status === "lead");
  const selectedPipelineItems = pipelineItems.filter((p) => selectedPipelineIds.has(p.id));
  const selectedPipelineCount = selectedPipelineItems.length;
  const allVisiblePipelineSelected =
    visiblePipelineItems.length > 0 &&
    visiblePipelineItems.every((p) => selectedPipelineIds.has(p.id));
  const togglePipelineSelection = (id: string) => {
    setSelectedPipelineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAllVisiblePipeline = () => {
    setSelectedPipelineIds((prev) => {
      const next = new Set(prev);
      if (allVisiblePipelineSelected) {
        for (const p of visiblePipelineItems) next.delete(p.id);
      } else {
        for (const p of visiblePipelineItems) next.add(p.id);
      }
      return next;
    });
  };
  const clearPipelineSelection = () => setSelectedPipelineIds(new Set());

  /**
   * CSV export of the current view + a P&L summary footer for every bought deal.
   * Designed to drop straight into Excel / Google Sheets — quotes are escaped per RFC 4180.
   */
  const exportCsv = () => {
    const esc = (v: unknown): string => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const fix = (n: number | null | undefined, d = 2) =>
      n == null || Number.isNaN(n) ? "" : n.toFixed(d);

    const headers = [
      "Status", "Game", "Card", "Set", "Number", "Rarity", "Condition", "Quantity",
      "Market Price", "Effective Price", "Trade %", "Buy Price (per card)", "Buy Total",
      "Purchase Price", "Shipping", "Fees", "Invested", "Target Sell (per card)",
      "Projected Revenue", "Projected Profit", "Projected Margin %",
      "Source", "Notes", "Bought At", "Created At",
    ];

    const rows = visibleItems.map((i) => {
      const market = i.tcgplayer_market_price;
      const eff = effectivePrice(i);
      const tradePct = effectiveTradePct(i);
      const modPer = modifiedPrice(i);
      const modTotal = modPer != null ? modPer * i.quantity : null;
      const invested = i.status === "bought"
        ? (i.purchase_price ?? 0) * i.quantity + (i.shipping_cost ?? 0) + (i.fees ?? 0)
        : null;
      const projRev = i.status === "bought" && i.target_sell_price != null
        ? i.target_sell_price * i.quantity
        : null;
      const projProfit = invested != null && projRev != null ? projRev - invested : null;
      const projMargin = projRev != null && projRev > 0 && projProfit != null
        ? (projProfit / projRev) * 100
        : null;
      return [
        STATUS_META[i.status].label, i.game, i.card_name, i.set_name, i.card_number, i.rarity,
        i.condition, i.quantity,
        fix(market), fix(eff), fix(tradePct, 1), fix(modPer), fix(modTotal),
        fix(i.purchase_price), fix(i.shipping_cost), fix(i.fees), fix(invested),
        fix(i.target_sell_price), fix(projRev), fix(projProfit), fix(projMargin, 1),
        i.source, i.notes,
        i.bought_at ? new Date(i.bought_at).toISOString() : "",
        new Date(i.created_at).toISOString(),
      ].map(esc).join(",");
    });

    // Footer: pipeline + P&L roll-up so the file is self-contained for analysis.
    const summary: string[] = [
      "",
      "SUMMARY",
      ["Metric", "Value"].map(esc).join(","),
      ["View", statusFilter].map(esc).join(","),
      ["Rows in export", String(visibleItems.length)].map(esc).join(","),
      ["Active deals", String(pipelineItems.length)].map(esc).join(","),
      ["Pipeline market value", `$${totalValue.toFixed(2)}`].map(esc).join(","),
      ["Pipeline target spend", `$${targetSpend.toFixed(2)}`].map(esc).join(","),
      ["Blended buy %", `${blendedPct.toFixed(1)}%`].map(esc).join(","),
      ["Bought deals", String(boughtItems.length)].map(esc).join(","),
      ["Total invested", `$${totalInvested.toFixed(2)}`].map(esc).join(","),
      ["Projected revenue", `$${projectedRevenue.toFixed(2)}`].map(esc).join(","),
      ["Projected profit", `$${projectedProfit.toFixed(2)}`].map(esc).join(","),
      ["Projected margin %", `${projectedMarginPct.toFixed(1)}%`].map(esc).join(","),
    ];

    const csv = [headers.map(esc).join(","), ...rows, ...summary].join("\r\n");
    // BOM so Excel opens UTF-8 cleanly with accented card names.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deal-pipeline-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    sonnerToast.success(`Exported ${visibleItems.length} row${visibleItems.length === 1 ? "" : "s"} + P&L summary`);
  };

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
   * Move a deal between lifecycle stages. The "Bought" stage is normally entered through
   * the cost-basis dialog (MarkAsBoughtDialog), but we still allow this helper to set it
   * directly when reverting a Sold deal back to Bought (no new inventory row needed).
   */
  const setDealStatus = async (id: string, next: DealStatus) => {
    const patch: Partial<DealItem> = {
      status: next,
      passed_at: next === "passed" ? new Date().toISOString() : null,
    };
    // When reverting out of Sold/Completed, clear realized-sale fields so analytics stay clean.
    if (next !== "sold" && next !== "completed") {
      patch.sold_at = null;
      patch.completed_at = null;
    }
    await updateItem(id, patch);
  };

  /** Open the Sold dialog seeded with the deal's existing list price / target sell. */
  const openSellDialog = (item: DealItem) => {
    setSellTarget(item);
    const seedPrice =
      item.sold_price?.toString() ??
      item.list_price?.toString() ??
      item.target_sell_price?.toString() ??
      "";
    setSellDraft({
      sold_price: seedPrice,
      sold_channel: item.sold_channel ?? "",
      sold_buyer: item.sold_buyer ?? "",
      sold_fees: item.sold_fees ? String(item.sold_fees) : "0",
      sold_shipping: item.sold_shipping ? String(item.sold_shipping) : "0",
    });
  };

  /** Take an In-Stock deal off the market — flips back to Bought and clears the listing fields. */
  const unlistItem = async (item: DealItem) => {
    await updateItem(item.id, {
      status: "bought",
      listing_status: "private",
      list_price: null,
    });
    sonnerToast.success("Listing removed");
  };

  /** Final archive step — locks the deal as Completed once payout has cleared. */
  const markCompleted = async (item: DealItem) => {
    await updateItem(item.id, { status: "completed", completed_at: new Date().toISOString() });
    sonnerToast.success("Deal completed");
  };

  /** Confirm a sale and persist all realized-revenue fields. */
  const confirmSale = async () => {
    if (!sellTarget) return;
    const price = parseFloat(sellDraft.sold_price);
    if (!Number.isFinite(price) || price < 0) {
      sonnerToast.error("Enter a valid sold price.");
      return;
    }
    setSellSubmitting(true);
    try {
      await updateItem(sellTarget.id, {
        status: "sold",
        sold_price: Math.round(price * 100) / 100,
        sold_channel: sellDraft.sold_channel.trim() || null,
        sold_buyer: sellDraft.sold_buyer.trim() || null,
        sold_fees: Math.max(0, parseFloat(sellDraft.sold_fees) || 0),
        sold_shipping: Math.max(0, parseFloat(sellDraft.sold_shipping) || 0),
        sold_at: new Date().toISOString(),
      });
      sonnerToast.success(`Sold · ${sellTarget.card_name}`);
      setSellTarget(null);
    } finally {
      setSellSubmitting(false);
    }
  };

  /** Confirm an In-Stock listing — sets list_price and flips status. */
  const confirmList = async () => {
    if (!listTarget) return;
    const price = parseFloat(listDraft.list_price);
    if (!Number.isFinite(price) || price < 0) {
      sonnerToast.error("Enter a valid list price.");
      return;
    }
    await updateItem(listTarget.id, {
      status: "in_stock",
      list_price: Math.round(price * 100) / 100,
      listing_status: "for_sale",
    });
    sonnerToast.success(`Listed @ $${price.toFixed(2)}`);
    setListTarget(null);
  };

  /**
   * Confirms a Pass with a required reason. We prepend a timestamped "Passed:" line to the
   * existing notes so the original notes (if any) are preserved as additional context.
   */
  const confirmPass = async () => {
    if (!passTarget) return;
    const reason = passReason.trim();
    if (reason.length < 3) {
      sonnerToast.error("Please add a short reason (at least 3 characters).");
      return;
    }
    if (reason.length > 500) {
      sonnerToast.error("Reason is too long (max 500 characters).");
      return;
    }
    setPassSubmitting(true);
    const stamp = new Date().toISOString().slice(0, 10);
    const passedLine = `[Passed ${stamp}] ${reason}`;
    const merged = passTarget.notes && passTarget.notes.trim().length > 0
      ? `${passedLine}\n\n${passTarget.notes}`
      : passedLine;
    try {
      await updateItem(passTarget.id, {
        status: "passed",
        passed_at: new Date().toISOString(),
        notes: merged,
      });
      setPassTarget(null);
      setPassReason("");
    } finally {
      setPassSubmitting(false);
    }
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
        <title>Deal Pipeline | Collector Companion</title>
        <meta name="description" content="Track sourcing leads through Bought, In Stock, Sold, and Completed pipeline stages." />
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/vending">Vending</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Deal Pipeline</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold">Deal Pipeline</h1>
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
            <Button variant="outline" onClick={exportCsv} disabled={visibleItems.length === 0} title="Download current view + P&L summary as CSV">
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
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
            {/* Lifecycle tabs — Lead → Bought → In Stock → Sold → Completed. Counts come from the unfiltered list. */}
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} className="mb-4">
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="lead">
                  Lead <span className="ml-1.5 text-xs opacity-70">{statusCounts.lead}</span>
                </TabsTrigger>
                <TabsTrigger value="bought">
                  Bought <span className="ml-1.5 text-xs opacity-70">{statusCounts.bought}</span>
                </TabsTrigger>
                <TabsTrigger value="in_stock">
                  In Stock <span className="ml-1.5 text-xs opacity-70">{statusCounts.in_stock}</span>
                </TabsTrigger>
                <TabsTrigger value="sold">
                  Sold <span className="ml-1.5 text-xs opacity-70">{statusCounts.sold}</span>
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed <span className="ml-1.5 text-xs opacity-70">{statusCounts.completed}</span>
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
                  See full per-item P&amp;L on the <button className="underline" onClick={() => navigate("/inventory")}>Inventory page</button>. Bought deals also live in your <button className="underline" onClick={() => navigate("/my-collection")}>Inventory</button> collection with full cost basis.
                </p>
              </Card>
            )}

            {/* Lot-buy toolbar — appears when watching/negotiating rows are on screen so users can
                multi-select a pile and split a single lot cost across every card in one shot. */}
            {visiblePipelineItems.length > 0 && (
              <Card className="p-2 mb-3 flex flex-wrap items-center gap-2 text-xs">
                <Checkbox
                  checked={allVisiblePipelineSelected}
                  onCheckedChange={toggleSelectAllVisiblePipeline}
                  aria-label="Select all visible active deals"
                />
                <span className="text-muted-foreground">
                  {selectedPipelineCount > 0
                    ? `${selectedPipelineCount} selected for lot buy`
                    : `Select active deals to buy as a lot (${visiblePipelineItems.length} on screen)`}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {selectedPipelineCount > 0 && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearPipelineSelection}>
                      Clear
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={selectedPipelineCount === 0}
                    onClick={() => setLotBuyOpen(true)}
                  >
                    <PackageCheck className="h-3 w-3 mr-1" />
                    Buy {selectedPipelineCount || ""} as lot
                  </Button>
                </div>
              </Card>
            )}

            {/* Bulk-edit toolbar — visible whenever bought rows are on screen so users can multi-select cost-basis updates. */}
            {visibleBoughtItems.length > 0 && (
              <Card className="p-2 mb-3 flex flex-wrap items-center gap-2 text-xs">
                <Checkbox
                  checked={allVisibleBoughtSelected}
                  onCheckedChange={toggleSelectAllVisibleBought}
                  aria-label="Select all visible bought deals"
                />
                <span className="text-muted-foreground">
                  {selectedBoughtCount > 0
                    ? `${selectedBoughtCount} selected`
                    : `Select bought deals to bulk-edit cost basis (${visibleBoughtItems.length} on screen)`}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {lastBulkEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={handleUndoLastBulkEdit}
                      disabled={undoing}
                      title={`Revert last bulk edit (${(lastBulkEdit.entries ?? []).length} deal${(lastBulkEdit.entries ?? []).length === 1 ? "" : "s"})`}
                    >
                      {undoing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Undo2 className="h-3 w-3 mr-1" />}
                      Undo last bulk edit
                    </Button>
                  )}
                  {selectedBoughtCount > 0 && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearBoughtSelection}>
                      Clear
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={selectedBoughtCount === 0}
                    onClick={() => setBulkEditOpen(true)}
                  >
                    <ListChecks className="h-3 w-3 mr-1" />
                    Edit {selectedBoughtCount || ""} cost bas{selectedBoughtCount === 1 ? "is" : "es"}
                  </Button>
                </div>
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
                  {/* Selection checkbox: bought rows feed bulk-edit, lead rows feed lot-buy.
                      Downstream stages (in_stock/sold/completed/passed) aren't multi-selectable. */}
                  {(i.status === "bought" || i.status === "lead") && (
                    <div className="flex items-start pt-1">
                      <Checkbox
                        checked={
                          i.status === "bought"
                            ? selectedBoughtIds.has(i.id)
                            : selectedPipelineIds.has(i.id)
                        }
                        onCheckedChange={() =>
                          i.status === "bought"
                            ? toggleBoughtSelection(i.id)
                            : togglePipelineSelection(i.id)
                        }
                        aria-label={`Select ${i.card_name}`}
                      />
                    </div>
                  )}
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
                      {/* Lifecycle actions — bought goes through the cost-basis dialog so we capture P&L.
                          Downstream stages route through dedicated dialogs (List for sale / Mark sold) so
                          we always capture list_price, sold_price, channel, buyer, fees, and shipping. */}
                      <div className="ml-auto flex items-center gap-1 flex-wrap justify-end">
                        {i.status === "lead" && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => openBuyDialog(i)}
                              title="Mark as bought and add to Inventory"
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" /> Bought
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => { setPassTarget(i); setPassReason(""); }}
                              title="Mark as passed"
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Pass
                            </Button>
                          </>
                        )}
                        {i.status === "bought" && (
                          <>
                            <span className="text-[11px] text-muted-foreground mr-1">
                              Cost ${(((i.purchase_price ?? 0) * i.quantity) + (i.shipping_cost ?? 0) + (i.fees ?? 0)).toFixed(2)}
                              {i.target_sell_price ? ` · target $${(i.target_sell_price * i.quantity).toFixed(2)}` : ""}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                setListTarget(i);
                                setListDraft({
                                  list_price:
                                    i.list_price?.toString() ??
                                    i.target_sell_price?.toString() ??
                                    "",
                                });
                              }}
                              title="List for sale (move to In Stock)"
                            >
                              <Tag className="h-3 w-3 mr-1" /> List
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => openSellDialog(i)}
                              title="Record a sale"
                            >
                              <DollarSign className="h-3 w-3 mr-1" /> Sold
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => setEditTarget({
                                id: i.id,
                                card_name: i.card_name,
                                set_name: i.set_name,
                                quantity: i.quantity,
                                purchase_price: i.purchase_price,
                                shipping_cost: i.shipping_cost,
                                fees: i.fees,
                                source: i.source,
                                target_sell_price: i.target_sell_price,
                                collection_item_id: i.collection_item_id,
                              })}
                              title="Edit cost basis & target sell"
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                          </>
                        )}
                        {i.status === "in_stock" && (
                          <>
                            <span className="text-[11px] text-muted-foreground mr-1">
                              Listed{i.list_price != null ? ` @ $${i.list_price.toFixed(2)}` : ""}
                            </span>
                            <Button
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => openSellDialog(i)}
                              title="Record a sale"
                            >
                              <DollarSign className="h-3 w-3 mr-1" /> Sold
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => unlistItem(i)}
                              title="Take down listing (back to Bought)"
                            >
                              <Undo2 className="h-3 w-3 mr-1" /> Unlist
                            </Button>
                          </>
                        )}
                        {i.status === "sold" && (
                          <>
                            <span className="text-[11px] text-muted-foreground mr-1">
                              {i.sold_price != null ? `$${(i.sold_price * i.quantity).toFixed(2)}` : "—"}
                              {i.sold_channel ? ` · ${i.sold_channel}` : ""}
                            </span>
                            <Button
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => markCompleted(i)}
                              title="Mark deal completed (archive)"
                            >
                              <Archive className="h-3 w-3 mr-1" /> Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => setDealStatus(i.id, "bought")}
                              title="Revert sale (back to Bought)"
                            >
                              <Undo2 className="h-3 w-3 mr-1" /> Undo
                            </Button>
                          </>
                        )}
                        {i.status === "completed" && (
                          <>
                            <span className="text-[11px] text-muted-foreground mr-1">
                              Profit ${(((i.sold_price ?? 0) * i.quantity) - (i.sold_fees ?? 0) - (i.sold_shipping ?? 0) - ((i.purchase_price ?? 0) * i.quantity) - (i.shipping_cost ?? 0) - (i.fees ?? 0)).toFixed(2)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => updateItem(i.id, { status: "sold", completed_at: null })}
                              title="Reopen this deal"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" /> Reopen
                            </Button>
                          </>
                        )}
                        {i.status === "passed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => setDealStatus(i.id, "lead")}
                            title="Restore to Lead"
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

        <EditBoughtDialog
          open={!!editTarget}
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={(dealId, patch) => {
            setItems((prev) => prev.map((it) => (it.id === dealId ? { ...it, ...patch } : it)));
          }}
        />

        <BulkEditBoughtDialog
          open={bulkEditOpen}
          targets={selectedBoughtItems.map<BulkEditTarget>((b) => ({
            id: b.id,
            card_name: b.card_name,
            quantity: b.quantity,
            purchase_price: b.purchase_price,
            shipping_cost: b.shipping_cost,
            fees: b.fees,
            target_sell_price: b.target_sell_price,
            collection_item_id: b.collection_item_id,
          }))}
          onClose={() => setBulkEditOpen(false)}
          onSuccess={(patches) => {
            // Splice each patched field back into local state so the UI updates without a refetch.
            setItems((prev) => prev.map((it) => (patches[it.id] ? { ...it, ...patches[it.id] } : it)));
            clearBoughtSelection();
            refreshLastBulkEdit();
          }}
        />

        {user && (
          <LotBuyDialog
            open={lotBuyOpen}
            userId={user.id}
            targets={selectedPipelineItems.map<LotBuyTarget>((p) => ({
              id: p.id,
              card_name: p.card_name,
              set_name: p.set_name,
              card_number: p.card_number,
              rarity: p.rarity,
              image_url: p.image_url,
              quantity: p.quantity,
              condition: p.condition,
              game: p.game,
              notes: p.notes,
              // Modified (deal) price is what the user expects to pay per card; falls back
              // to effective market price so allocation weighting always has a value.
              reference_unit_price: modifiedPrice(p) ?? effectivePrice(p),
              suggested_sell_price: effectivePrice(p),
            }))}
            onClose={() => setLotBuyOpen(false)}
            onSuccess={(results) => {
              // Splice each newly-bought row in place so it instantly flips into the Bought tab.
              setItems((prev) => {
                const byId = new Map(results.map((r) => [r.dealId, r.patch]));
                return prev.map((it) => {
                  const patch = byId.get(it.id);
                  return patch ? { ...it, ...patch } : it;
                });
              });
              clearPipelineSelection();
            }}
          />
        )}


        {/* Pass-with-reason dialog. The reason is required so the Passed tab keeps useful context. */}
        <AlertDialog
          open={!!passTarget}
          onOpenChange={(o) => {
            if (!o && !passSubmitting) {
              setPassTarget(null);
              setPassReason("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Why are you passing on this deal?</AlertDialogTitle>
              <AlertDialogDescription>
                {passTarget?.card_name ? (
                  <>Add a quick note for <span className="font-medium text-foreground">{passTarget.card_name}</span> so future-you remembers why it didn't get bought (e.g. "seller wouldn't budge", "condition worse in person", "found cheaper copy").</>
                ) : (
                  "Add a quick note so future-you remembers why this deal didn't get bought."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <Textarea
                value={passReason}
                onChange={(e) => setPassReason(e.target.value.slice(0, 500))}
                placeholder="Reason (required)…"
                rows={4}
                autoFocus
                maxLength={500}
                disabled={passSubmitting}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Min 3 characters</span>
                <span>{passReason.trim().length}/500</span>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={passSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); void confirmPass(); }}
                disabled={passSubmitting || passReason.trim().length < 3}
              >
                {passSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>) : "Mark as Passed"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* List for sale — flips Bought → In Stock with a list price. */}
        <Dialog open={!!listTarget} onOpenChange={(o) => !o && setListTarget(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>List for sale</DialogTitle>
              <DialogDescription>
                {listTarget?.card_name} · qty {listTarget?.quantity ?? 1}. Moves this deal to <strong>In Stock</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="list-price" className="text-xs">List price (per card)</Label>
              <Input
                id="list-price"
                type="number"
                step="0.01"
                min={0}
                value={listDraft.list_price}
                onChange={(e) => setListDraft({ list_price: e.target.value })}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setListTarget(null)}>Cancel</Button>
              <Button onClick={confirmList}>List</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mark sold — captures realized revenue, channel, buyer, fees and shipping. */}
        <Dialog open={!!sellTarget} onOpenChange={(o) => !o && !sellSubmitting && setSellTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record sale</DialogTitle>
              <DialogDescription>
                {sellTarget?.card_name} · qty {sellTarget?.quantity ?? 1}.
              </DialogDescription>
            </DialogHeader>
            {(() => {
              if (!sellTarget) return null;
              const qty = sellTarget.quantity || 1;
              const price = parseFloat(sellDraft.sold_price) || 0;
              const fees = parseFloat(sellDraft.sold_fees) || 0;
              const ship = parseFloat(sellDraft.sold_shipping) || 0;
              const revenue = price * qty - fees - ship;
              const cost = (sellTarget.purchase_price ?? 0) * qty + (sellTarget.shipping_cost ?? 0) + (sellTarget.fees ?? 0);
              const profit = revenue - cost;
              const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
              return (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor="sold-price" className="text-xs">Sold price (per card)</Label>
                      <Input id="sold-price" type="number" step="0.01" min={0} value={sellDraft.sold_price}
                        onChange={(e) => setSellDraft({ ...sellDraft, sold_price: e.target.value })} autoFocus />
                    </div>
                    <div>
                      <Label htmlFor="sold-fees" className="text-xs">Fees (total)</Label>
                      <Input id="sold-fees" type="number" step="0.01" min={0} value={sellDraft.sold_fees}
                        onChange={(e) => setSellDraft({ ...sellDraft, sold_fees: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="sold-shipping" className="text-xs">Shipping (total)</Label>
                      <Input id="sold-shipping" type="number" step="0.01" min={0} value={sellDraft.sold_shipping}
                        onChange={(e) => setSellDraft({ ...sellDraft, sold_shipping: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="sold-channel" className="text-xs">Channel</Label>
                      <Input id="sold-channel" value={sellDraft.sold_channel}
                        onChange={(e) => setSellDraft({ ...sellDraft, sold_channel: e.target.value })}
                        placeholder="eBay, show, in-person…" />
                    </div>
                    <div>
                      <Label htmlFor="sold-buyer" className="text-xs">Buyer</Label>
                      <Input id="sold-buyer" value={sellDraft.sold_buyer}
                        onChange={(e) => setSellDraft({ ...sellDraft, sold_buyer: e.target.value })}
                        placeholder="Optional" />
                    </div>
                  </div>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Net revenue</span><span>${revenue.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Cost basis</span><span>${cost.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Realized profit</span>
                      <span className={profit >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-destructive"}>
                        ${profit.toFixed(2)} ({marginPct.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSellTarget(null)} disabled={sellSubmitting}>Cancel</Button>
              <Button onClick={confirmSale} disabled={sellSubmitting}>
                {sellSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Mark sold
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default DealList;
