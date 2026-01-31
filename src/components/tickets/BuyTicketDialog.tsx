import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Minus, Plus, Ticket, CreditCard, Calendar, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface EventDay {
  id: string;
  day_number: number;
  day_date: string;
  start_time: string;
  end_time: string;
  ticket_cost: number | null;
}

interface BuyTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  ticketPrice: number;
  eventDate: string;
  isMultiDay?: boolean;
}

const BuyTicketDialog = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  ticketPrice,
  eventDate,
  isMultiDay = false,
}: BuyTicketDialogProps) => {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingDays, setLoadingDays] = useState(false);
  const [eventDays, setEventDays] = useState<EventDay[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Fetch event days for multi-day events
  useEffect(() => {
    if (open && isMultiDay) {
      fetchEventDays();
    } else if (!open) {
      setSelectedDays([]);
      setQuantity(1);
    }
  }, [open, isMultiDay, eventId]);

  const fetchEventDays = async () => {
    setLoadingDays(true);
    try {
      const { data, error } = await supabase
        .from("event_days")
        .select("*")
        .eq("event_id", eventId)
        .order("day_number", { ascending: true });

      if (error) throw error;
      setEventDays(data || []);
    } catch (error) {
      console.error("Error fetching event days:", error);
      toast.error("Failed to load event days");
    } finally {
      setLoadingDays(false);
    }
  };

  const toggleDaySelection = (dayId: string) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(id => id !== dayId)
        : [...prev, dayId]
    );
  };

  const generateTicketCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const getSelectedDaysPricing = () => {
    if (!isMultiDay || selectedDays.length === 0) {
      return { unitPrice: ticketPrice, totalDays: 1 };
    }

    const selectedDayObjects = eventDays.filter(day => selectedDays.includes(day.id));
    const totalPrice = selectedDayObjects.reduce((sum, day) => {
      return sum + (day.ticket_cost ?? ticketPrice);
    }, 0);

    return { unitPrice: totalPrice, totalDays: selectedDays.length };
  };

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Please sign in to purchase tickets");
      return;
    }

    if (isMultiDay && selectedDays.length === 0) {
      toast.error("Please select at least one day to attend");
      return;
    }

    setLoading(true);
    try {
      const { unitPrice, totalDays } = getSelectedDaysPricing();
      const totalAmount = unitPrice * quantity;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          event_id: eventId,
          total_amount: totalAmount,
          payment_status: totalAmount === 0 ? "completed" : "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items (tickets) - one per day per quantity
      const tickets = [];
      const daysToProcess = isMultiDay ? selectedDays : [null];

      for (let q = 0; q < quantity; q++) {
        for (const dayId of daysToProcess) {
          const ticketCode = generateTicketCode();
          const dayInfo = dayId ? eventDays.find(d => d.id === dayId) : null;
          const dayPrice = dayInfo?.ticket_cost ?? ticketPrice;

          const qrData = JSON.stringify({
            ticketCode,
            eventId,
            eventDayId: dayId,
            orderId: order.id,
            userId: user.id,
            timestamp: Date.now(),
          });

          tickets.push({
            order_id: order.id,
            event_id: eventId,
            event_day_id: dayId,
            user_id: user.id,
            ticket_type: dayInfo 
              ? `Day ${dayInfo.day_number} - ${format(parseISO(dayInfo.day_date), "MMM d, yyyy")}`
              : "General Admission",
            quantity: 1,
            unit_price: dayPrice,
            ticket_code: ticketCode,
            qr_data: qrData,
          });
        }
      }

      const { error: ticketsError } = await supabase
        .from("order_items")
        .insert(tickets);

      if (ticketsError) throw ticketsError;

      // If ticket is free, mark order as completed and send confirmation email
      if (totalAmount === 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", user.id)
          .single();

        if (profile?.email) {
          supabase.functions.invoke("send-ticket-confirmation", {
            body: {
              orderId: order.id,
              userEmail: profile.email,
              userName: profile.full_name,
            },
          }).catch(err => console.error("Failed to send confirmation email:", err));
        }

        toast.success(`${tickets.length} ticket(s) added to your account! Check your email for confirmation.`);
        onOpenChange(false);
        setQuantity(1);
        setSelectedDays([]);
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
            quantity: tickets.length,
            unitPrice: totalAmount / tickets.length,
            totalAmount,
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

  const { unitPrice } = getSelectedDaysPricing();
  const total = unitPrice * quantity;
  const ticketCount = isMultiDay ? selectedDays.length * quantity : quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
            {isMultiDay && (
              <p className="text-xs text-primary mt-1">Multi-day event - select your days below</p>
            )}
          </div>

          {/* Multi-day selection */}
          {isMultiDay && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Select Days to Attend
              </Label>
              
              {loadingDays ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : eventDays.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No days configured for this event yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {eventDays.map((day) => {
                    const dayPrice = day.ticket_cost ?? ticketPrice;
                    const isSelected = selectedDays.includes(day.id);
                    
                    return (
                      <div
                        key={day.id}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => toggleDaySelection(day.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleDaySelection(day.id)}
                          />
                          <div>
                            <p className="font-medium text-sm">
                              Day {day.day_number}: {format(parseISO(day.day_date), "EEEE, MMM d, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {day.start_time} - {day.end_time}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium">
                          {dayPrice === 0 ? "Free" : `$${dayPrice.toFixed(2)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Ticket Type (for single-day events) */}
          {!isMultiDay && (
            <div className="space-y-2">
              <Label>Ticket Type</Label>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">General Admission</p>
                  <p className="text-sm text-muted-foreground">
                    {ticketPrice === 0 ? "Free" : `$${ticketPrice.toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quantity selector */}
          <div className="space-y-2">
            <Label>Quantity {isMultiDay && selectedDays.length > 0 && `(per day)`}</Label>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">
                {isMultiDay && selectedDays.length > 0
                  ? `${quantity} ticket(s) × ${selectedDays.length} day(s) = ${ticketCount} total`
                  : `${quantity} ticket(s)`}
              </p>
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
            {isMultiDay && selectedDays.length > 0 && (
              <div className="text-sm space-y-1">
                {eventDays
                  .filter(day => selectedDays.includes(day.id))
                  .map(day => (
                    <div key={day.id} className="flex justify-between text-muted-foreground">
                      <span>Day {day.day_number} × {quantity}</span>
                      <span>${((day.ticket_cost ?? ticketPrice) * quantity).toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Subtotal ({ticketCount} ticket{ticketCount !== 1 ? "s" : ""})</span>
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
            disabled={loading || (isMultiDay && selectedDays.length === 0)}
          >
            {loading ? (
              "Processing..."
            ) : isMultiDay && selectedDays.length === 0 ? (
              "Select days to continue"
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
