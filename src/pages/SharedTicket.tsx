import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, Ticket, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

interface EventDay {
  id: string;
  day_number: number;
  day_date: string;
  start_time: string;
  end_time: string;
}

interface TicketData {
  id: string;
  ticket_code: string;
  qr_data: string;
  ticket_type: string;
  checked_in: boolean;
  event_day_id: string | null;
  event_day?: EventDay | null;
  event: {
    id: string;
    title: string;
    date: string;
    venue: string;
    city: string;
    state: string;
    is_multi_day: boolean;
    brand_primary_color: string | null;
    brand_secondary_color: string | null;
    brand_logo_url: string | null;
  };
}

const SharedTicket = () => {
  const { ticketCode } = useParams<{ ticketCode: string }>();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticketCode) {
      fetchTicket();
    }
  }, [ticketCode]);

  const fetchTicket = async () => {
    try {
      // Use service role via edge function for public access
      const { data, error } = await supabase.functions.invoke('get-shared-ticket', {
        body: { ticketCode }
      });

      if (error) throw error;
      if (!data?.ticket) throw new Error("Ticket not found");

      setTicket(data.ticket);
    } catch (err: any) {
      console.error("Error fetching ticket:", err);
      setError(err.message || "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <Skeleton className="h-8 w-3/4 mx-auto mb-4" />
          <Skeleton className="h-64 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
        </Card>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="text-xl font-bold mb-2">Ticket Not Found</h1>
          <p className="text-muted-foreground">
            {error || "This ticket link may be invalid or expired."}
          </p>
        </Card>
      </div>
    );
  }

  const primaryColor = ticket.event.brand_primary_color || '#667eea';
  const secondaryColor = ticket.event.brand_secondary_color || '#764ba2';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md overflow-hidden" id={`ticket-${ticket.ticket_code}`}>
        {/* Header with branding */}
        <div 
          className="p-6 text-white text-center"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
          }}
        >
          {ticket.event.brand_logo_url && (
            <img 
              src={ticket.event.brand_logo_url} 
              alt="Event Logo" 
              className="h-12 mx-auto mb-3 object-contain"
            />
          )}
          <h1 className="text-xl font-bold">{ticket.event.title}</h1>
        </div>

        {/* QR Code */}
        <div className="p-6 flex flex-col items-center bg-white">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <QRCodeSVG 
              value={ticket.qr_data} 
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <p className="text-sm text-muted-foreground mt-3 font-mono">
            {ticket.ticket_code}
          </p>

          {ticket.checked_in && (
            <Badge className="bg-green-500 mt-2">Already Checked In</Badge>
          )}
        </div>

        {/* Event Details */}
        <div className="p-6 space-y-3 border-t bg-muted/30">
          {ticket.event.is_multi_day && ticket.event_day ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Day {ticket.event_day.day_number}
                </Badge>
                <span>{format(parseISO(ticket.event_day.day_date), "EEEE, MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{ticket.event_day.start_time} - {ticket.event_day.end_time}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{ticket.event.date}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{ticket.event.venue}, {ticket.event.city}, {ticket.event.state}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Ticket className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline">{ticket.ticket_type}</Badge>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-xs text-muted-foreground border-t">
          Present this QR code at the venue for entry
        </div>
      </Card>
    </div>
  );
};

export default SharedTicket;
