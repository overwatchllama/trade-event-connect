import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface EditBoughtTarget {
  id: string;
  card_name: string;
  set_name: string | null;
  quantity: number;
  purchase_price: number | null;
  shipping_cost: number;
  fees: number;
  source: string | null;
  target_sell_price: number | null;
  /** Linked inventory row, if any — kept in sync when purchase price changes. */
  collection_item_id: string | null;
}

interface Props {
  open: boolean;
  target: EditBoughtTarget | null;
  onClose: () => void;
  onSuccess: (
    dealId: string,
    patch: {
      purchase_price: number;
      shipping_cost: number;
      fees: number;
      source: string | null;
      target_sell_price: number | null;
    },
  ) => void;
}

const num = (v: string): number => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const EditBoughtDialog = ({ open, target, onClose, onSuccess }: Props) => {
  const [unitPrice, setUnitPrice] = useState("");
  const [shipping, setShipping] = useState("0");
  const [fees, setFees] = useState("0");
  const [source, setSource] = useState("");
  const [targetSell, setTargetSell] = useState("");
  const [saving, setSaving] = useState(false);

  // Hydrate inputs whenever a new bought row is opened for editing.
  useEffect(() => {
    if (!target) return;
    setUnitPrice(target.purchase_price != null ? target.purchase_price.toFixed(2) : "");
    setShipping((target.shipping_cost ?? 0).toFixed(2));
    setFees((target.fees ?? 0).toFixed(2));
    setSource(target.source ?? "");
    setTargetSell(target.target_sell_price != null ? target.target_sell_price.toFixed(2) : "");
  }, [target?.id]);

  if (!target) return null;

  const qty = target.quantity || 1;
  const unit = num(unitPrice);
  const ship = num(shipping);
  const fee = num(fees);
  const totalCost = unit * qty + ship + fee;
  const sellTotal = num(targetSell) * qty;
  const projectedProfit = sellTotal - totalCost;
  const projectedMarginPct = totalCost > 0 ? (projectedProfit / totalCost) * 100 : 0;

  const handleSave = async () => {
    if (saving) return;
    if (unit <= 0) {
      toast({
        title: "Enter a purchase price",
        description: "Cost basis is required for bought deals.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const patch = {
        purchase_price: unit,
        shipping_cost: ship,
        fees: fee,
        source: source.trim() || null,
        target_sell_price: num(targetSell) || null,
      };
      const { error: updErr } = await supabase
        .from("deal_list_items")
        .update(patch)
        .eq("id", target.id);
      if (updErr) throw updErr;

      // Keep the linked inventory row's cost basis in sync so P&L on the Inventory
      // page reflects the updated purchase price + allocated ship/fees.
      if (target.collection_item_id) {
        await supabase
          .from("collection_items")
          .update({ purchase_price: unit, estimated_value: totalCost })
          .eq("id", target.collection_item_id);
      }

      toast({
        title: "Updated",
        description: `${target.card_name} · cost basis $${totalCost.toFixed(2)}`,
      });
      onSuccess(target.id, patch);
      onClose();
    } catch (e) {
      toast({
        title: "Couldn't save changes",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit bought deal</DialogTitle>
          <DialogDescription>
            {target.card_name}
            {target.set_name ? ` · ${target.set_name}` : ""} · qty {qty}. Updates the cost basis on this
            deal and on the linked Inventory row.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="edit-unit-price" className="text-xs">Purchase price (per card)</Label>
            <Input id="edit-unit-price" type="number" step="0.01" min={0} value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)} autoFocus />
          </div>
          <div>
            <Label htmlFor="edit-shipping" className="text-xs">Shipping (total)</Label>
            <Input id="edit-shipping" type="number" step="0.01" min={0} value={shipping}
              onChange={(e) => setShipping(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-fees" className="text-xs">Fees (total)</Label>
            <Input id="edit-fees" type="number" step="0.01" min={0} value={fees}
              onChange={(e) => setFees(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="edit-source" className="text-xs">Source (eBay, show, vendor…)</Label>
            <Input id="edit-source" value={source} onChange={(e) => setSource(e.target.value)}
              placeholder="Optional" maxLength={200} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="edit-target-sell" className="text-xs">Target sell price (per card)</Label>
            <Input id="edit-target-sell" type="number" step="0.01" min={0} value={targetSell}
              onChange={(e) => setTargetSell(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total cost basis</span>
            <span className="font-semibold">${totalCost.toFixed(2)}</span>
          </div>
          {sellTotal > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected revenue</span>
                <span>${sellTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected profit</span>
                <span className={projectedProfit >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-destructive"}>
                  ${projectedProfit.toFixed(2)} ({projectedMarginPct.toFixed(0)}%)
                </span>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
