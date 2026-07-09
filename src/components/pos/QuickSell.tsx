import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Minus, Plus, Search, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

interface EventOption {
  kind: "public" | "personal";
  id: string;
  label: string;
}

interface CartLine {
  tempId: string;
  card_name: string;
  set_name?: string;
  card_number?: string;
  condition?: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  deal_list_item_id?: string;
  image_url?: string;
}

interface Suggestion {
  id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  condition: string | null;
  target_sell_price: number | null;
  purchase_price: number | null;
  image_url: string | null;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TENDERS = ["cash", "card", "venmo", "zelle", "other"] as const;
type Tender = (typeof TENDERS)[number];

interface Props {
  eventOptions: EventOption[];
  onSaved?: () => void;
}

const QuickSell = ({ eventOptions, onSaved }: Props) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [saving, setSaving] = useState<Tender | null>(null);
  const [selectedEventKey, setSelectedEventKey] = useState<string>("none");
  const [customerLabel, setCustomerLabel] = useState("");
  const scanRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  // Debounced search for name matches.
  useEffect(() => {
    const q = query.trim();
    if (!user || q.length < 2 || uuidRe.test(q)) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("deal_list_items")
        .select(
          "id, card_name, set_name, card_number, condition, target_sell_price, purchase_price, image_url"
        )
        .eq("user_id", user.id)
        .eq("status", "bought")
        .neq("listing_status", "sold")
        .ilike("card_name", `%${q}%`)
        .limit(8);
      if (!cancelled) setSuggestions((data as Suggestion[]) ?? []);
      setSearching(false);
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, user]);

  const addFromInventory = (row: Suggestion) => {
    setCart((prev) => {
      // Merge into existing line if same inventory row already scanned.
      const existing = prev.find((l) => l.deal_list_item_id === row.id);
      if (existing) {
        return prev.map((l) =>
          l.tempId === existing.tempId
            ? { ...l, quantity: l.quantity + 1 }
            : l
        );
      }
      return [
        ...prev,
        {
          tempId: crypto.randomUUID(),
          card_name: row.card_name,
          set_name: row.set_name ?? undefined,
          card_number: row.card_number ?? undefined,
          condition: row.condition ?? undefined,
          quantity: 1,
          unit_price: Number(row.target_sell_price ?? 0),
          unit_cost: row.purchase_price ?? undefined,
          deal_list_item_id: row.id,
          image_url: row.image_url ?? undefined,
        },
      ];
    });
    setQuery("");
    setSuggestions([]);
    scanRef.current?.focus();
  };

