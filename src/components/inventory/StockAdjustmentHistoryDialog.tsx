import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { History, Loader2, Pencil, Save, X, ChevronDown, ChevronRight } from "lucide-react";

interface NoteEdit {
  previous: string | null;
  next: string | null;
  edited_at: string;
  edited_by: string;
}

interface Row {
  id: string;
  item_id: string;
  previous_quantity: number;
  counted_quantity: number;
  delta: number;
  reason: string | null;
  notes: string | null;
  notes_history: NoteEdit[] | null;
  notes_updated_at: string | null;
  created_at: string;
  card_name?: string;
  set_name?: string | null;
  card_number?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemIds?: string[];
}

export const StockAdjustmentHistoryDialog = ({ open, onOpenChange, itemIds }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setLoading(true);
      try {
        let q = supabase
          .from("stock_adjustments")
          .select("id,item_id,previous_quantity,counted_quantity,delta,reason,notes,notes_history,notes_updated_at,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200);
        if (itemIds && itemIds.length > 0) q = q.in("item_id", itemIds);
        const { data, error } = await q;
        if (error) throw error;
        const adj = (data ?? []) as any[];
        const ids = Array.from(new Set(adj.map((r) => r.item_id)));
        let itemMap = new Map<string, { card_name: string; set_name: string | null; card_number: string | null }>();
        if (ids.length > 0) {
          const { data: items } = await supabase
            .from("deal_list_items")
            .select("id,card_name,set_name,card_number")
            .in("id", ids);
          for (const it of items ?? []) itemMap.set((it as any).id, it as any);
        }
        setRows(
          adj.map((r) => {
            const it = itemMap.get(r.item_id);
            return { ...r, card_name: it?.card_name, set_name: it?.set_name, card_number: it?.card_number };
          })
        );
      } catch (e: any) {
        toast({ title: "Failed to load history", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user, itemIds]);

  const startEdit = (row: Row) => {
    setEditingId(row.id);
    setDraft(row.notes ?? "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
  };

  const saveEdit = async (row: Row) => {
    if (!user) return;
    const next = draft.trim() || null;
    const previous = row.notes;
    if ((previous ?? "") === (next ?? "")) {
      cancelEdit();
      return;
    }
    setSavingId(row.id);
    try {
      const entry: NoteEdit = {
        previous,
        next,
        edited_at: new Date().toISOString(),
        edited_by: user.id,
      };
      const history = [...(row.notes_history ?? []), entry];
      const { error } = await supabase
        .from("stock_adjustments")
        .update({
          notes: next,
          notes_history: history as any,
          notes_updated_at: entry.edited_at,
          notes_updated_by: user.id,
        })
        .eq("id", row.id);
      if (error) throw error;
      setRows((rs) =>
        rs.map((r) =>
          r.id === row.id
            ? { ...r, notes: next, notes_history: history, notes_updated_at: entry.edited_at }
            : r
        )
      );
      toast({ title: "Note updated", description: "Edit recorded in audit trail." });
      cancelEdit();
    } catch (e: any) {
      toast({ title: "Failed to update note", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Stock adjustment history
          </DialogTitle>
          <DialogDescription>
            Edit notes on past adjustments. Every edit is recorded in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No adjustments yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>When</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right w-20">Prev</TableHead>
                  <TableHead className="text-right w-20">Counted</TableHead>
                  <TableHead className="text-right w-16">Δ</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="min-w-[260px]">Notes</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const editing = editingId === r.id;
                  const editCount = r.notes_history?.length ?? 0;
                  const isExpanded = expanded.has(r.id);
                  return (
                    <>
                      <TableRow key={r.id}>
                        <TableCell className="p-1">
                          {editCount > 0 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(r.id)} aria-label="Toggle history">
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium leading-tight">{r.card_name ?? "(deleted item)"}</div>
                          <div className="text-xs text-muted-foreground">
                            {[r.set_name, r.card_number && `#${r.card_number}`].filter(Boolean).join(" · ")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.previous_quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.counted_quantity}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${r.delta > 0 ? "text-emerald-600 dark:text-emerald-400" : r.delta < 0 ? "text-destructive" : ""}`}>
                          {r.delta > 0 ? `+${r.delta}` : r.delta}
                        </TableCell>
                        <TableCell className="text-xs">{r.reason ?? "—"}</TableCell>
                        <TableCell>
                          {editing ? (
                            <Input
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              autoFocus
                              className="h-8 text-xs"
                              placeholder="Add or update note"
                            />
                          ) : (
                            <div className="text-xs whitespace-pre-wrap">
                              {r.notes || <span className="text-muted-foreground italic">—</span>}
                              {editCount > 0 && (
                                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                                  edited {editCount}×
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editing ? (
                            <div className="flex gap-1 justify-end">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(r)} disabled={savingId === r.id} aria-label="Save">
                                {savingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit} disabled={savingId === r.id} aria-label="Cancel">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(r)} aria-label="Edit note">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && editCount > 0 && (
                        <TableRow key={`${r.id}-h`} className="bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={8} className="py-2">
                            <div className="text-xs font-semibold mb-1">Edit history</div>
                            <ol className="space-y-1.5 text-xs">
                              {(r.notes_history ?? []).slice().reverse().map((h, idx) => (
                                <li key={idx} className="rounded border bg-background p-2">
                                  <div className="text-[11px] text-muted-foreground">
                                    {new Date(h.edited_at).toLocaleString()}
                                  </div>
                                  <div className="grid sm:grid-cols-2 gap-2 mt-1">
                                    <div>
                                      <div className="text-[10px] uppercase text-muted-foreground">Before</div>
                                      <div className="whitespace-pre-wrap">{h.previous || <span className="italic text-muted-foreground">—</span>}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] uppercase text-muted-foreground">After</div>
                                      <div className="whitespace-pre-wrap">{h.next || <span className="italic text-muted-foreground">—</span>}</div>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ol>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
