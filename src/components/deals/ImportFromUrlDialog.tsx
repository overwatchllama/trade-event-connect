import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";

type Side = "input" | "output";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, imported cards are appended to this proposal. Omit to create a new draft. */
  proposalId?: string;
  /** Called after success with the resulting proposal id and count. */
  onImported: (result: { proposalId: string; imported: number }) => void;
}

/**
 * Paste a Collector Companion, TCGplayer, or eBay URL and import cards as deal lines.
 * - Collector Companion: read directly from our DB (no scraping).
 * - TCGplayer / eBay: scraped server-side via Firecrawl and parsed by AI.
 */
export const ImportFromUrlDialog = ({
  open,
  onOpenChange,
  proposalId,
  onImported,
}: Props) => {
  const [url, setUrl] = useState("");
  const [side, setSide] = useState<Side>("input");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Paste a URL first");
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      toast.error("That doesn't look like a valid URL");
      return;
    }
    setBusy(true);
    const toastId = toast.loading("Importing cards…");
    try {
      const { data, error } = await supabase.functions.invoke("import-deal-cards", {
        body: {
          url: trimmed,
          side,
          proposal_id: proposalId ?? null,
          create_new: !proposalId,
        },
      });
      if (error) throw error;
      // deno-lint-ignore no-explicit-any
      const res = data as any;
      if (!res?.success) throw new Error(res?.error || "Import failed");
      toast.success(`Imported ${res.imported} card${res.imported === 1 ? "" : "s"}`, {
        id: toastId,
      });
      onImported({ proposalId: res.proposal_id, imported: res.imported });
      setUrl("");
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg, { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import cards from a link</DialogTitle>
          <DialogDescription>
            Paste a Collector Companion deal/storefront link, a TCGplayer page, or an eBay listing.
            We&apos;ll extract the cards and add them to {proposalId ? "this proposal" : "a new draft"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="import-url">URL</Label>
            <Input
              id="import-url"
              placeholder="https://www.tcgplayer.com/… or https://www.ebay.com/itm/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Add to which side?</Label>
            <RadioGroup
              value={side}
              onValueChange={(v) => setSide(v as Side)}
              className="grid grid-cols-2 gap-2"
            >
              <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer">
                <RadioGroupItem value="input" id="side-input" />
                <span className="text-sm">Customer gives</span>
              </label>
              <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer">
                <RadioGroupItem value="output" id="side-output" />
                <span className="text-sm">Vendor gives</span>
              </label>
            </RadioGroup>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={run} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
