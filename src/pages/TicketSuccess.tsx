import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Ticket, Loader2 } from "lucide-react";

const TicketSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !orderId) {
        setError("Missing payment information");
        setVerifying(false);
        return;
      }

      try {
        const { error } = await supabase.functions.invoke("verify-ticket-payment", {
          body: { sessionId, orderId },
        });

        if (error) {
          throw error;
        }

        setVerifying(false);
      } catch (err) {
        console.error("Verification error:", err);
        setError("Failed to verify payment. Please contact support.");
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, orderId]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md mx-auto text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <h2 className="text-xl font-semibold">Verifying your payment...</h2>
          <p className="text-muted-foreground mt-2">Please wait while we confirm your purchase.</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 max-w-md mx-auto text-center">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-red-600">Payment Verification Failed</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button className="mt-6" onClick={() => navigate("/events")}>
            Return to Events
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="p-8 max-w-md mx-auto text-center">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground mb-6">
          Your tickets have been purchased and are ready to use.
        </p>

        <div className="space-y-3">
          <Button className="w-full" onClick={() => navigate("/profile")}>
            <Ticket className="h-4 w-4 mr-2" />
            View My Tickets
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/events")}>
            Browse More Events
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          A confirmation email has been sent to your email address.
        </p>
      </Card>
    </div>
  );
};

export default TicketSuccess;
