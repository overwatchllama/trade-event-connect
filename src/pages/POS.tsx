import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Receipt, DollarSign, TrendingUp, TrendingDown, ArrowDownUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

type Kind = "buy" | "sell" | "trade";
type Side = "buy" | "sell";

interface DraftLine {
  tempId: string;
  side: Side;
  card_name: string;
  set_name?: string;
  card_number?: string;
  condition?: string;
  quantity: number;
  unit_price?: number;
  unit_cost?: number;
  deal_list_item_id?: string;
  image_url?: string;
}

interface EventOption {
  kind: "public" | "personal";
  id: string;
  label: string;
  date: string;
}

interface LedgerRow {
  id: string;
  kind: Kind;
  occurred_at: string;
  total: number;
  subtotal: number;
  fees: number;
  customer_label: string | null;
  payment_method: string | null;
  event_id: string | null;
  personal_event_id: string | null;
  event_title?: string;
  item_count?: number;
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const POS = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("tab") ?? "new";

  const [eventOptions, setEventOptions] = useState<EventOption[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState<string>("none");

  // New transaction state
  const [kind, setKind] = useState<Kind>("sell");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerLabel, setCustomerLabel] = useState("");
  const [fees, setFees] = useState<string>("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [saving, setSaving] = useState(false);

  // Ledger state
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // P&L state
  const [pnlEventKey, setPnlEventKey] = useState<string>("none");
  const [pnl, setPnl] = useState<any>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [topItems, setTopItems] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Load events the user has any presence at
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [personal, vending, organizing] = await Promise.all([
        supabase
          .from("vendor_personal_events")
          .select("id, title, date")
          .eq("user_id", user.id)
          .order("date", { ascending: false }),
        supabase
          .from("vendor_applications")
          .select("event_id, events(id, title, date)")
          .eq("user_id", user.id),
        supabase
          .from("events")
          .select("id, title, date")
          .eq("organizer_id", user.id)
          .order("date", { ascending: false }),
      ]);

      const opts: EventOption[] = [];
      (organizing.data ?? []).forEach((e: any) =>
        opts.push({ kind: "public", id: e.id, label: e.title, date: e.date })
      );
      (vending.data ?? []).forEach((row: any) => {
        if (row.events && !opts.some((o) => o.id === row.events.id)) {
          opts.push({ kind: "public", id: row.events.id, label: row.events.title, date: row.events.date });
        }
      });
      (personal.data ?? []).forEach((e: any) =>
        opts.push({ kind: "personal", id: e.id, label: `${e.title} (private)`, date: e.date })
      );

      opts.sort((a, b) => (a.date < b.date ? 1 : -1));
      setEventOptions(opts);
    })();
  }, [user]);

  // Lines helpers
  const addLine = (side: Side) => {
    setLines((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), side, card_name: "", quantity: 1 },
    ]);
  };
  const updateLine = (id: string, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.tempId === id ? { ...l, ...patch } : l)));
  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.tempId !== id));

  // Barcode scan → fetch inventory row and add a linked sell line.
  const [scanValue, setScanValue] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const handleScan = async (raw: string) => {
    const id = raw.trim();
    if (!id) return;
    setScanBusy(true);
    try {
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let query = supabase
        .from("deal_list_items")
        .select("id, card_name, set_name, card_number, condition, target_sell_price, purchase_price, image_url, listing_status")
        .eq("user_id", user?.id ?? "")
        .eq("status", "bought")
        .limit(1);
      query = uuidRe.test(id) ? query.eq("id", id) : query.ilike("id", `${id}%`);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) { toast.error("No inventory found for that label"); return; }
      if (data.listing_status === "sold") {
        toast.warning(`${data.card_name} is already marked sold`);
      }
      setLines((prev) => [
        ...prev,
        {
          tempId: crypto.randomUUID(),
          side: "sell",
          card_name: data.card_name,
          set_name: data.set_name ?? undefined,
          card_number: data.card_number ?? undefined,
          condition: data.condition ?? undefined,
          quantity: 1,
          unit_price: data.target_sell_price ?? undefined,
          unit_cost: data.purchase_price ?? undefined,
          deal_list_item_id: data.id,
          image_url: data.image_url ?? undefined,
        },
      ]);
      toast.success(`Added ${data.card_name}`);
      setScanValue("");
    } catch (e: any) {
      toast.error(e?.message ?? "Scan failed");
    } finally {
      setScanBusy(false);
    }
  };

  // Auto-create first line when kind changes
  useEffect(() => {
    if (lines.length === 0) {
      if (kind === "sell") addLine("sell");
      else if (kind === "buy") addLine("buy");
      else {
        setLines([
          { tempId: crypto.randomUUID(), side: "sell", card_name: "", quantity: 1 },
          { tempId: crypto.randomUUID(), side: "buy", card_name: "", quantity: 1 },
        ]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const totals = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    for (const l of lines) {
      if (l.side === "sell") revenue += (l.unit_price ?? 0) * (l.quantity || 0);
      else cost += (l.unit_cost ?? 0) * (l.quantity || 0);
    }
    const feesNum = Number(fees || 0);
    const subtotal = revenue - cost;
    return { revenue, cost, subtotal, fees: feesNum, total: subtotal - feesNum };
  }, [lines, fees]);

  const resetDraft = () => {
    setLines([]);
    setCustomerLabel("");
    setNotes("");
    setFees("0");
  };

  const saveTransaction = async () => {
    if (!user) return;
    const valid = lines.filter((l) => l.card_name.trim().length > 0);
    if (valid.length === 0) {
      toast.error("Add at least one line with a card name");
      return;
    }
    if (kind === "sell" && !valid.some((l) => l.side === "sell" && (l.unit_price ?? 0) > 0)) {
      toast.error("A sale needs at least one sell line with a price");
      return;
    }
    if (kind === "buy" && !valid.some((l) => l.side === "buy" && (l.unit_cost ?? 0) > 0)) {
      toast.error("A buy needs at least one buy line with a cost");
      return;
    }

    setSaving(true);
    try {
      const eventOpt = eventOptions.find(
        (e) => `${e.kind}:${e.id}` === selectedEventKey
      );

      const subtotal = totals.subtotal;
      const total = totals.total;

      const { data: tx, error: txErr } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          kind,
          event_id: eventOpt?.kind === "public" ? eventOpt.id : null,
          personal_event_id: eventOpt?.kind === "personal" ? eventOpt.id : null,
          customer_label: customerLabel || null,
          payment_method: paymentMethod || null,
          subtotal,
          fees: Number(fees || 0),
          total,
          notes: notes || null,
        })
        .select()
        .single();

      if (txErr) throw txErr;

      const rows = valid.map((l) => ({
        transaction_id: tx.id,
        side: kind === "buy" ? "buy" : kind === "sell" ? "sell" : l.side,
        card_name: l.card_name.trim(),
        set_name: l.set_name || null,
        card_number: l.card_number || null,
        condition: l.condition || null,
        quantity: l.quantity || 1,
        unit_price: l.unit_price ?? null,
        unit_cost: l.unit_cost ?? null,
        deal_list_item_id: l.deal_list_item_id || null,
        image_url: l.image_url || null,
      }));

      const { error: itemErr } = await supabase.from("transaction_items").insert(rows);
      if (itemErr) throw itemErr;

      // Mark linked inventory items as sold (only sell-side lines with a link).
      const soldLinks = valid.filter((l) => l.side === "sell" && l.deal_list_item_id);
      for (const l of soldLinks) {
        await supabase
          .from("deal_list_items")
          .update({
            listing_status: "sold",
            sold_at: new Date().toISOString(),
            sold_price: l.unit_price ?? null,
            sold_channel: "pos",
          })
          .eq("id", l.deal_list_item_id!);
      }

      toast.success(
        `${kind === "buy" ? "Buy" : kind === "sell" ? "Sale" : "Trade"} saved · ${fmt(total)}`
      );
      resetDraft();
      // Refresh ledger if on that tab
      if (activeTab === "ledger") loadLedger();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to save transaction");
    } finally {
      setSaving(false);
    }
  };

  // Ledger load
  const loadLedger = async () => {
    if (!user) return;
    setLedgerLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, kind, occurred_at, total, subtotal, fees, customer_label, payment_method, event_id, personal_event_id, events(title), vendor_personal_events(title), transaction_items(count)")
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows: LedgerRow[] = (data ?? []).map((r: any) => ({
        id: r.id,
        kind: r.kind,
        occurred_at: r.occurred_at,
        total: Number(r.total),
        subtotal: Number(r.subtotal),
        fees: Number(r.fees),
        customer_label: r.customer_label,
        payment_method: r.payment_method,
        event_id: r.event_id,
        personal_event_id: r.personal_event_id,
        event_title: r.events?.title ?? r.vendor_personal_events?.title ?? null,
        item_count: r.transaction_items?.[0]?.count ?? 0,
      }));
      setLedger(rows);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to load ledger");
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "ledger" && user) loadLedger();
  }, [activeTab, user]);

  const deleteTransaction = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      setLedger((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // P&L load
  const loadPnl = async (key: string) => {
    if (!user || key === "none") {
      setPnl(null);
      setTopItems([]);
      return;
    }
    setPnlLoading(true);
    try {
      const opt = eventOptions.find((e) => `${e.kind}:${e.id}` === key);
      if (!opt) return;
      const { data, error } = await supabase.rpc("get_event_pnl", {
        p_event_id: opt.kind === "public" ? opt.id : null,
        p_personal_event_id: opt.kind === "personal" ? opt.id : null,
      });
      if (error) throw error;
      setPnl(data);

      // Top items by revenue
      const filterCol = opt.kind === "public" ? "event_id" : "personal_event_id";
      const { data: items } = await supabase
        .from("transaction_items")
        .select("card_name, quantity, unit_price, transactions!inner(user_id, " + filterCol + ")")
        .eq("transactions.user_id", user.id)
        .eq(`transactions.${filterCol}`, opt.id)
        .eq("side", "sell")
        .limit(500);
      const agg = new Map<string, { revenue: number; qty: number }>();
      (items ?? []).forEach((it: any) => {
        const rev = Number(it.unit_price ?? 0) * Number(it.quantity ?? 0);
        const cur = agg.get(it.card_name) ?? { revenue: 0, qty: 0 };
        cur.revenue += rev;
        cur.qty += Number(it.quantity ?? 0);
        agg.set(it.card_name, cur);
      });
      const top = Array.from(agg.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopItems(top);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to load P&L");
    } finally {
      setPnlLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "pnl") loadPnl(pnlEventKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pnlEventKey, activeTab]);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Point of Sale
          </h1>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setParams({ tab: v }, { replace: true })}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="new">New Transaction</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="pnl">Event P&amp;L</TabsTrigger>
          </TabsList>

          {/* NEW TRANSACTION */}
          <TabsContent value="new" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transaction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block">Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["sell", "buy", "trade"] as Kind[]).map((k) => (
                        <Button
                          key={k}
                          type="button"
                          variant={kind === k ? "default" : "outline"}
                          onClick={() => {
                            setKind(k);
                            setLines([]);
                          }}
                          className="capitalize"
                        >
                          {k === "sell" && <TrendingUp className="h-4 w-4 mr-1" />}
                          {k === "buy" && <TrendingDown className="h-4 w-4 mr-1" />}
                          {k === "trade" && <ArrowDownUp className="h-4 w-4 mr-1" />}
                          {k}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Event</Label>
                    <Select value={selectedEventKey} onValueChange={setSelectedEventKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="No event" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No event</SelectItem>
                        {eventOptions.map((e) => (
                          <SelectItem key={`${e.kind}:${e.id}`} value={`${e.kind}:${e.id}`}>
                            {e.label} · {format(new Date(e.date), "MMM d, yyyy")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Payment</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="venmo">Venmo</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="zelle">Zelle</SelectItem>
                        <SelectItem value="trade">Trade only</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Customer (optional)</Label>
                    <Input
                      value={customerLabel}
                      onChange={(e) => setCustomerLabel(e.target.value)}
                      placeholder="Walk-up · table 7 · regular"
                    />
                  </div>
                </div>

                <Separator />

                {/* Lines */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Items</Label>
                    {kind === "trade" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => addLine("sell")}>
                          <Plus className="h-3 w-3 mr-1" /> They get
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => addLine("buy")}>
                          <Plus className="h-3 w-3 mr-1" /> You get
                        </Button>
                      </div>
                    )}
                    {kind !== "trade" && (
                      <Button size="sm" variant="outline" onClick={() => addLine(kind as Side)}>
                        <Plus className="h-3 w-3 mr-1" /> Add line
                      </Button>
                    )}
                  </div>

                  {lines.length === 0 && (
                    <p className="text-sm text-muted-foreground">No lines yet.</p>
                  )}

                  {lines.map((l) => (
                    <div
                      key={l.tempId}
                      className="grid grid-cols-12 gap-2 items-start p-2 rounded-md border bg-card"
                    >
                      <div className="col-span-12 sm:col-span-5 space-y-1">
                        {kind === "trade" && (
                          <Badge variant={l.side === "sell" ? "default" : "secondary"} className="mb-1">
                            {l.side === "sell" ? "Customer gets" : "You get"}
                          </Badge>
                        )}
                        <Input
                          placeholder="Card name *"
                          value={l.card_name}
                          onChange={(e) => updateLine(l.tempId, { card_name: e.target.value })}
                        />
                        <Input
                          placeholder="Set (optional)"
                          value={l.set_name ?? ""}
                          onChange={(e) => updateLine(l.tempId, { set_name: e.target.value })}
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          value={l.quantity}
                          onChange={(e) =>
                            updateLine(l.tempId, { quantity: Math.max(1, Number(e.target.value || 1)) })
                          }
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">
                          {l.side === "sell" ? "Price" : "Cost"}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder="0.00"
                          value={l.side === "sell" ? (l.unit_price ?? "") : (l.unit_cost ?? "")}
                          onChange={(e) => {
                            const v = e.target.value === "" ? undefined : Number(e.target.value);
                            updateLine(l.tempId, l.side === "sell" ? { unit_price: v } : { unit_cost: v });
                          }}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2 flex items-end justify-end h-full">
                        <div className="text-sm font-medium">
                          {fmt(
                            (l.side === "sell" ? l.unit_price ?? 0 : l.unit_cost ?? 0) *
                              (l.quantity || 0)
                          )}
                        </div>
                      </div>
                      <div className="col-span-1 flex items-end justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(l.tempId)}
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block">Fees (cash app / processing)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={fees}
                      onChange={(e) => setFees(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Notes</Label>
                    <Textarea
                      rows={1}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Revenue</span><span>{fmt(totals.revenue)}</span></div>
                  <div className="flex justify-between"><span>Cost</span><span>−{fmt(totals.cost)}</span></div>
                  <div className="flex justify-between"><span>Fees</span><span>−{fmt(totals.fees)}</span></div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Net</span>
                    <span className={totals.total >= 0 ? "text-foreground" : "text-destructive"}>
                      {fmt(totals.total)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetDraft} disabled={saving}>Clear</Button>
                  <Button onClick={saveTransaction} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save transaction
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEDGER */}
          <TabsContent value="ledger" className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Most recent {ledger.length} transactions
              </p>
              <Button variant="outline" size="sm" onClick={loadLedger} disabled={ledgerLoading}>
                {ledgerLoading && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                Refresh
              </Button>
            </div>

            {ledger.length === 0 && !ledgerLoading && (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
                No transactions yet. Save one in the New Transaction tab.
              </CardContent></Card>
            )}

            <div className="space-y-2">
              {ledger.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <Badge variant={r.kind === "sell" ? "default" : r.kind === "buy" ? "secondary" : "outline"} className="capitalize">
                      {r.kind}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {r.event_title ?? "No event"} · {r.item_count} item{r.item_count === 1 ? "" : "s"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {format(new Date(r.occurred_at), "MMM d, yyyy h:mm a")}
                        {r.customer_label ? ` · ${r.customer_label}` : ""}
                        {r.payment_method ? ` · ${r.payment_method}` : ""}
                      </div>
                    </div>
                    <div className={`text-right font-semibold ${r.total >= 0 ? "" : "text-destructive"}`}>
                      {fmt(r.total)}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteTransaction(r.id)} aria-label="Delete transaction">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* P&L */}
          <TabsContent value="pnl" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pick a show</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={pnlEventKey} onValueChange={setPnlEventKey}>
                  <SelectTrigger><SelectValue placeholder="Select an event" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— select —</SelectItem>
                    {eventOptions.map((e) => (
                      <SelectItem key={`${e.kind}:${e.id}`} value={`${e.kind}:${e.id}`}>
                        {e.label} · {format(new Date(e.date), "MMM d, yyyy")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {pnlLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}

            {pnl && !pnlLoading && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    { label: "Revenue", value: Number(pnl.revenue), icon: TrendingUp },
                    { label: "COGS", value: Number(pnl.cogs), icon: TrendingDown },
                    { label: "Fees", value: Number(pnl.fees), icon: DollarSign },
                    { label: "Buys (cash out)", value: Number(pnl.buys), icon: TrendingDown },
                    { label: "Net profit", value: Number(pnl.net), icon: DollarSign, highlight: true },
                  ].map((k) => (
                    <Card key={k.label} className={k.highlight ? "border-primary" : ""}>
                      <CardContent className="py-4">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <k.icon className="h-3 w-3" /> {k.label}
                        </div>
                        <div className={`text-xl font-bold mt-1 ${k.highlight && k.value < 0 ? "text-destructive" : ""}`}>
                          {fmt(k.value)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top items by revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topItems.length === 0 && (
                      <p className="text-sm text-muted-foreground">No sales recorded.</p>
                    )}
                    <div className="space-y-2">
                      {topItems.map((t) => (
                        <div key={t.name} className="flex justify-between text-sm">
                          <span className="truncate">{t.name} <span className="text-muted-foreground">× {t.qty}</span></span>
                          <span className="font-medium">{fmt(t.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="text-xs text-muted-foreground">
                  {pnl.tx_count} transaction{pnl.tx_count === 1 ? "" : "s"} for this show.
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default POS;
