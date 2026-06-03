import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Helmet } from "react-helmet-async";
import { Copy, Check } from "lucide-react";

type Line = {
  id: string;
  side: "input" | "output";
  kind: "cash" | "card" | "store_credit";
  amount: number | null;
  card_name: string | null;
  set_name: string | null;
  card_number: string | null;
  condition: string | null;
  quantity: number;
  unit_value: number | null;
};

type Proposal = {
  id: string;
  title: string;
  customer_name: string | null;
  notes: string | null;
  status: string;
  proposed_at: string | null;
};

const KIND_LABEL = { cash: "Cash", card: "Card", store_credit: "Store credit" };

function lineTotal(l: Line) {
  if (l.kind === "card") return (l.unit_value || 0) * (l.quantity || 1);
  return l.amount || 0;
}

export default function PublicDealProposal() {
  const { token } = useParams();
  const [p, setP] = useState<Proposal | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: pr } = await supabase
        .from("deal_proposals")
        .select("id,title,customer_name,notes,status,proposed_at")
        .eq("public_token", token)
        .maybeSingle();
      if (pr) {
        const { data: ls } = await supabase
          .from("deal_proposal_lines")
          .select("*")
          .eq("proposal_id", pr.id)
          .order("sort_order");
        setLines((ls as Line[]) || []);
      }
      setP(pr as Proposal | null);
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!p) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">This proposal is unavailable.</div>;

  const inputs = lines.filter((l) => l.side === "input");
  const outputs = lines.filter((l) => l.side === "output");
  const inputTotal = inputs.reduce((s, l) => s + lineTotal(l), 0);
  const outputTotal = outputs.reduce((s, l) => s + lineTotal(l), 0);
  const url = typeof window !== "undefined" ? `${window.location.origin}/p/deal/${token}` : `/p/deal/${token}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{p.title} · Deal Proposal</title>
        <meta name="description" content={`Trade proposal: ${p.title}`} />
      </Helmet>
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-6">
          <Badge variant="secondary" className="capitalize mb-2">{p.status}</Badge>
          <h1 className="text-2xl font-bold">{p.title}</h1>
          {p.customer_name && <p className="text-muted-foreground">For {p.customer_name}</p>}
          {p.proposed_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Proposed {new Date(p.proposed_at).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Section title="You give" total={inputTotal} lines={inputs} />
          <Section title="You receive" total={outputTotal} lines={outputs} />
        </div>

        {p.notes && (
          <Card className="mt-4">
            <CardContent className="pt-4 text-sm whitespace-pre-wrap">{p.notes}</CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader className="pb-2"><CardTitle className="text-base">Share this proposal</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-md"><QRCodeSVG value={url} size={160} /></div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <><Check className="h-4 w-4 mr-1" /> Copied</> : <><Copy className="h-4 w-4 mr-1" /> Copy link</>}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          View-only · Only the vendor can edit this proposal.
        </p>
      </main>
    </div>
  );
}

function Section({ title, total, lines }: { title: string; total: number; lines: Line[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm font-normal text-muted-foreground">${total.toFixed(2)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {lines.length === 0 && <p className="text-sm text-muted-foreground">Nothing listed.</p>}
        {lines.map((l) => (
          <div key={l.id} className="border rounded-md p-2 text-sm">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">{KIND_LABEL[l.kind]}</Badge>
              <span className="font-medium">${lineTotal(l).toFixed(2)}</span>
            </div>
            {l.kind === "card" ? (
              <div className="mt-1">
                <div className="font-medium">{l.card_name || "Unnamed card"}</div>
                <div className="text-xs text-muted-foreground">
                  {[l.set_name, l.card_number && `#${l.card_number}`, l.condition?.replace(/_/g, " "), `×${l.quantity}`]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-1">${(l.amount || 0).toFixed(2)}</div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
