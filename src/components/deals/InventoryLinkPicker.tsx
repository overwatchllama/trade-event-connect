import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Loader2, X } from "lucide-react";

interface Props {
  userId: string;
  value: string | null;
  cardName?: string | null;
  setName?: string | null;
  onChange: (id: string | null, meta?: {
    card_name: string;
    set_name: string | null;
    card_number: string | null;
    condition: string | null;
    unit_value: number | null;
  }) => void;
}

interface Row {
  id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  condition: string | null;
  target_sell_price: number | null;
  purchase_price: number | null;
}

export default function InventoryLinkPicker({
  userId,
  value,
  cardName,
  setName,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(cardName || "");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkedLabel, setLinkedLabel] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Load label for currently-linked row.
  useEffect(() => {
    if (!value) {
      setLinkedLabel(null);
      return;
    }
    supabase
      .from("deal_list_items")
      .select("card_name, set_name")
      .eq("id", value)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLinkedLabel(`${data.card_name}${data.set_name ? " · " + data.set_name : ""}`);
      });
  }, [value]);

  // Debounced search when open.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("deal_list_items")
        .select("id, card_name, set_name, card_number, condition, target_sell_price, purchase_price")
        .eq("user_id", userId)
        .eq("status", "bought")
        .neq("listing_status", "sold")
        .ilike("card_name", `%${q}%`)
        .limit(8);
      if (!cancelled) setRows((data as Row[]) ?? []);
      setLoading(false);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open, userId]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Link2 className="h-3 w-3" />
          <span className="truncate max-w-[180px]">{linkedLabel || "Linked inventory"}</span>
        </Badge>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => onChange(null)}
          aria-label="Unlink inventory"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => {
          setOpen(true);
          setQuery(cardName || "");
        }}
      >
        <Link2 className="h-3 w-3 mr-1" /> Link inventory
      </Button>
      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-md border bg-popover shadow-md p-2">
          <div className="flex items-center gap-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your inventory…"
              className="h-8 text-sm"
              autoFocus
            />
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <div className="mt-2 max-h-56 overflow-auto">
            {rows.length === 0 && query.length >= 2 && !loading && (
              <div className="text-xs text-muted-foreground py-2 text-center">No matches</div>
            )}
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onChange(r.id, {
                    card_name: r.card_name,
                    set_name: r.set_name,
                    card_number: r.card_number,
                    condition: r.condition,
                    unit_value: r.target_sell_price ?? r.purchase_price ?? null,
                  });
                  setOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
              >
                <div className="font-medium truncate">{r.card_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[r.set_name, r.card_number, r.condition].filter(Boolean).join(" · ") || "—"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
