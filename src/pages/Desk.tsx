import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import { TradeTicket } from "@/components/desk/TradeTicket";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function Desk() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"sell" | "buy" | "trade" | "ledger">("sell");

  useEffect(() => {
    document.title = "Trade Desk — Buy, sell, and trade in one place";
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Trade Desk</h1>
          <p className="text-sm text-muted-foreground">
            One screen for buying, selling, and trading. Scans, cost basis, and inventory update automatically.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="sell">Sell</TabsTrigger>
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="trade">Trade</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="sell" className="mt-4">
            <TradeTicket mode="sell" />
          </TabsContent>
          <TabsContent value="buy" className="mt-4">
            <TradeTicket mode="buy" />
          </TabsContent>
          <TabsContent value="trade" className="mt-4">
            <TradeTicket mode="trade" />
          </TabsContent>
          <TabsContent value="ledger" className="mt-4">
            <RecentLedger userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function RecentLedger({ userId }: { userId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("transactions" as any)
        .select("id, kind, status, total, customer_label, occurred_at, payment_method")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(50);
      if (!cancelled) setRows((data as any[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Card className="p-3">
      <h3 className="text-sm font-semibold mb-2">Recent tickets</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No tickets yet.</p>
      ) : (
        <div className="divide-y">
          {rows.map((t) => (
            <div key={t.id} className="py-2 flex items-center gap-3 text-sm">
              <Badge variant="outline" className="capitalize">{t.kind ?? "sale"}</Badge>
              <span className="flex-1 truncate">
                {t.customer_label || "—"} · {t.payment_method || "unspecified"}
              </span>
              <span className="text-muted-foreground text-xs">
                {t.occurred_at ? format(new Date(t.occurred_at), "MMM d, p") : ""}
              </span>
              <span className="tabular-nums w-20 text-right font-medium">${Number(t.total ?? 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
