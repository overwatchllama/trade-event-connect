import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Plus, Trash2, Share2, Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { ImportFromUrlDialog } from "@/components/deals/ImportFromUrlDialog";
import TradeActions from "@/components/deals/TradeActions";
import InventoryLinkPicker from "@/components/deals/InventoryLinkPicker";

type Side = "input" | "output";
type Kind = "cash" | "card" | "store_credit";

type Line = {
  id: string;
  side: Side;
  kind: Kind;
  amount: number | null;
  card_name: string | null;
  set_name: string | null;
  card_number: string | null;
  condition: string | null;
  quantity: number;
  unit_value: number | null;
  notes: string | null;
  sort_order: number;
  deal_list_item_id: string | null;
};

type Proposal = {
  id: string;
  vendor_id: string;
  title: string;
  customer_name: string | null;
  notes: string | null;
  status: string;
  public_token: string;
  proposed_at: string | null;
};

const CONDITIONS = ["mint", "near_mint", "lightly_played", "moderately_played", "heavily_played", "damaged"];

function lineTotal(l: Line) {
  if (l.kind === "card") return (l.unit_value || 0) * (l.quantity || 1);
  return l.amount || 0;
}

export default function DealProposalEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState<Proposal | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingLinePatch = useRef<Record<string, Partial<Line>>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: pr, error: e1 }, { data: ls, error: e2 }] = await Promise.all([
        supabase.from("deal_proposals").select("*").eq("id", id).maybeSingle(),
        supabase.from("deal_proposal_lines").select("*").eq("proposal_id", id).order("sort_order"),
      ]);
      if (e1 || e2) toast.error(e1?.message || e2?.message || "Load failed");
      setP(pr as Proposal | null);
      setLines((ls as Line[]) || []);
      setLoading(false);
    })();
  }, [id]);

  const inputs = useMemo(() => lines.filter((l) => l.side === "input"), [lines]);
  const outputs = useMemo(() => lines.filter((l) => l.side === "output"), [lines]);
  const inputTotal = inputs.reduce((s, l) => s + lineTotal(l), 0);
  const outputTotal = outputs.reduce((s, l) => s + lineTotal(l), 0);

  const updateField = <K extends keyof Proposal>(k: K, v: Proposal[K], immediate = false) => {
    if (!p) return;
    const pid = p.id;
    setP((prev) => (prev ? { ...prev, [k]: v } : prev));
    const key = `p:${String(k)}`;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    const flush = () =>
      supabase.from("deal_proposals").update({ [k]: v }).eq("id", pid).then(({ error }) => {
        if (error) toast.error(error.message);
      });
    if (immediate) flush();
    else saveTimers.current[key] = setTimeout(flush, 500);
  };

  const addLine = async (side: Side, kind: Kind) => {
    if (!p) return;
    const sort_order = lines.filter((l) => l.side === side).length;
    const { data, error } = await supabase
      .from("deal_proposal_lines")
      .insert({
        proposal_id: p.id,
        side,
        kind,
        quantity: 1,
        sort_order,
        condition: kind === "card" ? "near_mint" : null,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    setLines((prev) => [...prev, data as Line]);
  };

  const updateLine = (lineId: string, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, ...patch } : l)));
    pendingLinePatch.current[lineId] = { ...(pendingLinePatch.current[lineId] || {}), ...patch };
    const key = `l:${lineId}`;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      const merged = pendingLinePatch.current[lineId];
      delete pendingLinePatch.current[lineId];
      if (!merged) return;
      supabase.from("deal_proposal_lines").update(merged).eq("id", lineId).then(({ error }) => {
        if (error) toast.error(error.message);
      });
    }, 500);
  };

  const removeLine = async (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
    await supabase.from("deal_proposal_lines").delete().eq("id", lineId);
  };

  const propose = async () => {
    if (!p) return;
    if (lines.length === 0) {
      toast.error("Add at least one line before proposing");
      return;
    }
    if (!p.title.trim()) {
      toast.error("Add a title before proposing");
      return;
    }
    const proposedAt = new Date().toISOString();
    const { error } = await supabase
      .from("deal_proposals")
      .update({ status: "proposed", proposed_at: proposedAt })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    setP({ ...p, status: "proposed", proposed_at: proposedAt });
    setShareOpen(true);
    toast.success("Proposal is now shareable");
  };

  const setStatus = async (status: string) => {
    if (!p) return;
    await supabase.from("deal_proposals").update({ status }).eq("id", p.id);
    setP({ ...p, status });
  };

  if (loading) return <div className="min-h-screen bg-background"><Header /><div className="container py-8">Loading…</div></div>;
  if (!p) return <div className="min-h-screen bg-background"><Header /><div className="container py-8">Not found.</div></div>;
  if (!user || p.vendor_id !== user.id) return <div className="min-h-screen bg-background"><Header /><div className="container py-8">Not authorized.</div></div>;

  const publicUrl = `${window.location.origin}/p/deal/${p.public_token}`;
  const isDraft = p.status === "draft";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/deal-proposals")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> All proposals
          </Button>
          <Badge variant="secondary" className="ml-auto capitalize">{p.status}</Badge>
        </div>

        <Card className="mb-4">
          <CardContent className="pt-6 space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={p.title} onChange={(e) => updateField("title", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Customer name (optional)</Label>
                <Input value={p.customer_name || ""} onChange={(e) => updateField("customer_name", e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <div className="h-10 flex items-center">
                  <Badge variant="secondary" className="capitalize">{p.status}</Badge>
                </div>
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={p.notes || ""} onChange={(e) => updateField("notes", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <LineSection
            title="Customer gives (inputs)"
            total={inputTotal}
            lines={inputs}
            kinds={["cash", "card"]}
            onAdd={(k) => addLine("input", k)}
            onUpdate={updateLine}
            onRemove={removeLine}
            userId={user.id}
            showInventoryLink={false}
          />
          <LineSection
            title="Vendor gives (outputs)"
            total={outputTotal}
            lines={outputs}
            kinds={["cash", "card", "store_credit"]}
            onAdd={(k) => addLine("output", k)}
            onUpdate={updateLine}
            onRemove={removeLine}
            userId={user.id}
            showInventoryLink={true}
          />
        </div>

        <TradeActions
          proposalId={p.id}
          vendorUserId={user.id}
          proposalTitle={p.title}
          status={p.status}
          onStatusChange={(status) => setP((prev) => (prev ? { ...prev, status } : prev))}
        />

        <Card className="mt-4">
          <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Inputs:</span> ${inputTotal.toFixed(2)} ·{" "}
              <span className="text-muted-foreground">Outputs:</span> ${outputTotal.toFixed(2)}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Link2 className="h-4 w-4 mr-1" /> Import from link
              </Button>
              {isDraft ? (
                <Button onClick={propose}>
                  <Share2 className="h-4 w-4 mr-1" /> Propose &amp; share
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setShareOpen(true)}>
                  <Share2 className="h-4 w-4 mr-1" /> Share link / QR
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <ImportFromUrlDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          proposalId={p.id}
          onImported={async () => {
            const { data: ls } = await supabase
              .from("deal_proposal_lines")
              .select("*")
              .eq("proposal_id", p.id)
              .order("sort_order");
            setLines((ls as Line[]) || []);
          }}
        />

        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Share with customer</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="bg-white p-3 rounded-md">
                <QRCodeSVG value={publicUrl} size={200} />
              </div>
              <div className="w-full flex gap-2">
                <Input readOnly value={publicUrl} className="text-xs" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Link to={`/p/deal/${p.public_token}`} target="_blank" className="text-sm text-primary underline">
                Open public view
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function LineSection({
  title,
  total,
  lines,
  kinds,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  total: number;
  lines: Line[];
  kinds: Kind[];
  onAdd: (k: Kind) => void;
  onUpdate: (id: string, patch: Partial<Line>) => void;
  onRemove: (id: string) => void;
}) {
  const labels: Record<Kind, string> = { cash: "Cash", card: "Card", store_credit: "Store credit" };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm font-normal text-muted-foreground">${total.toFixed(2)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lines.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
        {lines.map((l) => (
          <div key={l.id} className="border rounded-md p-3 space-y-2 bg-card">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="capitalize">{labels[l.kind]}</Badge>
              <Button size="icon" variant="ghost" onClick={() => onRemove(l.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {l.kind === "card" ? (
              <>
                <Input
                  placeholder="Card name"
                  value={l.card_name || ""}
                  onChange={(e) => onUpdate(l.id, { card_name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Set"
                    value={l.set_name || ""}
                    onChange={(e) => onUpdate(l.id, { set_name: e.target.value })}
                  />
                  <Input
                    placeholder="#"
                    value={l.card_number || ""}
                    onChange={(e) => onUpdate(l.id, { card_number: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={l.condition || "near_mint"} onValueChange={(v) => onUpdate(l.id, { condition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={l.quantity}
                    onChange={(e) => onUpdate(l.id, { quantity: parseInt(e.target.value) || 1 })}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="$ each"
                    value={l.unit_value ?? ""}
                    onChange={(e) => onUpdate(l.id, { unit_value: e.target.value === "" ? null : parseFloat(e.target.value) })}
                  />
                </div>
              </>
            ) : (
              <Input
                type="number"
                step="0.01"
                placeholder="$ amount"
                value={l.amount ?? ""}
                onChange={(e) => onUpdate(l.id, { amount: e.target.value === "" ? null : parseFloat(e.target.value) })}
              />
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-1">
          {kinds.map((k) => (
            <Button key={k} variant="outline" size="sm" onClick={() => onAdd(k)}>
              <Plus className="h-3 w-3 mr-1" /> {labels[k]}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
