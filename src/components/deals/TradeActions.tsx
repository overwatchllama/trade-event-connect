import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, X, PackageCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

type LineRow = {
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
  deal_list_item_id: string | null;
};

interface Props {
  proposalId: string;
  vendorUserId: string;
  proposalTitle: string;
  status: string;
  onStatusChange: (
    status: string,
    extra?: { accepted_at?: string; declined_at?: string; completed_at?: string; trade_lot_id?: string | null },
  ) => void;
}

const nowIso = () => new Date().toISOString();

export default function TradeActions({
  proposalId,
  vendorUserId,
  proposalTitle,
  status,
  onStatusChange,
}: Props) {
  const [busy, setBusy] = useState<null | "accept" | "decline" | "finalize">(null);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);

  const accept = async () => {
    setBusy("accept");
    const accepted_at = nowIso();
    const { error } = await supabase
      .from("deal_proposals")
      .update({ status: "accepted", accepted_at })
      .eq("id", proposalId);
    setBusy(null);
    if (error) return toast.error(error.message);
    onStatusChange("accepted", { accepted_at });
    toast.success("Trade accepted — finalize to move inventory.");
  };

  const decline = async () => {
    setBusy("decline");
    const declined_at = nowIso();
    const { error } = await supabase
      .from("deal_proposals")
      .update({ status: "declined", declined_at })
      .eq("id", proposalId);
    setBusy(null);
    setConfirmDecline(false);
    if (error) return toast.error(error.message);
    onStatusChange("declined", { declined_at });
    toast.message("Trade declined.");
  };

  const finalize = async () => {
    setBusy("finalize");
    setConfirmFinalize(false);
    try {
      const { data: lines, error: linesErr } = await supabase
        .from("deal_proposal_lines")
        .select(
          "id, side, kind, amount, card_name, set_name, card_number, condition, quantity, unit_value, deal_list_item_id",
        )
        .eq("proposal_id", proposalId);
      if (linesErr) throw linesErr;
      const rows = (lines ?? []) as LineRow[];

      const inputs = rows.filter((l) => l.side === "input");
      const outputs = rows.filter((l) => l.side === "output");
      const inputCards = inputs.filter((l) => l.kind === "card");
      const outputCards = outputs.filter((l) => l.kind === "card");

      // Cost basis for received cards = agreed trade value of those cards.
      // (Common vendor practice; keeps per-card cost basis intact.)
      const lotTotal = inputCards.reduce(
        (s, l) => s + (l.unit_value ?? 0) * (l.quantity || 1),
        0,
      );

      let tradeLotId: string | null = null;

      if (inputCards.length > 0) {
        const { data: lot, error: lotErr } = await supabase
          .from("purchase_lots")
          .insert({
            user_id: vendorUserId,
            title: `Trade · ${proposalTitle || "Untitled"}`,
            source: "trade",
            lot_total: lotTotal,
            allocation_method: "market_value",
            bought_at: nowIso(),
            notes: `Auto-created from proposal ${proposalId}`,
          })
          .select("id")
          .single();
        if (lotErr) throw lotErr;
        tradeLotId = lot.id;

        // Insert one inventory row per input card line (quantity kept on the row).
        const newItems = inputCards.map((l) => ({
          user_id: vendorUserId,
          card_name: (l.card_name || "Traded card").trim(),
          set_name: l.set_name,
          card_number: l.card_number,
          condition: l.condition,
          quantity: l.quantity || 1,
          purchase_price: l.unit_value ?? 0,
          source: "trade",
          status: "bought",
          listing_status: "unlisted",
          bought_at: nowIso(),
          lot_id: tradeLotId,
        }));
        const { error: insErr } = await supabase.from("deal_list_items").insert(newItems);
        if (insErr) throw insErr;
      }

      // Mark linked output-side cards as traded/sold.
      const outputLinked = outputCards.filter((l) => l.deal_list_item_id);
      for (const l of outputLinked) {
        const { error: updErr } = await supabase
          .from("deal_list_items")
          .update({
            listing_status: "sold",
            sold_at: nowIso(),
            sold_price: l.unit_value ?? 0,
            sold_channel: "trade",
          })
          .eq("id", l.deal_list_item_id!);
        if (updErr) throw updErr;
      }

      const completed_at = nowIso();
      const { error: fErr } = await supabase
        .from("deal_proposals")
        .update({ status: "completed", completed_at, trade_lot_id: tradeLotId })
        .eq("id", proposalId);
      if (fErr) throw fErr;

      onStatusChange("completed", { completed_at, trade_lot_id: tradeLotId });
      const skipped = outputCards.length - outputLinked.length;
      toast.success(
        `Trade finalized · ${inputCards.length} in · ${outputLinked.length} out${
          skipped ? ` · ${skipped} unlinked output card${skipped === 1 ? "" : "s"} skipped` : ""
        }`,
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to finalize trade");
    } finally {
      setBusy(null);
    }
  };

  const isProposed = status === "proposed";
  const isAccepted = status === "accepted";
  const isCompleted = status === "completed";
  const isDeclined = status === "declined";

  return (
    <>
      <Card className="mt-4">
        <CardContent className="pt-6 flex flex-wrap items-center gap-3">
          <div className="text-sm mr-auto">
            <span className="text-muted-foreground">Trade status: </span>
            <Badge variant="secondary" className="capitalize">
              {status}
            </Badge>
            {isCompleted && (
              <span className="ml-2 text-xs text-muted-foreground">
                Inventory moved to a new lot.
              </span>
            )}
          </div>

          {isProposed && (
            <>
              <Button
                variant="outline"
                onClick={() => setConfirmDecline(true)}
                disabled={busy !== null}
              >
                <X className="h-4 w-4 mr-1" /> Decline
              </Button>
              <Button onClick={accept} disabled={busy !== null}>
                {busy === "accept" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Accept
              </Button>
            </>
          )}

          {isAccepted && (
            <>
              <Button
                variant="outline"
                onClick={() => setConfirmDecline(true)}
                disabled={busy !== null}
              >
                <X className="h-4 w-4 mr-1" /> Decline
              </Button>
              <Button
                onClick={() => setConfirmFinalize(true)}
                disabled={busy !== null}
              >
                {busy === "finalize" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <PackageCheck className="h-4 w-4 mr-1" />
                )}
                Finalize trade
              </Button>
            </>
          )}

          {(isCompleted || isDeclined) && (
            <span className="text-xs text-muted-foreground">
              This proposal is closed.
            </span>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmFinalize} onOpenChange={setConfirmFinalize}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize this trade?</AlertDialogTitle>
            <AlertDialogDescription>
              A new purchase lot will be created for cards the customer gave you,
              and any output cards you linked to inventory will be marked{" "}
              <strong>sold (channel: trade)</strong>. This cannot be undone from
              here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={finalize}>
              Finalize trade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDecline} onOpenChange={setConfirmDecline}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              The proposal will be marked declined. Inventory won't change. You
              can still reopen it by editing status if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={decline}>Decline</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
