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
import { Loader2, ImageOff, ExternalLink, Package, ArrowUpDown, Printer, ChevronDown, RotateCw, History as HistoryIcon, Store, CalendarPlus, MoreHorizontal, Plus, Pencil, Trash2, CalendarX, ClipboardCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge as BadgeUi } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { PrintLabelsDialog } from "@/components/inventory/PrintLabelsDialog";
import { PrintHistoryDialog } from "@/components/inventory/PrintHistoryDialog";
import { FeatureAtEventDialog } from "@/components/inventory/FeatureAtEventDialog";
import { InventoryItemDialog, type InventoryItemFormValues } from "@/components/inventory/InventoryItemDialog";
import { StockAdjustmentDialog, type AdjustableItem } from "@/components/inventory/StockAdjustmentDialog";
import { StockAdjustmentHistoryDialog } from "@/components/inventory/StockAdjustmentHistoryDialog";
import { useVendorProfile } from "@/hooks/useVendorProfile";

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
  label_printed_at: string | null;
  label_print_count: number;
  listing_status: "private" | "for_sale" | "sold" | "hold";
  list_price: number | null;
  public_notes: string | null;
  notes: string | null;
}

interface EventOpt {
  id: string;
  title: string;
  date: string;
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
  const { vendorProfile } = useVendorProfile();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("bought_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printOpen, setPrintOpen] = useState(false);
  const [printItemIds, setPrintItemIds] = useState<string[] | null>(null);
  const [printSource, setPrintSource] = useState<string>("all_visible");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [featureItemIds, setFeatureItemIds] = useState<string[] | null>(null);
  const [featureLabel, setFeatureLabel] = useState<string | undefined>(undefined);
  const [eventOptions, setEventOptions] = useState<EventOpt[]>([]);
  const [eventScope, setEventScope] = useState<string>("all");
  // map of itemId -> Set<eventId>
  const [eventMemberships, setEventMemberships] = useState<Map<string, Set<string>>>(new Map());
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<(Partial<InventoryItemFormValues> & { id?: string }) | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null);
  const [adjustItemIds, setAdjustItemIds] = useState<string[] | null>(null);
  const [adjHistoryOpen, setAdjHistoryOpen] = useState(false);
  const [adjHistoryItemIds, setAdjHistoryItemIds] = useState<string[] | undefined>(undefined);

  const loadInventory = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("deal_list_items")
      .select(
        "id, card_name, set_name, card_number, rarity, image_url, game, condition, quantity, purchase_price, shipping_cost, fees, target_sell_price, source, bought_at, tcgplayer_url, tcgplayer_market_price, label_printed_at, label_print_count, listing_status, list_price, public_notes, notes"
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
  };

  useEffect(() => {
    if (!user) return;
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load vendor's approved+paid events + per-item event memberships
  useEffect(() => {
    if (!user || !vendorProfile?.id) {
      setEventOptions([]);
      setEventMemberships(new Map());
      return;
    }
    (async () => {
      const { data: apps } = await supabase
        .from("vendor_applications")
        .select("event_id, events!inner(id, title, date)")
        .eq("vendor_id", vendorProfile.id)
        .eq("application_status", "approved")
        .eq("payment_status", "paid");
      const evs: EventOpt[] = (apps ?? [])
        .map((a: any) => a.events)
        .filter(Boolean);
      setEventOptions(evs);

      const { data: picks } = await supabase
        .from("vendor_event_inventory")
        .select("event_id, item_id")
        .eq("vendor_id", vendorProfile.id);
      const map = new Map<string, Set<string>>();
      for (const p of picks ?? []) {
        if (!map.has(p.item_id)) map.set(p.item_id, new Set());
        map.get(p.item_id)!.add(p.event_id);
      }
      setEventMemberships(map);
    })();
  }, [user, vendorProfile?.id, items.length]);



  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = q
      ? items.filter(
          (i) =>
            i.card_name.toLowerCase().includes(q) ||
            (i.set_name ?? "").toLowerCase().includes(q) ||
            (i.source ?? "").toLowerCase().includes(q),
        )
      : items;
    if (eventScope !== "all") {
      base = base.filter((i) => eventMemberships.get(i.id)?.has(eventScope));
    }
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
  }, [items, search, sortKey, sortDir, eventScope, eventMemberships]);


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

