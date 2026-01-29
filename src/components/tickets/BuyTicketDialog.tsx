import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Minus, Plus, Ticket, CreditCard } from "lucide-react";

interface BuyTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  ticketPrice: number;
  eventDate: string;
}

const BuyTicketDialog = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  ticketPrice,
  eventDate,
}: BuyTicketDialogProps) => {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const generateTicketCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Please sign in to purchase tickets");
      return;
    }

    setLoading(true);
    try {
      const totalAmount = ticketPrice * quantity;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          event_id: eventId,
          total_amount: totalAmount,
          payment_status: ticketPrice === 0 ? "completed" : "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items (tickets)
      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        const ticketCode = generateTicketCode();
        const qrData = JSON.stringify({
          ticketCode,
          eventId,
          orderId: order.id,
          userId: user.id,
          timestamp: Date.now(),
        });

        tickets.push({
          order_id: order.id,
          event_id: eventId,
          user_id: user.id,
          ticket_type: "General Admission",
          quantity: 1,
          unit_price: ticketPrice,
          ticket_code: ticketCode,
          qr_data: qrData,
        });
      }

      const { error: ticketsError } = await supabase
        .from("order_items")
        .insert(tickets);

      if (ticketsError) throw ticketsError;

      // If ticket is free, mark order as completed
      if (ticketPrice === 0) {
        toast.success(`${quantity} ticket(s) added to your account!`);
        onOpenChange(false);
        setQuantity(1);
        return;
      }

      // For paid tickets, redirect to Stripe checkout
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        "create-ticket-checkout",
        {
          body: {
            orderId: order.id,
            eventId,
            eventTitle,
            quantity,
            unitPrice: ticketPrice,
          },
        }
      );

      if (checkoutError) throw checkoutError;

      if (checkoutData?.url) {
        window.location.href = checkoutData.url;
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Failed to process purchase. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const total = ticketPrice * quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Purchase Tickets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold">{eventTitle}</h3>
            <p className="text-sm text-muted-foreground">{eventDate}</p>
          </div>

          {/* Ticket Type */}
          <div className="space-y-2">
            <Label>Ticket Type</Label>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">General Admission</p>
                <p className="text-sm text-muted-foreground">
                  {ticketPrice === 0 ? "Free" : `$${ticketPrice.toFixed(2)}`}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  disabled={quantity >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal ({quantity} ticket{quantity > 1 ? "s" : ""})</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{total === 0 ? "Free" : `$${total.toFixed(2)}`}</span>
            </div>
          </div>

          {/* Purchase Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handlePurchase}
            disabled={loading}
          >
            {loading ? (
              "Processing..."
            ) : total === 0 ? (
              <>
                <Ticket className="h-4 w-4 mr-2" />
                Get Free Tickets
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ${total.toFixed(2)}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your tickets will be available in your profile after purchase.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyTicketDialog;
