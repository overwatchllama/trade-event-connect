import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { TenderEntry } from "./ticketReducer";

const METHODS = ["Cash", "Card", "Venmo", "Zelle", "Store credit", "Other"];

type Props = {
  target: number;
  tender: TenderEntry[];
  onChange: (t: TenderEntry[]) => void;
};

export function TenderBar({ target, tender, onChange }: Props) {
  const paid = tender.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const diff = +(paid - target).toFixed(2);

  const quick = (method: string) => {
    onChange([...tender, { method, amount: +(target - paid).toFixed(2) }]);
  };
  const setAmount = (i: number, amount: number) => {
    const next = tender.slice();
    next[i] = { ...next[i], amount };
    onChange(next);
  };
  const remove = (i: number) => onChange(tender.filter((_, j) => j !== i));

  const statusBadge =
    diff === 0 ? (
      <Badge className="bg-green-600 hover:bg-green-600">Balanced</Badge>
    ) : diff < 0 ? (
      <Badge variant="destructive">Short ${Math.abs(diff).toFixed(2)}</Badge>
    ) : (
      <Badge variant="outline">Over ${diff.toFixed(2)}</Badge>
    );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {METHODS.map((m) => (
          <Button
            key={m}
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => quick(m)}
            type="button"
          >
            + {m}
          </Button>
        ))}
      </div>
      {tender.length > 0 && (
        <div className="space-y-1.5">
          {tender.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs w-24 text-muted-foreground">{t.method}</span>
              <Input
                type="number"
                step="0.01"
                value={t.amount}
                onChange={(e) => setAmount(i, parseFloat(e.target.value) || 0)}
                className="h-8"
              />
              <Button size="icon" variant="ghost" onClick={() => remove(i)} type="button" className="h-7 w-7">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-sm pt-1 border-t">
        <span className="text-muted-foreground">Target ${target.toFixed(2)} · Paid ${paid.toFixed(2)}</span>
        {statusBadge}
      </div>
    </div>
  );
}
