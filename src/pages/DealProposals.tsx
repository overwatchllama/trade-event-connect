import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";

type Proposal = {
  id: string;
  title: string;
  customer_name: string | null;
  status: string;
  public_token: string;
  updated_at: string;
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  proposed: "bg-primary/10 text-primary",
  accepted: "bg-green-500/10 text-green-600",
  declined: "bg-destructive/10 text-destructive",
  completed: "bg-blue-500/10 text-blue-600",
};

export default function DealProposals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Proposal[] | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("deal_proposals")
        .select("id,title,customer_name,status,public_token,updated_at")
        .eq("vendor_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) toast.error(error.message);
      setItems((data as Proposal[]) || []);
    })();
  }, [user]);

  const create = async () => {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("deal_proposals")
      .insert({ vendor_id: user.id, title: newTitle.trim() || "Deal Proposal" })
      .select("id")
      .single();
    setCreating(false);
    if (error) return toast.error(error.message);
    navigate(`/deal-proposals/${data.id}`);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this proposal?")) return;
    const { error } = await supabase.from("deal_proposals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((p) => p?.filter((x) => x.id !== id) ?? null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Deal Proposals</h1>
          <p className="text-muted-foreground mt-1">
            Build a trade or buyout offer and share a public link / QR with the customer.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">New proposal</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-col sm:flex-row">
            <Input
              placeholder="Title (e.g. John's binder buyout)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
            <Button onClick={create} disabled={creating}>
              <Plus className="h-4 w-4 mr-1" /> Create
            </Button>
          </CardContent>
        </Card>

        {items === null ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No proposals yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <Card key={p.id} className="hover:bg-accent/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <Link to={`/deal-proposals/${p.id}`} className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.title}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {p.customer_name || "—"} · updated{" "}
                      {new Date(p.updated_at).toLocaleDateString()}
                    </div>
                  </Link>
                  <Badge className={statusColors[p.status] || ""}>{p.status}</Badge>
                  {p.status !== "draft" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild
                      title="Open public view"
                    >
                      <a href={`/p/deal/${p.public_token}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
