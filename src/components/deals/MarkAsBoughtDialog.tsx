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

export interface MarkAsBoughtTarget {
  id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  image_url: string | null;
  quantity: number;
  condition: string;
  game: string;
  notes: string | null;
  /** Suggested per-card buy price from the deal list (modified deal price). */
  suggested_unit_price: number | null;
  /** Suggested target sell — uses the card's market price as a starting point. */
  suggested_sell_price: number | null;
}

interface Props {
  open: boolean;
  target: MarkAsBoughtTarget | null;
  userId: string;
  onClose: () => void;
  /** Called after a successful buy so the parent can refresh the row in place. */
  onSuccess: (
    dealId: string,
    patch: {
      status: "bought";
      purchase_price: number;
      shipping_cost: number;
      fees: number;
      source: string | null;
      target_sell_price: number | null;
      bought_at: string;
      collection_item_id: string;
    },
  ) => void;
}

const INVENTORY_NAME = "Inventory";

/** Find or lazily create the user's dedicated Inventory collection. */
const ensureInventoryCollection = async (userId: string): Promise<string> => {
  const { data: existing, error: findErr } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", userId)
    .eq("name", INVENTORY_NAME)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing.id;

  const { data: created, error: insErr } = await supabase
    .from("collections")
    .insert({
      user_id: userId,
      name: INVENTORY_NAME,
      category: "other",
      description: "Cards purchased as deals — cost basis tracked for P&L.",
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return created.id;
};

const num = (v: string): number => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const MarkAsBoughtDialog = ({ open, target, userId, onClose, onSuccess }: Props) => {
  const [unitPrice, setUnitPrice] = useState("");
  const [shipping, setShipping] = useState("0");
  const [fees, setFees] = useState("0");
  const [source, setSource] = useState("");
  const [targetSell, setTargetSell] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset fields whenever a new target is opened.
  useEffect(() => {
    if (!target) return;
    setUnitPrice(target.suggested_unit_price?.toFixed(2) ?? "");
    setShipping("0");
    setFees("0");
    setSource("");
    setTargetSell(target.suggested_sell_price?.toFixed(2) ?? "");
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

  const handleConfirm = async () => {
    if (!target || saving) return;
    if (unit <= 0) {
      toast({
        title: "Enter a purchase price",
        description: "Cost basis is required to inventory the card.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const collectionId = await ensureInventoryCollection(userId);
      const boughtAt = new Date().toISOString();

      const { data: inv, error: invErr } = await supabase
        .from("collection_items")
        .insert({
          collection_id: collectionId,
          user_id: userId,
          name: target.card_name,
          set_name: target.set_name,
          card_number: target.card_number,
          rarity: target.rarity,
          condition: target.condition as
            | "mint"
            | "near_mint"
            | "excellent"
            | "good"
            | "light_play"
            | "moderate_play"
            | "heavy_play"
            | "damaged",
          quantity: qty,
          purchase_price: unit,
          // Persist effective per-unit cost (incl. allocated ship+fees) as the carrying value.
          estimated_value: totalCost,
          image_url: target.image_url,
          notes: [target.notes, source ? `Source: ${source}` : null]
            .filter(Boolean)
            .join("\n") || null,
          acquired_date: boughtAt.slice(0, 10),
        })
        .select("id")
        .single();
      if (invErr) throw invErr;

      const patch = {
        status: "bought" as const,
        purchase_price: unit,
        shipping_cost: ship,
        fees: fee,
        source: source.trim() || null,
        target_sell_price: num(targetSell) || null,
        bought_at: boughtAt,
        collection_item_id: inv.id,
      };
      const { error: updErr } = await supabase
        .from("deal_list_items")
        .update(patch)
        .eq("id", target.id);
      if (updErr) throw updErr;

      toast({
        title: "Added to Inventory",
        description: `${target.card_name} · cost basis $${totalCost.toFixed(2)}`,
      });
      onSuccess(target.id, patch);
      onClose();
    } catch (e) {
      toast({
        title: "Couldn't mark as bought",
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
          <DialogTitle>Mark as bought</DialogTitle>
          <DialogDescription>
            {target.card_name}
            {target.set_name ? ` · ${target.set_name}` : ""} · qty {qty}. This will add it to your{" "}
            <strong>Inventory</strong> collection with the cost basis below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="unit-price" className="text-xs">
              Purchase price (per card)
            </Label>
            <Input
              id="unit-price"
              type="number"
              step="0.01"
              min={0}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="shipping" className="text-xs">
              Shipping (total)
            </Label>
            <Input
              id="shipping"
              type="number"
              step="0.01"
              min={0}
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fees" className="text-xs">
              Fees (total)
            </Label>
            <Input
              id="fees"
              type="number"
              step="0.01"
              min={0}
              value={fees}
              onChange={(e) => setFees(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="source" className="text-xs">
              Source (eBay, show, vendor…)
            </Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="target-sell" className="text-xs">
              Target sell price (per card)
            </Label>
            <Input
              id="target-sell"
              type="number"
              step="0.01"
              min={0}
              value={targetSell}
              onChange={(e) => setTargetSell(e.target.value)}
              placeholder="Optional"
            />
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
                <span
                  className={
                    projectedProfit >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-destructive"
                  }
                >
                  ${projectedProfit.toFixed(2)} ({projectedMarginPct.toFixed(0)}%)
                </span>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add to Inventory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
