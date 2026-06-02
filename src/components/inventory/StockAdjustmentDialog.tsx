import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, ClipboardCheck } from "lucide-react";

export interface AdjustableItem {
  id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  condition: string;
  quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AdjustableItem[];
  onApplied?: (updated: Map<string, number>) => void;
  defaultReason?: string;
}

const REASONS = [
  { value: "count", label: "Physical count" },
  { value: "sold_offline", label: "Sold offline" },
  { value: "damaged", label: "Damaged / lost" },
  { value: "found", label: "Found / recovered" },
  { value: "correction", label: "Correction" },
  { value: "other", label: "Other" },
];

export const StockAdjustmentDialog = ({ open, onOpenChange, items, onApplied, defaultReason = "count" }: Props) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [lineNotes, setLineNotes] = useState<Record<string, string>>({});
  const [reason, setReason] = useState(defaultReason);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const seed: Record<string, string> = {};
      for (const i of items) seed[i.id] = String(i.quantity);
      setCounts(seed);
      setReason(defaultReason);
      setNotes("");
    }
  }, [open, items, defaultReason]);

  const changes = useMemo(() => {
    const list: { item: AdjustableItem; counted: number; delta: number }[] = [];
    for (const i of items) {
      const raw = counts[i.id];
      if (raw === undefined || raw === "") continue;
      const counted = Number(raw);
      if (!Number.isFinite(counted) || counted < 0 || !Number.isInteger(counted)) continue;
      const delta = counted - i.quantity;
      if (delta !== 0) list.push({ item: i, counted, delta });
    }
    return list;
  }, [items, counts]);

  const totalDelta = changes.reduce((a, c) => a + c.delta, 0);

  const apply = async () => {
    if (!user || changes.length === 0) return;
    setSaving(true);
    const updatedMap = new Map<string, number>();
    try {
      // Update quantities
      for (const c of changes) {
        const { error } = await supabase
          .from("deal_list_items")
          .update({ quantity: c.counted })
          .eq("id", c.item.id);
        if (error) throw error;
        updatedMap.set(c.item.id, c.counted);
      }
      // Insert audit rows
      const auditRows = changes.map((c) => ({
        user_id: user.id,
        item_id: c.item.id,
        previous_quantity: c.item.quantity,
        counted_quantity: c.counted,
        delta: c.delta,
        reason,
        notes: notes.trim() || null,
        source: items.length > 1 ? "bulk" : "single",
      }));
      const { error: auditErr } = await supabase.from("stock_adjustments").insert(auditRows);
      if (auditErr) throw auditErr;

      toast({
        title: `Adjusted ${changes.length} item${changes.length > 1 ? "s" : ""}`,
        description: `Net change: ${totalDelta > 0 ? "+" : ""}${totalDelta} unit${Math.abs(totalDelta) === 1 ? "" : "s"}.`,
      });
      onApplied?.(updatedMap);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed to apply adjustments", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" /> Adjust stock from count
          </DialogTitle>
          <DialogDescription>
            Enter the counted quantity for each item. Differences are saved and a record is added to the audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right w-20">On hand</TableHead>
                <TableHead className="text-right w-28">Counted</TableHead>
                <TableHead className="text-right w-20">Δ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => {
                const raw = counts[i.id] ?? "";
                const counted = raw === "" ? null : Number(raw);
                const delta = counted == null || !Number.isFinite(counted) ? null : counted - i.quantity;
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium leading-tight">{i.card_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[i.set_name, i.card_number && `#${i.card_number}`, i.condition.replace("_", " ")].filter(Boolean).join(" · ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{i.quantity}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={raw}
                        onChange={(e) => setCounts((c) => ({ ...c, [i.id]: e.target.value }))}
                        className="h-8 w-20 ml-auto text-right"
                      />
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        delta == null || delta === 0
                          ? "text-muted-foreground"
                          : delta > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      }`}
                    >
                      {delta == null ? "—" : delta > 0 ? `+${delta}` : delta}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {changes.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                Variance review
              </div>
              <div className="text-xs text-muted-foreground">
                {changes.length} item{changes.length > 1 ? "s" : ""} will change
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto rounded border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8">Item</TableHead>
                    <TableHead className="h-8 text-right w-20">Expected</TableHead>
                    <TableHead className="h-8 text-right w-20">Counted</TableHead>
                    <TableHead className="h-8 text-right w-16">Δ</TableHead>
                    <TableHead className="h-8 text-right w-20">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changes.map(({ item, counted, delta }) => {
                    const pct = item.quantity === 0
                      ? counted > 0 ? Infinity : 0
                      : (delta / item.quantity) * 100;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="py-1.5">
                          <div className="text-sm font-medium leading-tight truncate max-w-[220px]">{item.card_name}</div>
                        </TableCell>
                        <TableCell className="py-1.5 text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="py-1.5 text-right tabular-nums">{counted}</TableCell>
                        <TableCell className={`py-1.5 text-right tabular-nums font-medium ${delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </TableCell>
                        <TableCell className={`py-1.5 text-right tabular-nums text-xs ${delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {pct === Infinity ? "new" : `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div className="rounded bg-background border p-2">
                <div className="text-muted-foreground">Units added</div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{changes.filter(c => c.delta > 0).reduce((a, c) => a + c.delta, 0)}
                </div>
              </div>
              <div className="rounded bg-background border p-2">
                <div className="text-muted-foreground">Units removed</div>
                <div className="font-semibold text-destructive tabular-nums">
                  {changes.filter(c => c.delta < 0).reduce((a, c) => a + c.delta, 0)}
                </div>
              </div>
              <div className="rounded bg-background border p-2">
                <div className="text-muted-foreground">Net change</div>
                <div className={`font-semibold tabular-nums ${totalDelta === 0 ? "" : totalDelta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  {totalDelta > 0 ? "+" : ""}{totalDelta}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="adj-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="adj-reason" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="adj-notes">Notes (optional)</Label>
            <Textarea
              id="adj-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context for this count…"
              className="mt-1 min-h-[40px]"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-3 sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {changes.length === 0
              ? "No changes yet."
              : `${changes.length} change${changes.length > 1 ? "s" : ""} · net ${totalDelta > 0 ? "+" : ""}${totalDelta}`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={apply} disabled={saving || changes.length === 0}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply adjustments
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
