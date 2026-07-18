import { useMemo, useReducer } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScanBar } from "./ScanBar";
import { TenderBar } from "./TenderBar";
import {
  ticketReducer,
  emptyTicket,
  sellSubtotal,
  buySubtotal,
  tenderTotal,
  type TicketMode,
  type TicketLine,
} from "./ticketReducer";
import { useInvalidateInventory } from "@/hooks/useInventoryQuery";

type Props = { mode: TicketMode; onComplete?: () => void };

export function TradeTicket({ mode, onComplete }: Props) {
  const [state, dispatch] = useReducer(ticketReducer, undefined, () => emptyTicket(mode));
  const [saving, setSaving] = useState(false);
  const invalidate = useInvalidateInventory();

  const sellTotal = useMemo(() => sellSubtotal(state), [state]);
  const buyTotal = useMemo(() => buySubtotal(state), [state]);
  const balance = +(sellTotal - buyTotal).toFixed(2); // positive = customer owes vendor
  const target = mode === "trade" ? Math.max(0, balance) : sellTotal;
  const paid = tenderTotal(state);

  const addFromScan = (row: any, side: "sell" | "buy" = mode === "buy" ? "buy" : "sell") => {
    const line: TicketLine = {
      key: `${row.id}-${side}-${Date.now()}`,
      side,
      deal_list_item_id: side === "sell" ? row.id : null,
      card_name: row.card_name,
      set_name: row.set_name,
      card_number: row.card_number,
      condition: row.condition,
      image_url: row.image_url,
      quantity: 1,
      unit_price: side === "sell" ? (row.list_price ?? row.target_sell_price ?? row.tcgplayer_market_price ?? 0) : null,
      unit_cost: row.purchase_price ?? null,
      market_snapshot: row.tcgplayer_market_price ?? null,
    };
    dispatch({ type: "add_line", line });
  };

  const addBlank = (side: "sell" | "buy") => {
    dispatch({
      type: "add_line",
      line: {
        key: `manual-${Date.now()}`,
        side,
        card_name: "",
        quantity: 1,
        unit_price: side === "sell" ? 0 : null,
        unit_cost: side === "buy" ? 0 : null,
      },
    });
  };

  const commit = async () => {
    if (state.lines.length === 0) {
      toast.error("Add at least one line");
      return;
    }
    if (mode !== "trade" && target > 0 && Math.abs(paid - target) > 0.01) {
      const proceed = confirm(`Tender is off by $${(paid - target).toFixed(2)}. Save anyway?`);
      if (!proceed) return;
    }
    setSaving(true);
    try {
      const payload = {
        kind: mode === "sell" ? "sale" : mode === "buy" ? "purchase" : "trade",
        status: "completed",
        customer_label: state.customer_label || null,
        notes: state.notes || null,
        fees: state.fees || 0,
        tender_breakdown: state.tender,
        lines: state.lines.map((l) => ({
          side: l.side,
          deal_list_item_id: l.deal_list_item_id ?? null,
          card_name: l.card_name,
          set_name: l.set_name ?? null,
          card_number: l.card_number ?? null,
          condition: l.condition ?? null,
          image_url: l.image_url ?? null,
          quantity: l.quantity,
          unit_price: l.unit_price ?? null,
          unit_cost: l.unit_cost ?? null,
          market_snapshot: l.market_snapshot ?? null,
        })),
      };
      const { data, error } = await supabase.rpc("commit_ticket" as any, { p_ticket: payload as any });
      if (error) throw error;
      toast.success(`${mode === "sell" ? "Sale" : mode === "buy" ? "Purchase" : "Trade"} saved`, {
        description: `Total $${((data as any)?.total ?? 0).toFixed(2)}`,
      });
      invalidate();
      dispatch({ type: "reset", mode });
      onComplete?.();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save ticket");
    } finally {
      setSaving(false);
    }
  };

  const sellLines = state.lines.filter((l) => l.side === "sell");
  const buyLines = state.lines.filter((l) => l.side === "buy");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {(mode === "sell" || mode === "trade") && (
          <Card className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{mode === "trade" ? "Customer gets (from your inventory)" : "Selling"}</h3>
              <Button variant="ghost" size="sm" onClick={() => addBlank("sell")}>+ Manual line</Button>
            </div>
            <ScanBar onScan={(r) => addFromScan(r, "sell")} placeholder="Scan inventory label to sell…" />
            <LineTable lines={sellLines} side="sell" dispatch={dispatch} />
          </Card>
        )}
        {(mode === "buy" || mode === "trade") && (
          <Card className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{mode === "trade" ? "Customer gives (into your inventory)" : "Buying"}</h3>
              <Button variant="ghost" size="sm" onClick={() => addBlank("buy")}>+ Manual line</Button>
            </div>
            <LineTable lines={buyLines} side="buy" dispatch={dispatch} />
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <Card className="p-3 space-y-3">
          <h3 className="text-sm font-semibold">Ticket</h3>
          <div className="text-sm space-y-1">
            <Row label="Sell subtotal" value={sellTotal} />
            {mode !== "sell" && <Row label="Buy subtotal" value={buyTotal} />}
            {mode === "trade" && (
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>{balance >= 0 ? "Customer owes" : "Vendor owes"}</span>
                <span>${Math.abs(balance).toFixed(2)}</span>
              </div>
            )}
          </div>
          <Input
            placeholder="Customer name / tag (optional)"
            value={state.customer_label}
            onChange={(e) => dispatch({ type: "set_customer", value: e.target.value })}
          />
          <Textarea
            placeholder="Notes"
            value={state.notes}
            onChange={(e) => dispatch({ type: "set_notes", value: e.target.value })}
            rows={2}
          />
          {mode !== "buy" && target > 0 && (
            <TenderBar
              target={target}
              tender={state.tender}
              onChange={(t) => dispatch({ type: "set_tender", tender: t })}
            />
          )}
          <Button className="w-full" size="lg" onClick={commit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Complete {mode === "sell" ? "sale" : mode === "buy" ? "purchase" : "trade"}
          </Button>
        </Card>
        {mode === "trade" && (
          <p className="text-xs text-muted-foreground px-1">
            Trade tips: inventory sold via trade is marked <Badge variant="outline" className="text-[10px]">traded</Badge>. Buy-side lines become new inventory rows.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">${value.toFixed(2)}</span>
    </div>
  );
}

function LineTable({
  lines,
  side,
  dispatch,
}: {
  lines: TicketLine[];
  side: "sell" | "buy";
  dispatch: React.Dispatch<any>;
}) {
  if (lines.length === 0) {
    return <p className="text-xs text-muted-foreground py-6 text-center">No {side} lines yet.</p>;
  }
  return (
    <div className="divide-y">
      {lines.map((l) => {
        const priceField = side === "sell" ? l.unit_price : l.unit_cost;
        const margin =
          side === "sell" && l.unit_cost != null && l.unit_price != null && l.unit_price > 0
            ? Math.round(((l.unit_price - l.unit_cost) / l.unit_price) * 100)
            : null;
        return (
          <div key={l.key} className="py-2 flex gap-2 items-start">
            <div className="flex-1 min-w-0">
              <Input
                value={l.card_name}
                onChange={(e) => dispatch({ type: "update_line", key: l.key, patch: { card_name: e.target.value } })}
                placeholder="Card name"
                className="h-8 text-sm font-medium"
              />
              <div className="flex gap-1 mt-1 text-xs text-muted-foreground truncate">
                {l.set_name && <span>{l.set_name}</span>}
                {l.card_number && <span>· #{l.card_number}</span>}
                {l.condition && <Badge variant="outline" className="text-[10px] h-4">{l.condition}</Badge>}
                {margin != null && (
                  <Badge className={`text-[10px] h-4 ${margin < 0 ? "bg-destructive" : "bg-green-600"} hover:opacity-100`}>
                    {margin}%
                  </Badge>
                )}
              </div>
            </div>
            <Input
              type="number"
              value={l.quantity}
              min={1}
              onChange={(e) => dispatch({ type: "update_line", key: l.key, patch: { quantity: parseInt(e.target.value) || 1 } })}
              className="h-8 w-14"
            />
            <Input
              type="number"
              step="0.01"
              value={priceField ?? ""}
              onChange={(e) =>
                dispatch({
                  type: "update_line",
                  key: l.key,
                  patch: side === "sell"
                    ? { unit_price: parseFloat(e.target.value) || 0 }
                    : { unit_cost: parseFloat(e.target.value) || 0 },
                })
              }
              className="h-8 w-24"
              placeholder={side === "sell" ? "Price" : "Cost"}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => dispatch({ type: "remove_line", key: l.key })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// Local useState import (kept at bottom to keep top import group tidy)
import { useState } from "react";
