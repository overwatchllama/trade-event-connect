import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer } from "lucide-react";

export interface PrintLabelItem {
  id: string;
  card_name: string;
  set_name?: string | null;
  card_number?: string | null;
  condition?: string | null;
  purchase_price?: number | null;
  target_sell_price?: number | null;
  quantity?: number;
  label_printed_at?: string | null;
  label_print_count?: number;
}

export interface PrintLabelsMeta {
  preset: string;
  copies: number;
  perQuantity: boolean;
  labelCount: number;
  reprintCount: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: PrintLabelItem[];
  onPrinted?: (printedIds: string[], meta: PrintLabelsMeta) => void | Promise<void>;
}

type Preset = "avery-5160" | "avery-5163" | "dymo-30252" | "brother-dk1201";

const PRESETS: Record<Preset, { name: string; cols: number; rows: number; w: string; h: string; pageW: string; pageH: string; gapX: string; gapY: string; padX: string; padY: string }> = {
  "avery-5160": { name: "Avery 5160 (1\" × 2⅝\", 30/sheet)", cols: 3, rows: 10, w: "2.625in", h: "1in", pageW: "8.5in", pageH: "11in", gapX: "0.125in", gapY: "0in", padX: "0.1875in", padY: "0.5in" },
  "avery-5163": { name: "Avery 5163 (2\" × 4\", 10/sheet)", cols: 2, rows: 5, w: "4in", h: "2in", pageW: "8.5in", pageH: "11in", gapX: "0.125in", gapY: "0in", padX: "0.15625in", padY: "0.5in" },
  "dymo-30252": { name: "DYMO 30252 (1.125\" × 3.5\", roll)", cols: 1, rows: 1, w: "3.5in", h: "1.125in", pageW: "3.5in", pageH: "1.125in", gapX: "0in", gapY: "0in", padX: "0in", padY: "0in" },
  "brother-dk1201": { name: "Brother DK-1201 (29mm × 90mm, roll)", cols: 1, rows: 1, w: "90mm", h: "29mm", pageW: "90mm", pageH: "29mm", gapX: "0in", gapY: "0in", padX: "0in", padY: "0in" },
};

