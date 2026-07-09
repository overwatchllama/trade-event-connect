import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Printer, RotateCw, History as HistoryIcon } from "lucide-react";

interface Row {
  id: string;
  action: string;
  source: string | null;
  preset: string | null;
  copies_per_item: number;
  per_quantity: boolean;
  item_ids: string[];
  item_count: number;
  label_count: number;
  reprint_count: number;
  filter_context: { search?: string; sort?: string } | null;
  created_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
  selection: "Selected rows",
  all_visible: "All visible",
  unprinted: "Unprinted only",
  reprint_printed: "Reprint printed (targeted)",
  reprint_view: "Reprint all printed in view",
};

export const PrintHistoryDialog = ({ open, onOpenChange, onReprintBatch }: { open: boolean; onOpenChange: (v: boolean) => void; onReprintBatch?: (itemIds: string[]) => void }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("label_print_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><HistoryIcon className="h-4 w-4" /> Label print history</DialogTitle>
          <DialogDescription>
            Your last 100 print and reprint actions, with the rows or filter that triggered each batch.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No prints yet.</div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto divide-y">
            {rows.map((r) => {
              const isReprint = r.reprint_count > 0;
              return (
                <div key={r.id} className="py-3 flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${isReprint ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"}`}>
                    {isReprint ? <RotateCw className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-medium text-sm">
                        {isReprint ? "Reprint" : "Print"} · {r.label_count} label{r.label_count === 1 ? "" : "s"}
                        <span className="text-muted-foreground font-normal"> across {r.item_count} item{r.item_count === 1 ? "" : "s"}</span>
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                        {SOURCE_LABELS[r.source ?? ""] ?? r.source ?? "—"}
                      </Badge>
                      {r.preset && <Badge variant="outline" className="text-[10px] py-0 px-1.5">{r.preset}</Badge>}
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">×{r.copies_per_item} cop{r.copies_per_item === 1 ? "y" : "ies"}</Badge>
                      {r.per_quantity && <Badge variant="outline" className="text-[10px] py-0 px-1.5">per unit</Badge>}
                      {r.reprint_count > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400">
                          {r.reprint_count} reprinted
                        </Badge>
                      )}
                      {r.filter_context?.search && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">search: "{r.filter_context.search}"</Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrintHistoryDialog;