  const updateListing = async (item: InventoryItem, patch: Partial<Pick<InventoryItem, "listing_status" | "list_price">>) => {
    const prev = items;
    const nextStatus = patch.listing_status ?? item.listing_status;
    const nowListing = nextStatus === "for_sale" && item.listing_status !== "for_sale";
    setItems((cur) =>
      cur.map((x) =>
        x.id === item.id
          ? {
              ...x,
              ...patch,
            }
          : x,
      ),
    );
    const update: Record<string, unknown> = { ...patch };
    if (nowListing) update.listed_at = new Date().toISOString();
    const { error } = await supabase.from("deal_list_items").update(update).eq("id", item.id);
    if (error) {
      setItems(prev);
      toast({ title: "Failed to update listing", description: error.message, variant: "destructive" });
    }
  };

  const openFeature = (ids: string[], label?: string) => {
    if (ids.length === 0) return;
    setFeatureItemIds(ids);
    setFeatureLabel(label);
  };

  const statusBadgeClass = (s: InventoryItem["listing_status"]) => {
    switch (s) {
      case "for_sale": return "border-emerald-500/40 text-emerald-600 dark:text-emerald-400";
      case "sold": return "border-muted text-muted-foreground line-through";
      case "hold": return "border-amber-500/40 text-amber-600 dark:text-amber-400";
      default: return "border-muted text-muted-foreground";
    }
  };

  const openAdd = () => {
    setEditingItem(undefined);
    setItemDialogOpen(true);
  };

  const openEdit = (i: InventoryItem) => {
    setEditingItem({
      id: i.id,
      card_name: i.card_name,
      set_name: i.set_name,
      card_number: i.card_number,
      rarity: i.rarity,
      image_url: i.image_url,
      game: i.game,
      condition: i.condition,
      quantity: i.quantity,
      purchase_price: i.purchase_price,
      shipping_cost: i.shipping_cost,
      fees: i.fees,
      target_sell_price: i.target_sell_price,
      source: i.source,
      bought_at: i.bought_at,
      notes: i.notes,
    });
    setItemDialogOpen(true);
  };