const fmt = (n?: number | null) =>
  n == null ? "" : n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const PrintLabelsDialog = ({ open, onOpenChange, items, onPrinted }: Props) => {
  const [preset, setPreset] = useState<Preset>("brother-dk1201");
  const [copies, setCopies] = useState(1);
  const [perQuantity, setPerQuantity] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  const expanded = useMemo(() => {
    const out: PrintLabelItem[] = [];
    items.forEach((it) => {
      const n = (perQuantity ? Math.max(1, it.quantity ?? 1) : 1) * Math.max(1, copies);
      for (let i = 0; i < n; i++) out.push(it);
    });
    return out;
  }, [items, copies, perQuantity]);

  const cfg = PRESETS[preset];

  // Render preview barcodes
  useEffect(() => {
    if (!open || !previewRef.current) return;
    const svgs = previewRef.current.querySelectorAll<SVGElement>("svg[data-barcode]");
    svgs.forEach((svg) => {
      const val = svg.getAttribute("data-barcode") || "";
      try {
        JsBarcode(svg, val, { format: "CODE128", width: 1.4, height: 36, displayValue: false, margin: 0 });
      } catch {
        // ignore
      }
    });
  }, [open, expanded, preset, showPrice]);

  const buildPrintHtml = () => {
    // Generate SVG barcodes server-style via JsBarcode in this window, then serialize
    const labels = expanded
      .map((it) => {
        // Create an off-DOM SVG, render barcode, get outerHTML
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        try {
          JsBarcode(svg, it.id, { format: "CODE128", width: 1.6, height: 48, displayValue: false, margin: 0 });
        } catch {}
        const barcodeHtml = svg.outerHTML;
        const setLine = [it.set_name, it.card_number && `#${it.card_number}`].filter(Boolean).join(" · ");
        const conditionTxt = it.condition?.replace(/_/g, " ").toUpperCase() ?? "";
        const priceVal = it.target_sell_price ?? it.purchase_price;
        const priceLine = showPrice && priceVal != null
          ? `<div class="price">${it.target_sell_price != null ? fmt(it.target_sell_price) : `cost ${fmt(it.purchase_price!)}`}</div>`
          : "";
        return `
          <div class="label">
            <div class="header">
              <div class="title">${escapeHtml(it.card_name)}</div>
              ${conditionTxt ? `<div class="cond">${escapeHtml(conditionTxt)}</div>` : ""}
            </div>
            <div class="meta">${escapeHtml(setLine)}</div>
            <div class="barcode">${barcodeHtml}</div>
            <div class="row"><div class="code">${escapeHtml(it.id.slice(0, 8))}</div>${priceLine}</div>
          </div>
        `;
      })
      .join("");

    return `<!doctype html>
<html><head><meta charset="utf-8" /><title>Inventory labels</title>
<style>
  @page { size: ${cfg.pageW} ${cfg.pageH}; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; }
  .sheet {
    width: ${cfg.pageW}; min-height: ${cfg.pageH};
    padding: ${cfg.padY} ${cfg.padX};
    display: grid;
    grid-template-columns: repeat(${cfg.cols}, ${cfg.w});
    grid-auto-rows: ${cfg.h};
    column-gap: ${cfg.gapX}; row-gap: ${cfg.gapY};
    page-break-after: always;
  }
  .label {
    width: ${cfg.w}; height: ${cfg.h};
    padding: 0.06in 0.1in;
    overflow: hidden;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .title { font-size: 9pt; font-weight: 700; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .meta { font-size: 7pt; color: #333; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .barcode { display: flex; justify-content: center; align-items: center; flex: 1; min-height: 0; }
  .barcode svg { width: 100%; height: 100%; }
  .row { display: flex; justify-content: space-between; align-items: center; font-size: 6.5pt; color: #000; }
  .code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.02em; }
  .price { font-weight: 700; }
  @media print { .sheet { page-break-after: always; } }
</style></head>
<body>${chunkIntoSheets(labels, cfg.cols * cfg.rows)}
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150));</script>
</body></html>`;
  };

  const handlePrint = async () => {
    if (expanded.length === 0) return;
    const html = buildPrintHtml();
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    const uniqueIds = Array.from(new Set(items.map((i) => i.id)));
    const reprintCountLocal = items.filter((i) => i.label_printed_at).length;
    try {
      await onPrinted?.(uniqueIds, {
        preset,
        copies,
        perQuantity,
        labelCount: expanded.length,
        reprintCount: reprintCountLocal,
      });
    } catch {
      // ignore
    }
    onOpenChange(false);
  };

  const reprintCount = items.filter((i) => i.label_printed_at).length;
  const isReprint = reprintCount > 0 && reprintCount === items.length;
  const isMixed = reprintCount > 0 && reprintCount < items.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            {isReprint ? "Reprint inventory labels" : "Print inventory labels"}
          </DialogTitle>
          <DialogDescription>
            {isReprint
              ? `Regenerating labels for ${reprintCount} previously-printed item${reprintCount === 1 ? "" : "s"}. New barcodes encode the same item IDs so existing scans still match.`
              : isMixed
                ? `${items.length - reprintCount} new + ${reprintCount} reprint. Code 128 barcodes encode each item's ID for scanning at checkout, restock, or sale.`
                : "Generates Code 128 barcodes encoded with each item's ID so you can re-scan at checkout, restock, or sale."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Label stock</Label>
            <RadioGroup value={preset} onValueChange={(v) => setPreset(v as Preset)} className="grid sm:grid-cols-2 gap-2">
              {(Object.keys(PRESETS) as Preset[]).map((k) => (
                <label key={k} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value={k} id={k} />
                  <span className="text-sm">{PRESETS[k].name}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="copies">Copies per item</Label>
              <Input id="copies" type="number" min={1} value={copies} onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
            <div className="flex flex-col gap-2 justify-end pb-1">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={perQuantity} onCheckedChange={(v) => setPerQuantity(!!v)} />
                One label per unit (use quantity)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={showPrice} onCheckedChange={(v) => setShowPrice(!!v)} />
                Show price on label
              </label>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Preview ({expanded.length} label{expanded.length === 1 ? "" : "s"})</Label>
            <div ref={previewRef} className="rounded-md border bg-muted/30 p-3 max-h-64 overflow-auto">
              <div className="grid grid-cols-3 gap-2">
                {expanded.slice(0, 9).map((it, idx) => (
                  <div key={idx} className="rounded bg-background border p-2 text-[10px]">
                    <div className="font-semibold truncate">{it.card_name}</div>
                    <div className="text-muted-foreground truncate">
                      {[it.set_name, it.card_number && `#${it.card_number}`].filter(Boolean).join(" · ")}
                    </div>
                    <svg data-barcode={it.id} className="w-full h-10 my-1" />
                    <div className="flex justify-between font-mono">
                      <span>{it.id.slice(0, 8)}</span>
                      {showPrice && <span className="font-semibold">{fmt(it.target_sell_price ?? it.purchase_price)}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {expanded.length > 9 && (
                <p className="text-xs text-muted-foreground mt-2">+ {expanded.length - 9} more…</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePrint} disabled={expanded.length === 0}>
            <Printer className="h-4 w-4 mr-2" /> Print {expanded.length} label{expanded.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function chunkIntoSheets(labelsHtml: string, perSheet: number) {
  // Split the joined label HTML by occurrences of `<div class="label">` and group
  const parts = labelsHtml.split(/(?=<div class="label">)/g).filter(Boolean);
  if (parts.length === 0) return "";
  const sheets: string[] = [];
  for (let i = 0; i < parts.length; i += perSheet) {
    sheets.push(`<div class="sheet">${parts.slice(i, i + perSheet).join("")}</div>`);
  }
  return sheets.join("");
}

export default PrintLabelsDialog;
