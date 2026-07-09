import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  eventId: string;
}

interface ListingInfo {
  listing_payment_status: string;
  listing_tier: string | null;
  listing_fee_cents: number | null;
  listing_paid_at: string | null;
}

export const EventListingPaymentBanner = ({ eventId }: Props) => {
  const [info, setInfo] = useState<ListingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("listing_payment_status, listing_tier, listing_fee_cents, listing_paid_at")
        .eq("id", eventId)
        .maybeSingle();
      if (!cancelled) {
        setInfo(data as ListingInfo | null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-event-listing-checkout", {
        body: { eventId },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to start checkout");
      setPaying(false);
    }
  };

  if (loading || !info) return null;

  if (info.listing_payment_status === "paid") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span>Listing fee paid{info.listing_tier ? ` (${info.listing_tier} tier)` : ""}.</span>
        <Badge variant="outline" className="ml-auto">Paid</Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-3 sm:flex-row sm:items-center">
      <div className="flex-1 text-sm">
        <div className="font-medium">Listing fee due</div>
        <div className="text-muted-foreground text-xs">
          Pay the platform listing fee to enable public visibility. Tiered by event size and duration.
        </div>
      </div>
      <Button size="sm" onClick={handlePay} disabled={paying}>
        {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
        Pay listing fee
      </Button>
    </div>
  );
};

export default EventListingPaymentBanner;
