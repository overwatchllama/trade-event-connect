import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanLine, Search } from "lucide-react";
import { lookupInventoryById, type InventoryRow } from "@/hooks/useInventoryQuery";
import { toast } from "sonner";

type Props = {
  onScan: (row: InventoryRow) => void;
  onManualSearch?: (query: string) => void;
  placeholder?: string;
};

export function ScanBar({ onScan, onManualSearch, placeholder }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    // UUID-ish → inventory lookup; otherwise pass to manual search
    if (/^[0-9a-f-]{20,}$/i.test(q)) {
      const row = await lookupInventoryById(q);
      if (row) {
        onScan(row);
        setValue("");
        ref.current?.focus();
        return;
      }
      toast.error("No inventory match for that barcode");
      return;
    }
    onManualSearch?.(q);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <div className="relative flex-1">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? "Scan barcode or search card name…"}
          className="pl-9 h-11 text-base"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <Button type="submit" size="lg" variant="secondary">
        <Search className="h-4 w-4 mr-1" /> Add
      </Button>
    </form>
  );
}