  const requestDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    const label =
      ids.length === 1
        ? items.find((x) => x.id === ids[0])?.card_name ?? "this item"
        : `${ids.length} items`;
    setConfirmDelete({ ids, label });
  };

  const performDelete = async () => {
    if (!confirmDelete) return;
    const { ids } = confirmDelete;
    const prev = items;
    setItems((cur) => cur.filter((x) => !ids.includes(x.id)));
    setSelected((cur) => {
      const next = new Set(cur);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setConfirmDelete(null);
    const { error } = await supabase.from("deal_list_items").delete().in("id", ids);
    if (error) {
      setItems(prev);
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Deleted ${ids.length} item${ids.length > 1 ? "s" : ""}` });
    }
  };

  const removeFromEvent = async (ids: string[]) => {
    if (eventScope === "all" || ids.length === 0 || !vendorProfile?.id) return;
    const { error } = await supabase
      .from("vendor_event_inventory")
      .delete()
      .eq("vendor_id", vendorProfile.id)
      .eq("event_id", eventScope)
      .in("item_id", ids);
    if (error) {
      toast({ title: "Failed to remove from event", description: error.message, variant: "destructive" });
      return;
    }
    setEventMemberships((cur) => {
      const next = new Map(cur);
      for (const id of ids) {
        const s = new Set(next.get(id) ?? []);
        s.delete(eventScope);
        next.set(id, s);
      }
      return next;
    });
    setSelected(new Set());
    toast({ title: `Removed ${ids.length} item${ids.length > 1 ? "s" : ""} from event` });
  };

  const reloadEventMemberships = async () => {
    if (!vendorProfile?.id) return;
    const { data: picks } = await supabase
      .from("vendor_event_inventory")
      .select("event_id, item_id")
      .eq("vendor_id", vendorProfile.id);
    const map = new Map<string, Set<string>>();
    for (const p of picks ?? []) {
      if (!map.has(p.item_id)) map.set(p.item_id, new Set());
      map.get(p.item_id)!.add(p.event_id);
    }
    setEventMemberships(map);
  };

  const currentEventLabel =
    eventScope === "all" ? null : eventOptions.find((e) => e.id === eventScope)?.title ?? null;



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
            {eventOptions.length > 0 && (
              <Select value={eventScope} onValueChange={(v) => { setEventScope(v); setSelected(new Set()); }}>
                <SelectTrigger className="w-[200px]" aria-label="Filter by event">
                  <SelectValue placeholder="Scope: All inventory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All inventory</SelectItem>
                  {eventOptions.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={openAdd} variant="default">
              <Plus className="h-4 w-4 mr-2" />
              Add item
            </Button>

            {(() => {
              const visible = filtered;
              const selArr = visible.filter((i) => selected.has(i.id));
              const target = selArr.length > 0 ? selArr : visible;
              const unprinted = target.filter((i) => !i.label_printed_at);
              const printed = target.filter((i) => i.label_printed_at);
              const openWith = (ids: string[], source: string) => {
                if (ids.length === 0) {
                  toast({ title: "Nothing to print", description: "No matching rows.", variant: "destructive" });
                  return;
                }
                setPrintItemIds(ids);
                setPrintSource(source);
                setPrintOpen(true);
              };
              const primarySource = selArr.length > 0 ? "selection" : "all_visible";
              return (
                <div className="inline-flex rounded-md shadow-sm">
                  <Button
                    variant="default"
                    onClick={() => openWith(target.map((i) => i.id), primarySource)}
                    disabled={visible.length === 0}
                    className="rounded-r-none"
                    title={selArr.length > 0 ? `Print ${selArr.length} selected` : "Print all visible"}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print labels{selArr.length > 0 ? ` (${selArr.length})` : ""}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="default" className="rounded-l-none border-l border-primary-foreground/20 px-2" aria-label="More print options">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuItem onClick={() => openWith(unprinted.map((i) => i.id), "unprinted")} disabled={unprinted.length === 0}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print unprinted ({unprinted.length})
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openWith(printed.map((i) => i.id), "reprint_printed")} disabled={printed.length === 0}>
                        <RotateCw className="h-4 w-4 mr-2" />
                        Reprint already-printed ({printed.length})
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openWith(visible.filter((i) => i.label_printed_at).map((i) => i.id), "reprint_view")}
                        disabled={visible.every((i) => !i.label_printed_at)}
                      >
                        <RotateCw className="h-4 w-4 mr-2" />
                        Reprint all printed in view
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                        <HistoryIcon className="h-4 w-4 mr-2" />
                        View print history
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })()}
            {selected.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => openFeature(Array.from(selected))}
                  title={`Feature ${selected.size} selected item(s) at events`}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Feature ({selected.size})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAdjustItemIds(Array.from(selected))}
                  title={`Adjust stock for ${selected.size} selected item(s)`}
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Adjust stock ({selected.size})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setAdjHistoryItemIds(Array.from(selected)); setAdjHistoryOpen(true); }}
                  title="View adjustment history for selected items"
                >
                  <HistoryIcon className="h-4 w-4 mr-2" />
                  Adj. history
                </Button>
                {eventScope !== "all" && (
                  <Button
                    variant="outline"
                    onClick={() => removeFromEvent(Array.from(selected))}
                    title={`Remove ${selected.size} item(s) from ${currentEventLabel ?? "event"}`}
                  >
                    <CalendarX className="h-4 w-4 mr-2" />
                    Remove from event
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => requestDelete(Array.from(selected))}
                  className="text-destructive hover:text-destructive"
                  title={`Delete ${selected.size} item(s)`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selected.size})
                </Button>
              </>
            )}
            <Button variant="outline" asChild>
              <Link to="/deal-list">Deal Pipeline</Link>
            </Button>
          </div>
        </div>

        {currentEventLabel && (
          <div className="mb-4 -mt-2 text-sm text-muted-foreground">
            Showing items featured at <span className="font-medium text-foreground">{currentEventLabel}</span>. Use “Add item” to create inventory, then feature it here.
          </div>
        )}

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
                    <TableHead className="w-[200px]">Listing</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i) => {
                    const { invested, projected, profit, margin } = calc(i);
                    const positive = profit >= 0;
                    return (
                      <TableRow key={i.id} data-state={selected.has(i.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(i.id)}
                            onCheckedChange={(v) => {
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (v) next.add(i.id); else next.delete(i.id);
                                return next;
                              });
                            }}
                            aria-label={`Select ${i.card_name}`}
                          />
                        </TableCell>
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
                                {i.listing_status === "for_sale" && (
                                  <BadgeUi variant="outline" className={`text-[10px] py-0 px-1.5 ${statusBadgeClass(i.listing_status)}`}>
                                    <Store className="h-2.5 w-2.5 mr-0.5" />
                                    Listed
                                  </BadgeUi>
                                )}
                                {i.label_printed_at && (
                                  <BadgeUi
                                    variant="outline"
                                    className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                    title={`Last printed ${new Date(i.label_printed_at).toLocaleString()}${i.label_print_count > 1 ? ` · ${i.label_print_count} prints` : ""}`}
                                  >
                                    <Printer className="h-2.5 w-2.5 mr-0.5" />
                                    Printed{i.label_print_count > 1 ? ` ×${i.label_print_count}` : ""}
                                  </BadgeUi>
                                )}
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
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Select
                              value={i.listing_status}
                              onValueChange={(v) =>
                                updateListing(i, { listing_status: v as InventoryItem["listing_status"] })
                              }
                            >
                              <SelectTrigger className="h-8 w-[110px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="private">Private</SelectItem>
                                <SelectItem value="for_sale">For sale</SelectItem>
                                <SelectItem value="hold">Hold</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Price"
                              defaultValue={i.list_price ?? ""}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                const val = raw === "" ? null : Number(raw);
                                if (val === i.list_price) return;
                                updateListing(i, { list_price: val });
                              }}
                              className="h-8 w-[80px] text-xs"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Item actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(i)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit item
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openFeature([i.id], i.card_name)}>
                                <CalendarPlus className="h-4 w-4 mr-2" />
                                Feature at event…
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAdjustItemIds([i.id])}>
                                <ClipboardCheck className="h-4 w-4 mr-2" />
                                Adjust stock…
                              </DropdownMenuItem>
                              {eventScope !== "all" && (
                                <DropdownMenuItem onClick={() => removeFromEvent([i.id])}>
                                  <CalendarX className="h-4 w-4 mr-2" />
                                  Remove from this event
                                </DropdownMenuItem>
                              )}
                              {i.tcgplayer_url && (
                                <DropdownMenuItem asChild>
                                  <a href={i.tcgplayer_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View on TCGplayer
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => requestDelete([i.id])}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete item
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <PrintLabelsDialog
        open={printOpen}
        onOpenChange={(v) => {
          setPrintOpen(v);
          if (!v) setPrintItemIds(null);
        }}
        items={(printItemIds
          ? items.filter((i) => printItemIds.includes(i.id))
          : selected.size > 0
            ? filtered.filter((i) => selected.has(i.id))
            : filtered
        ).map((i) => ({
          id: i.id,
          card_name: i.card_name,
          set_name: i.set_name,
          card_number: i.card_number,
          condition: i.condition,
          purchase_price: i.purchase_price,
          target_sell_price: i.target_sell_price,
          quantity: i.quantity,
          label_printed_at: i.label_printed_at,
          label_print_count: i.label_print_count,
        }))}
        onPrinted={async (printedIds, meta) => {
          if (printedIds.length === 0) return;
          const nowIso = new Date().toISOString();
          const current = items.filter((i) => printedIds.includes(i.id));
          setItems((prev) =>
            prev.map((i) =>
              printedIds.includes(i.id)
                ? { ...i, label_printed_at: nowIso, label_print_count: (i.label_print_count ?? 0) + 1 }
                : i,
            ),
          );
          await Promise.all(
            current.map((i) =>
              supabase
                .from("deal_list_items")
                .update({
                  label_printed_at: nowIso,
                  label_print_count: (i.label_print_count ?? 0) + 1,
                })
                .eq("id", i.id),
            ),
          );
          if (user) {
            await supabase.from("label_print_audit").insert({
              user_id: user.id,
              action: meta.reprintCount === printedIds.length ? "reprint" : meta.reprintCount > 0 ? "mixed" : "print",
              source: printSource,
              preset: meta.preset,
              copies_per_item: meta.copies,
              per_quantity: meta.perQuantity,
              item_ids: printedIds,
              item_count: printedIds.length,
              label_count: meta.labelCount,
              reprint_count: meta.reprintCount,
              filter_context: {
                search: search || null,
                sort: `${sortKey}:${sortDir}`,
              },
            });
          }
        }}
      />

      <PrintHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />

      <FeatureAtEventDialog
        open={featureItemIds !== null}
        onOpenChange={(v) => {
          if (!v) {
            setFeatureItemIds(null);
            setFeatureLabel(undefined);
            reloadEventMemberships();
          }
        }}
        itemIds={featureItemIds ?? []}
        itemLabel={featureLabel}
      />

      <InventoryItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        initialValues={editingItem}
        onSaved={() => {
          loadInventory();
        }}
      />

      <StockAdjustmentDialog
        open={adjustItemIds !== null}
        onOpenChange={(v) => { if (!v) setAdjustItemIds(null); }}
        items={(adjustItemIds ? items.filter((i) => adjustItemIds.includes(i.id)) : []).map<AdjustableItem>((i) => ({
          id: i.id,
          card_name: i.card_name,
          set_name: i.set_name,
          card_number: i.card_number,
          condition: i.condition,
          quantity: i.quantity,
        }))}
        onApplied={(updated) => {
          setItems((cur) => cur.map((x) => (updated.has(x.id) ? { ...x, quantity: updated.get(x.id)! } : x)));
          setSelected(new Set());
        }}
      />


      <AlertDialog open={confirmDelete !== null} onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the inventory record, listing, and any event features. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Inventory;
