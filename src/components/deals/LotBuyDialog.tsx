import { useEffect, useMemo, useState } from "react";
import { Loader2, PackageCheck } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * The minimum data we need from a deal row to allocate a lot cost into it.
 * `reference_unit_price` is the per-card market/comp value used for proportional weighting.
 * `suggested_sell_price` becomes each new bought deal's target sell price.
 */
export interface LotBuyTarget {
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
  reference_unit_price: number | null;
  suggested_sell_price: number | null;
}

type AllocationMode = "proportional" | "even";

interface Props {
  open: boolean;
  targets: LotBuyTarget[];
  userId: string;
  onClose: () => void;
  /**
   * Called once for every deal that was successfully converted to "bought".
   * The parent merges each patch into local state so the rows flip tabs without a refetch.
   */
  onSuccess: (
    results: Array<{
      dealId: string;
      patch: {
        status: "bought";
        purchase_price: number;
        shipping_cost: number;
        fees: number;
        source: string | null;
        target_sell_price: number | null;
        bought_at: string;
        collection_item_id: string;
        lot_id: string;
      };
    }>,
  ) => void;
}

const INVENTORY_NAME = "Inventory";
const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Re-uses the same lazy-create pattern as MarkAsBoughtDialog so all bought deals land in one collection. */
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

interface Allocation {
  dealId: string;
  qty: number;
  weight: number;
  unitPrice: number;
  shipShare: number;
  feeShare: number;
  dealCost: number;
}

/**
 * Allocate a lot total + ship/fees across targets using either market-weighted or even splits.
 * - Proportional: weight = qty × reference_unit_price (falls back to qty when no comp exists).
 * - Even: weight = qty (each card pays the same share regardless of value).
 * Cents-level rounding drift is funneled into the last row so subtotals always equal the lot exactly.
 */
const allocate = (
  targets: LotBuyTarget[],
  lotPurchase: number,
  lotShipping: number,
  lotFees: number,
  mode: AllocationMode,
): Allocation[] => {
  if (targets.length === 0) return [];

  const rows = targets.map((t) => {
    const qty = Math.max(1, t.quantity || 1);
    const ref = t.reference_unit_price ?? 0;
    // When proportional weighting collapses to zero (no comps anywhere) we silently fall
    // back to even weighting so we don't divide by zero and dump everything into row 0.
    const weight = mode === "proportional" ? qty * ref : qty;
    return { dealId: t.id, qty, weight };
  });

  const sumWeight = rows.reduce((s, r) => s + r.weight, 0);
  const useEven = sumWeight <= 0;

  const draft = rows.map((r) => {
    const w = useEven ? r.qty : r.weight;
    return { ...r, weight: w };
  });
  const totalW = draft.reduce((s, r) => s + r.weight, 0) || 1;

  let runningCost = 0;
  let runningShip = 0;
  let runningFee = 0;
  const out: Allocation[] = draft.map((r, idx) => {
    const isLast = idx === draft.length - 1;
    const share = r.weight / totalW;
    // Last row absorbs rounding remainder so the column totals match the user's lot inputs exactly.
    const dealCost = isLast ? round2(lotPurchase - runningCost) : round2(lotPurchase * share);
    const shipShare = isLast ? round2(lotShipping - runningShip) : round2(lotShipping * share);
    const feeShare = isLast ? round2(lotFees - runningFee) : round2(lotFees * share);
    runningCost += dealCost;
    runningShip += shipShare;
    runningFee += feeShare;
    const unitPrice = round2(dealCost / r.qty);
    return {
      dealId: r.dealId,
      qty: r.qty,
      weight: r.weight,
      unitPrice,
      shipShare,
      feeShare,
      dealCost,
    };
  });
  return out;
};

