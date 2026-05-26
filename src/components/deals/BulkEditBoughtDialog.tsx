import { useEffect, useMemo, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/** Minimal shape needed for bulk edits — purposely matches the bought subset of DealItem. */
export interface BulkEditTarget {
  id: string;
  card_name: string;
  quantity: number;
  purchase_price: number | null;
  shipping_cost: number;
  fees: number;
  target_sell_price: number | null;
  collection_item_id: string | null;
}

/** Per-field bulk operation mode. "none" = leave existing value alone. */
type Mode = "none" | "set" | "addAbs" | "addPct";

interface FieldState {
  mode: Mode;
  value: string;
}

interface Props {
  open: boolean;
  targets: BulkEditTarget[];
  onClose: () => void;
  /** Patch is keyed by deal id so the parent can splice updates into its `items` state. */
  onSuccess: (
    patches: Record<
      string,
      Partial<Pick<BulkEditTarget, "purchase_price" | "shipping_cost" | "fees" | "target_sell_price">>
    >,
  ) => void;
}

const MODE_OPTIONS: Array<{ value: Mode; label: string }> = [
  { value: "none", label: "No change" },
  { value: "set", label: "Set to" },
  { value: "addAbs", label: "Adjust by $" },
  { value: "addPct", label: "Adjust by %" },
];

const num = (v: string): number => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Apply a single field operation to an existing value. We clamp to >= 0 because
 * cost basis can never be negative — pulling it below zero would corrupt P&L math.
 */
const applyOp = (current: number, field: FieldState): number => {
  const v = num(field.value);
  switch (field.mode) {
    case "set":
      return Math.max(0, round2(v));
    case "addAbs":
      return Math.max(0, round2(current + v));
    case "addPct":
      return Math.max(0, round2(current * (1 + v / 100)));
    case "none":
    default:
      return current;
  }
};

export const BulkEditBoughtDialog = ({ open, targets, onClose, onSuccess }: Props) => {
  // Each cost-basis field gets its own mode + value so users can mix-and-match
  // (e.g. bump target sell by 10% while leaving purchase price alone).
  const [purchase, setPurchase] = useState<FieldState>({ mode: "none", value: "" });
  const [shipping, setShipping] = useState<FieldState>({ mode: "none", value: "" });
  const [fees, setFees] = useState<FieldState>({ mode: "none", value: "" });
  const [targetSell, setTargetSell] = useState<FieldState>({ mode: "none", value: "" });
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset the form whenever a new selection is opened so previous edits don't leak.
  useEffect(() => {
    if (!open) return;
    setPurchase({ mode: "none", value: "" });
    setShipping({ mode: "none", value: "" });
    setFees({ mode: "none", value: "" });
    setTargetSell({ mode: "none", value: "" });
    setReviewing(false);
  }, [open]);

  const anyChange =
    purchase.mode !== "none" ||
    shipping.mode !== "none" ||
    fees.mode !== "none" ||
    targetSell.mode !== "none";

  // Live preview of aggregate cost-basis impact across the selection.
  const preview = useMemo(() => {
    let beforeCost = 0;
    let afterCost = 0;
    let beforeRevenue = 0;
    let afterRevenue = 1;
    for (const t of targets) {
      const qty = t.quantity || 1;
      const curUnit = t.purchase_price ?? 0;
      const curShip = t.shipping_cost ?? 0;
      const curFee = t.fees ?? 0;
      const curSell = t.target_sell_price ?? 0;
      const newUnit = applyOp(curUnit, purchase);
      const newShip = applyOp(curShip, shipping);
      const newFee = applyOp(curFee, fees);
      const newSell = applyOp(curSell, targetSell);
      beforeCost += curUnit * qty + curShip + curFee;
      afterCost += newUnit * qty + newShip + newFee;
      beforeRevenue += curSell * qty;
      afterRevenue += newSell * qty;
    }
    return {
      beforeCost,
      afterCost,
      beforeRevenue,
      afterRevenue,
      beforeProfit: beforeRevenue - beforeCost,
      afterProfit: afterRevenue - afterCost,
    };
  }, [targets, purchase, shipping, fees, targetSell]);

  const handleSave = async () => {
    if (saving || !anyChange || targets.length === 0) return;
    setSaving(true);
    const patches: Record<
      string,
      Partial<Pick<BulkEditTarget, "purchase_price" | "shipping_cost" | "fees" | "target_sell_price">>
    > = {};
    const inventoryUpdates: Array<{
      id: string;
      purchase_price: number;
      estimated_value: number;
      prev_purchase_price: number | null;
      prev_estimated_value: number | null;
    }> = [];
    // Audit entries snapshot before/after per deal so the action can be reversed.
    const auditEntries: Array<Record<string, unknown>> = [];

    try {
      const ops = targets.map(async (t) => {
        const qty = t.quantity || 1;
        const newUnit = applyOp(t.purchase_price ?? 0, purchase);
        const newShip = applyOp(t.shipping_cost ?? 0, shipping);
        const newFee = applyOp(t.fees ?? 0, fees);
        const newSell = applyOp(t.target_sell_price ?? 0, targetSell);

        const patch: Partial<Pick<BulkEditTarget, "purchase_price" | "shipping_cost" | "fees" | "target_sell_price">> = {};
        if (purchase.mode !== "none") patch.purchase_price = newUnit;
        if (shipping.mode !== "none") patch.shipping_cost = newShip;
        if (fees.mode !== "none") patch.fees = newFee;
        if (targetSell.mode !== "none") patch.target_sell_price = newSell || null;

        const { error } = await supabase.from("deal_list_items").update(patch).eq("id", t.id);
        if (error) throw error;
        patches[t.id] = patch;

        auditEntries.push({
          deal_id: t.id,
          card_name: t.card_name,
          collection_item_id: t.collection_item_id,
          quantity: qty,
          before: {
            purchase_price: t.purchase_price,
            shipping_cost: t.shipping_cost,
            fees: t.fees,
            target_sell_price: t.target_sell_price,
          },
          after: {
            purchase_price: patch.purchase_price ?? t.purchase_price,
            shipping_cost: patch.shipping_cost ?? t.shipping_cost,
            fees: patch.fees ?? t.fees,
            target_sell_price: "target_sell_price" in patch ? patch.target_sell_price : t.target_sell_price,
          },
        });

        if (t.collection_item_id && (purchase.mode !== "none" || shipping.mode !== "none" || fees.mode !== "none")) {
          const totalCost = newUnit * qty + newShip + newFee;
          // Capture previous inventory values so undo can restore them exactly.
          const { data: prevInv } = await supabase
            .from("collection_items")
            .select("purchase_price, estimated_value")
            .eq("id", t.collection_item_id)
            .maybeSingle();
          inventoryUpdates.push({
            id: t.collection_item_id,
            purchase_price: newUnit,
            estimated_value: totalCost,
            prev_purchase_price: prevInv?.purchase_price ?? null,
            prev_estimated_value: prevInv?.estimated_value ?? null,
          });
        }
      });
      await Promise.all(ops);

      if (inventoryUpdates.length > 0) {
        const invOps = inventoryUpdates.map((u) =>
          supabase
            .from("collection_items")
            .update({ purchase_price: u.purchase_price, estimated_value: u.estimated_value })
            .eq("id", u.id),
        );
        const results = await Promise.all(invOps);
        const invErr = results.find((r) => r.error)?.error;
        if (invErr) {
          toast({
            title: "Inventory partially updated",
            description: `Deals saved, but ${invErr.message}`,
            variant: "destructive",
          });
        }
      }

      // Write the audit row. Failure doesn't roll back the edit, but undo
      // won't be available for this action — warn the user explicitly.
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (uid) {
        const { error: auditErr } = await supabase.from("bulk_edit_audit_log").insert({
          user_id: uid,
          action: "bulk_edit_bought",
          entries: auditEntries as unknown as never,
          summary: {
            count: targets.length,
            inventory_updates: inventoryUpdates.map((u) => ({
              id: u.id,
              prev_purchase_price: u.prev_purchase_price,
              prev_estimated_value: u.prev_estimated_value,
            })),
            modes: {
              purchase: purchase.mode !== "none" ? `${purchase.mode}:${purchase.value}` : null,
              shipping: shipping.mode !== "none" ? `${shipping.mode}:${shipping.value}` : null,
              fees: fees.mode !== "none" ? `${fees.mode}:${fees.value}` : null,
              target_sell: targetSell.mode !== "none" ? `${targetSell.mode}:${targetSell.value}` : null,
            },
          } as unknown as never,
        });
        if (auditErr) {
          toast({
            title: "Undo unavailable",
            description: "Edit saved, but audit log failed: " + auditErr.message,
            variant: "destructive",
          });
        }
      }

      onSuccess(patches);
      toast({
        title: "Bulk edit applied",
        description: `Updated ${targets.length} bought deal${targets.length === 1 ? "" : "s"}. Use "Undo last bulk edit" to revert.`,
      });
      onClose();
    } catch (e) {
      toast({
        title: "Bulk edit failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deltaSign = (before: number, after: number) =>
    after > before ? "+" : after < before ? "" : "";
  const deltaVal = (before: number, after: number) => round2(after - before);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {reviewing ? "Confirm bulk edit" : "Bulk edit bought deals"}
          </DialogTitle>
          <DialogDescription>
            {reviewing
              ? `Review the impact before applying changes to ${targets.length} selected deal${targets.length === 1 ? "" : "s"}.`
              : `Apply the same cost-basis or target-sell change to ${targets.length} selected deal${targets.length === 1 ? "" : "s"}. Each field is optional — leave on "No change" to skip it.`}
          </DialogDescription>
        </DialogHeader>

        {!reviewing ? (
          <>
            <div className="space-y-3">
              <FieldRow
                label="Purchase price (per card)"
                field={purchase}
                onChange={setPurchase}
                hint="Set replaces; Adjust by $ adds/subtracts; Adjust by % scales."
              />
              <FieldRow
                label="Shipping (total per deal)"
                field={shipping}
                onChange={setShipping}
              />
              <FieldRow
                label="Fees (total per deal)"
                field={fees}
                onChange={setFees}
              />
              <FieldRow
                label="Target sell price (per card)"
                field={targetSell}
                onChange={setTargetSell}
              />
            </div>

            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total cost basis</span>
                <span>
                  ${preview.beforeCost.toFixed(2)}
                  {anyChange && (
                    <>
                      {" → "}
                      <span className="font-semibold">${preview.afterCost.toFixed(2)}</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected revenue</span>
                <span>
                  ${preview.beforeRevenue.toFixed(2)}
                  {anyChange && (
                    <>
                      {" → "}
                      <span className="font-semibold">${preview.afterRevenue.toFixed(2)}</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected profit</span>
                <span className={preview.afterProfit >= 0 ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}>
                  ${preview.beforeProfit.toFixed(2)}
                  {anyChange && <> → ${preview.afterProfit.toFixed(2)}</>}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => setReviewing(true)} disabled={!anyChange}>
                Review changes
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                <h4 className="text-sm font-medium">Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Deals affected</p>
                    <p className="font-semibold">{targets.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Cards affected</p>
                    <p className="font-semibold">
                      {targets.reduce((acc, t) => acc + (t.quantity || 1), 0)}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <ImpactRow
                    label="Total cost basis"
                    before={preview.beforeCost}
                    after={preview.afterCost}
                    isCurrency
                  />
                  <ImpactRow
                    label="Projected revenue"
                    before={preview.beforeRevenue}
                    after={preview.afterRevenue}
                    isCurrency
                  />
                  <ImpactRow
                    label="Projected profit"
                    before={preview.beforeProfit}
                    after={preview.afterProfit}
                    isCurrency
                    highlight
                  />
                </div>
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-sm font-medium">Changes to apply</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {purchase.mode !== "none" && (
                    <li>
                      Purchase price: {MODE_OPTIONS.find((m) => m.value === purchase.mode)?.label}{" "}
                      {purchase.value}
                      {purchase.mode === "addPct" ? "%" : "$"} per card
                    </li>
                  )}
                  {shipping.mode !== "none" && (
                    <li>
                      Shipping: {MODE_OPTIONS.find((m) => m.value === shipping.mode)?.label}{" "}
                      {shipping.value}
                      {shipping.mode === "addPct" ? "%" : "$"} per deal
                    </li>
                  )}
                  {fees.mode !== "none" && (
                    <li>
                      Fees: {MODE_OPTIONS.find((m) => m.value === fees.mode)?.label}{" "}
                      {fees.value}
                      {fees.mode === "addPct" ? "%" : "$"} per deal
                    </li>
                  )}
                  {targetSell.mode !== "none" && (
                    <li>
                      Target sell: {MODE_OPTIONS.find((m) => m.value === targetSell.mode)?.label}{" "}
                      {targetSell.value}
                      {targetSell.mode === "addPct" ? "%" : "$"} per card
                    </li>
                  )}
                </ul>
              </div>

              <div className="rounded-lg border space-y-2">
                <div className="p-3 pb-0">
                  <h4 className="text-sm font-medium">Per-deal preview</h4>
                  <p className="text-xs text-muted-foreground">
                    New values after your edits
                  </p>
                </div>
                <ScrollArea className="max-h-72">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Card</TableHead>
                        <TableHead className="text-xs text-right">Qty</TableHead>
                        <TableHead className="text-xs text-right">Purchase</TableHead>
                        <TableHead className="text-xs text-right">Ship</TableHead>
                        <TableHead className="text-xs text-right">Fees</TableHead>
                        <TableHead className="text-xs text-right">Target sell</TableHead>
                        <TableHead className="text-xs text-right">Cost basis</TableHead>
                        <TableHead className="text-xs text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {targets.map((t) => {
                        const qty = t.quantity || 1;
                        const curUnit = t.purchase_price ?? 0;
                        const curShip = t.shipping_cost ?? 0;
                        const curFee = t.fees ?? 0;
                        const curSell = t.target_sell_price ?? 0;
                        const newUnit = applyOp(curUnit, purchase);
                        const newShip = applyOp(curShip, shipping);
                        const newFee = applyOp(curFee, fees);
                        const newSell = applyOp(curSell, targetSell);
                        const beforeCost = curUnit * qty + curShip + curFee;
                        const afterCost = newUnit * qty + newShip + newFee;
                        const beforeProfit = curSell * qty - beforeCost;
                        const afterProfit = newSell * qty - afterCost;
                        const costChanged = Math.abs(afterCost - beforeCost) > 0.005;
                        const profitChanged = Math.abs(afterProfit - beforeProfit) > 0.005;
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs font-medium max-w-[140px] truncate">
                              {t.card_name}
                            </TableCell>
                            <TableCell className="text-xs text-right">{qty}</TableCell>
                            <TableCell className="text-xs text-right">
                              <span className={purchase.mode !== "none" ? "line-through text-muted-foreground" : ""}>
                                ${curUnit.toFixed(2)}
                              </span>
                              {purchase.mode !== "none" && (
                                <span className="ml-1 font-semibold">${newUnit.toFixed(2)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              <span className={shipping.mode !== "none" ? "line-through text-muted-foreground" : ""}>
                                ${curShip.toFixed(2)}
                              </span>
                              {shipping.mode !== "none" && (
                                <span className="ml-1 font-semibold">${newShip.toFixed(2)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              <span className={fees.mode !== "none" ? "line-through text-muted-foreground" : ""}>
                                ${curFee.toFixed(2)}
                              </span>
                              {fees.mode !== "none" && (
                                <span className="ml-1 font-semibold">${newFee.toFixed(2)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              <span className={targetSell.mode !== "none" ? "line-through text-muted-foreground" : ""}>
                                ${curSell.toFixed(2)}
                              </span>
                              {targetSell.mode !== "none" && (
                                <span className="ml-1 font-semibold">${newSell.toFixed(2)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              <span className={costChanged ? "line-through text-muted-foreground" : ""}>
                                ${beforeCost.toFixed(2)}
                              </span>
                              {costChanged && (
                                <span className={`ml-1 font-semibold ${afterCost > beforeCost ? "text-destructive" : "text-emerald-600"}`}>
                                  ${afterCost.toFixed(2)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              <span className={profitChanged ? "line-through text-muted-foreground" : ""}>
                                ${beforeProfit.toFixed(2)}
                              </span>
                              {profitChanged && (
                                <span className={`ml-1 font-semibold ${afterProfit >= beforeProfit ? "text-emerald-600" : "text-destructive"}`}>
                                  ${afterProfit.toFixed(2)}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewing(false)} disabled={saving}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm & apply to {targets.length}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface FieldRowProps {
  label: string;
  field: FieldState;
  onChange: (next: FieldState) => void;
  hint?: string;
}

const FieldRow = ({ label, field, onChange, hint }: FieldRowProps) => {
  const disabled = field.mode === "none";
  const suffix = field.mode === "addPct" ? "%" : "$";
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <Select value={field.mode} onValueChange={(v) => onChange({ ...field, mode: v as Mode })}>
          <SelectTrigger className="h-9 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODE_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Input
            type="number"
            step="0.01"
            value={field.value}
            disabled={disabled}
            onChange={(e) => onChange({ ...field, value: e.target.value })}
            placeholder={disabled ? "—" : "0.00"}
            className="pr-7"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        </div>
      </div>
      {hint && field.mode !== "none" && (
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
};

interface ImpactRowProps {
  label: string;
  before: number;
  after: number;
  isCurrency?: boolean;
  highlight?: boolean;
}

const ImpactRow = ({ label, before, after, isCurrency, highlight }: ImpactRowProps) => {
  const changed = Math.abs(after - before) > 0.005;
  const delta = round2(after - before);
  const deltaPositive = delta > 0;
  const fmt = (n: number) => (isCurrency ? `$${n.toFixed(2)}` : n.toFixed(2));
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className={changed ? "line-through text-muted-foreground" : ""}>{fmt(before)}</span>
        {changed && (
          <>
            <span className="text-muted-foreground">→</span>
            <span
              className={
                highlight
                  ? delta >= 1
                    ? "text-emerald-600 font-semibold"
                    : "text-destructive font-semibold"
                  : "font-semibold"
              }
            >
              {fmt(after)}
            </span>
            <span
              className={`text-xs ${deltaPositive ? "text-emerald-600" : "text-destructive"}`}
            >
              ({delta > 1 ? "+" : ""}
              {fmt(Math.abs(delta))})
            </span>
          </>
        )}
      </span>
    </div>
  );
};