  const addManual = (name: string) => {
    setCart((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        card_name: name,
        quantity: 1,
        unit_price: 0,
      },
    ]);
    setQuery("");
    setSuggestions([]);
    scanRef.current?.focus();
  };

  const handleScanSubmit = async () => {
    const raw = query.trim();
    if (!raw || !user) return;
    // Try inventory lookup by UUID or ID prefix (Code 128 labels).
    let q = supabase
      .from("deal_list_items")
      .select(
        "id, card_name, set_name, card_number, condition, target_sell_price, purchase_price, image_url"
      )
      .eq("user_id", user.id)
      .eq("status", "bought")
      .limit(1);
    q = uuidRe.test(raw) ? q.eq("id", raw) : q.ilike("id", `${raw}%`);
    const { data } = await q.maybeSingle();
    if (data) {
      addFromInventory(data as Suggestion);
      return;
    }
    if (suggestions.length > 0) {
      addFromInventory(suggestions[0]);
      return;
    }
    // Fallback: add a manual line named after the typed text.
    addManual(raw);
    toast.message("Added manual line — set the price before tendering");
  };

  const updateLine = (id: string, patch: Partial<CartLine>) =>
    setCart((prev) => prev.map((l) => (l.tempId === id ? { ...l, ...patch } : l)));
  const removeLine = (id: string) =>
    setCart((prev) => prev.filter((l) => l.tempId !== id));

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.unit_price * l.quantity, 0),
    [cart]
  );
  const itemCount = useMemo(
    () => cart.reduce((s, l) => s + l.quantity, 0),
    [cart]
  );

  const tender = async (method: Tender) => {
    if (!user) return;
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (cart.some((l) => l.unit_price <= 0)) {
      toast.error("Every line needs a price above zero");
      return;
    }
    setSaving(method);
    try {
      const eventOpt = eventOptions.find(
        (e) => `${e.kind}:${e.id}` === selectedEventKey
      );
      const { data: tx, error: txErr } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          kind: "sell",
          event_id: eventOpt?.kind === "public" ? eventOpt.id : null,
          personal_event_id:
            eventOpt?.kind === "personal" ? eventOpt.id : null,
          customer_label: customerLabel || null,
          payment_method: method,
          tender_breakdown: { splits: [{ method, amount: total }] },
          subtotal: total,
          fees: 0,
          total,
          notes: null,
        })
        .select()
        .single();
      if (txErr) throw txErr;

      const rows = cart.map((l) => ({
        transaction_id: tx.id,
        side: "sell" as const,
        card_name: l.card_name.trim(),
        set_name: l.set_name || null,
        card_number: l.card_number || null,
        condition: l.condition || null,
        quantity: l.quantity,
        unit_price: l.unit_price,
        unit_cost: l.unit_cost ?? null,
        deal_list_item_id: l.deal_list_item_id || null,
        image_url: l.image_url || null,
      }));
      const { error: itemErr } = await supabase
        .from("transaction_items")
        .insert(rows);
      if (itemErr) throw itemErr;

      // Stamp inventory rows as sold in one pass per line (respects RLS on the row).
      const soldLinks = cart.filter((l) => l.deal_list_item_id);
      for (const l of soldLinks) {
        await supabase
          .from("deal_list_items")
          .update({
            listing_status: "sold",
            sold_at: new Date().toISOString(),
            sold_price: l.unit_price,
            sold_channel: "pos",
          })
          .eq("id", l.deal_list_item_id!);
      }

      toast.success(`Sale saved · ${fmt(total)} · ${method}`);
      setCart([]);
      setCustomerLabel("");
      setQuery("");
      setSuggestions([]);
      onSaved?.();
      scanRef.current?.focus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to save sale");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      {/* LEFT: scan + suggestions + cart */}
      <div className="space-y-3">
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                ref={scanRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleScanSubmit();
                  }
                }}
                placeholder="Scan label or type card name…"
                className="h-11 text-base"
              />
              {searching && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {suggestions.length > 0 && (
              <div className="border rounded-md divide-y max-h-64 overflow-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addFromInventory(s)}
                    className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.card_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[s.set_name, s.card_number, s.condition]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </div>
                    <div className="text-sm font-mono">
                      {s.target_sell_price != null
                        ? fmt(Number(s.target_sell_price))
                        : "—"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Cart is empty. Scan a label or search a card to begin.
              </div>
            ) : (
              <ul className="divide-y">
                {cart.map((l) => (
                  <li
                    key={l.tempId}
                    className="p-3 flex items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{l.card_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[l.set_name, l.card_number, l.condition]
                          .filter(Boolean)
                          .join(" · ") ||
                          (l.deal_list_item_id ? "Inventory" : "Manual line")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() =>
                          updateLine(l.tempId, {
                            quantity: Math.max(1, l.quantity - 1),
                          })
                        }
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-6 text-center text-sm font-mono">
                        {l.quantity}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() =>
                          updateLine(l.tempId, { quantity: l.quantity + 1 })
                        }
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={l.unit_price === 0 ? "" : l.unit_price}
                      onChange={(e) =>
                        updateLine(l.tempId, {
                          unit_price: Number(e.target.value || 0),
                        })
                      }
                      className="w-24 h-8 text-right font-mono"
                      placeholder="0.00"
                    />
                    <div className="w-20 text-right font-mono text-sm">
                      {fmt(l.unit_price * l.quantity)}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLine(l.tempId)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: totals + tender */}
      <div className="space-y-3">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">
                Total
              </div>
              <div className="text-4xl font-bold font-mono tabular-nums">
                {fmt(total)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {itemCount} item{itemCount === 1 ? "" : "s"} · {cart.length}{" "}
                line{cart.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {TENDERS.map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={t === "cash" ? "default" : "outline"}
                  className="h-12 capitalize"
                  disabled={saving !== null || cart.length === 0}
                  onClick={() => tender(t)}
                >
                  {saving === t ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                      {t}
                    </>
                  )}
                </Button>
              ))}
            </div>

            <div className="text-[11px] text-muted-foreground text-center">
              Tap a tender to complete the sale. Inventory rows are marked{" "}
              <span className="font-medium">sold</span> automatically.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 space-y-2">
            <div>
              <Label className="text-xs">Event (optional)</Label>
              <select
                value={selectedEventKey}
                onChange={(e) => setSelectedEventKey(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="none">No event</option>
                {eventOptions.map((e) => (
                  <option key={`${e.kind}:${e.id}`} value={`${e.kind}:${e.id}`}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Customer (optional)</Label>
              <Input
                value={customerLabel}
                onChange={(e) => setCustomerLabel(e.target.value)}
                placeholder="Walk-up · table 7 · regular"
                className="mt-1 h-9"
              />
            </div>
            {cart.some((l) => !l.deal_list_item_id) && (
              <Badge variant="outline" className="text-[10px]">
                Cart contains manual lines — no inventory will be updated for
                those.
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuickSell;