export const LotBuyDialog = ({ open, targets, userId, onClose, onSuccess }: Props) => {
  const [lotPurchase, setLotPurchase] = useState("");
  const [lotShipping, setLotShipping] = useState("0");
  const [lotFees, setLotFees] = useState("0");
  const [source, setSource] = useState("");
  const [mode, setMode] = useState<AllocationMode>("proportional");
  const [saving, setSaving] = useState(false);

  // When the dialog opens with a fresh selection, prefill lotPurchase to the
  // sum of reference prices × qty — usually the user's mental "fair value" anchor.
  useEffect(() => {
    if (!open) return;
    const fairValue = targets.reduce(
      (s, t) => s + (t.reference_unit_price ?? 0) * (t.quantity || 1),
      0,
    );
    setLotPurchase(fairValue > 0 ? fairValue.toFixed(2) : "");
    setLotShipping("0");
    setLotFees("0");
    setSource("");
    setMode("proportional");
  }, [open, targets]);

  const totalCards = useMemo(
    () => targets.reduce((s, t) => s + (t.quantity || 1), 0),
    [targets],
  );
  const lotPurchaseNum = num(lotPurchase);
  const lotShippingNum = num(lotShipping);
  const lotFeesNum = num(lotFees);
  const totalBasis = lotPurchaseNum + lotShippingNum + lotFeesNum;
  const refTotal = useMemo(
    () =>
      targets.reduce(
        (s, t) => s + (t.reference_unit_price ?? 0) * (t.quantity || 1),
        0,
      ),
    [targets],
  );
  // Discount vs comps — positive number means buying below fair value.
  const savingsPct = refTotal > 0 ? ((refTotal - lotPurchaseNum) / refTotal) * 100 : 0;

  const allocations = useMemo(
    () => allocate(targets, lotPurchaseNum, lotShippingNum, lotFeesNum, mode),
    [targets, lotPurchaseNum, lotShippingNum, lotFeesNum, mode],
  );
  const allocByDeal = useMemo(() => {
    const m = new Map<string, Allocation>();
    for (const a of allocations) m.set(a.dealId, a);
    return m;
  }, [allocations]);

  // Sanity-check totals row — if the per-deal sum drifts from the inputs we want to know.
  const sumDealCost = allocations.reduce((s, a) => s + a.dealCost, 0);
  const sumShip = allocations.reduce((s, a) => s + a.shipShare, 0);
  const sumFee = allocations.reduce((s, a) => s + a.feeShare, 0);

  const canSubmit = !saving && targets.length > 0 && lotPurchaseNum > 0;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    if (lotPurchaseNum <= 0) {
      toast({
        title: "Enter the lot total",
        description: "Cost basis is required to inventory the lot.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const collectionId = await ensureInventoryCollection(userId);
      const boughtAt = new Date().toISOString();
      const results: Parameters<typeof onSuccess>[0] = [];

      // We sequence per-target so a partial failure leaves a clear breadcrumb: every
      // result pushed before the throw has both an inventory row AND a flipped deal row.
      for (const t of targets) {
        const a = allocByDeal.get(t.id);
        if (!a) continue;
        const totalCostForRow = round2(a.dealCost + a.shipShare + a.feeShare);
        // Per-unit carrying value includes the row's allocated ship+fees so P&L math stays consistent
        // with the single-card MarkAsBoughtDialog path.
        const carryingPerUnit = round2(totalCostForRow / a.qty);

        const { data: inv, error: invErr } = await supabase
          .from("collection_items")
          .insert({
            collection_id: collectionId,
            user_id: userId,
            name: t.card_name,
            set_name: t.set_name,
            card_number: t.card_number,
            rarity: t.rarity,
            condition: t.condition as
              | "mint"
              | "near_mint"
              | "excellent"
              | "good"
              | "light_play"
              | "moderate_play"
              | "heavy_play"
              | "damaged",
            quantity: a.qty,
            purchase_price: a.unitPrice,
            estimated_value: carryingPerUnit,
            image_url: t.image_url,
            notes: [t.notes, source ? `Lot source: ${source}` : null, `Lot buy · share ${((a.weight / (allocations.reduce((s, x) => s + x.weight, 0) || 1)) * 100).toFixed(1)}%`]
              .filter(Boolean)
              .join("\n"),
            acquired_date: boughtAt.slice(0, 10),
          })
          .select("id")
          .single();
        if (invErr) throw invErr;

        const patch = {
          status: "bought" as const,
          purchase_price: a.unitPrice,
          shipping_cost: a.shipShare,
          fees: a.feeShare,
          source: source.trim() || null,
          target_sell_price: t.suggested_sell_price,
          bought_at: boughtAt,
          collection_item_id: inv.id,
        };
        const { error: updErr } = await supabase
          .from("deal_list_items")
          .update(patch)
          .eq("id", t.id);
        if (updErr) throw updErr;

        results.push({ dealId: t.id, patch });
      }

      toast({
        title: "Lot inventoried",
        description: `${results.length} card${results.length === 1 ? "" : "s"} · total basis $${totalBasis.toFixed(2)}`,
      });
      onSuccess(results);
      onClose();
    } catch (e) {
      toast({
        title: "Couldn't complete lot buy",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4" />
            Buy as lot · {targets.length} deal{targets.length === 1 ? "" : "s"} · {totalCards} card{totalCards === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Enter what you paid for the whole pile. We'll split it across every selected card
            and add them to your <strong>Inventory</strong> with per-card cost basis.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <Label htmlFor="lot-total" className="text-xs">
              Lot purchase total
            </Label>
            <Input
              id="lot-total"
              type="number"
              step="0.01"
              min={0}
              value={lotPurchase}
              onChange={(e) => setLotPurchase(e.target.value)}
              autoFocus
              placeholder="0.00"
            />
            {refTotal > 0 && lotPurchaseNum > 0 && (
              <p className={`text-[11px] mt-1 ${savingsPct >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {savingsPct >= 0 ? "Buying " : "Paying "}
                {Math.abs(savingsPct).toFixed(1)}%{" "}
                {savingsPct >= 0 ? "below" : "above"} fair value (${refTotal.toFixed(2)})
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="lot-ship" className="text-xs">
              Shipping (lot)
            </Label>
            <Input
              id="lot-ship"
              type="number"
              step="0.01"
              min={0}
              value={lotShipping}
              onChange={(e) => setLotShipping(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="lot-fees" className="text-xs">
              Fees (lot)
            </Label>
            <Input
              id="lot-fees"
              type="number"
              step="0.01"
              min={0}
              value={lotFees}
              onChange={(e) => setLotFees(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="lot-source" className="text-xs">
              Source
            </Label>
            <Input
              id="lot-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="eBay lot, show, …"
            />
          </div>
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <Label className="text-xs">Allocation method</Label>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as AllocationMode)}
            className="grid grid-cols-2 gap-2"
          >
            <label
              htmlFor="mode-prop"
              className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer text-xs ${mode === "proportional" ? "border-primary bg-primary/5" : ""}`}
            >
              <RadioGroupItem id="mode-prop" value="proportional" className="mt-0.5" />
              <span>
                <span className="font-medium block">Proportional to value</span>
                <span className="text-muted-foreground">
                  Pricier cards absorb more of the cost. Best when comps vary.
                </span>
              </span>
            </label>
            <label
              htmlFor="mode-even"
              className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer text-xs ${mode === "even" ? "border-primary bg-primary/5" : ""}`}
            >
              <RadioGroupItem id="mode-even" value="even" className="mt-0.5" />
              <span>
                <span className="font-medium block">Even per card</span>
                <span className="text-muted-foreground">
                  Same cost per card regardless of value. Use for raw bulk.
                </span>
              </span>
            </label>
          </RadioGroup>
          {refTotal <= 0 && mode === "proportional" && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              No market comps on this selection — proportional will fall back to even.
            </p>
          )}
        </div>

        <div className="rounded-md border">
          <div className="px-3 pt-2 pb-1 flex items-center justify-between">
            <h4 className="text-xs font-medium">Per-card allocation preview</h4>
            <span className="text-[11px] text-muted-foreground">
              Totals: ${sumDealCost.toFixed(2)} cost · ${sumShip.toFixed(2)} ship · ${sumFee.toFixed(2)} fees
            </span>
          </div>
          <ScrollArea className="max-h-64">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Card</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs text-right">Ref price</TableHead>
                  <TableHead className="text-xs text-right">Unit cost</TableHead>
                  <TableHead className="text-xs text-right">Row total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((t) => {
                  const a = allocByDeal.get(t.id);
                  if (!a) return null;
                  const rowTotal = a.dealCost + a.shipShare + a.feeShare;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium truncate max-w-[14rem]">{t.card_name}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[14rem]">
                          {t.set_name ?? "—"}
                          {t.card_number ? ` · ${t.card_number}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right">{a.qty}</TableCell>
                      <TableCell className="text-xs text-right">
                        {t.reference_unit_price != null ? `$${t.reference_unit_price.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        ${a.unitPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-right">${rowTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs flex justify-between">
          <span className="text-muted-foreground">Total cost basis</span>
          <span className="font-semibold">${totalBasis.toFixed(2)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Inventory lot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
