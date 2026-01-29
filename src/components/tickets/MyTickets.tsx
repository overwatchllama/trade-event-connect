import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Eye, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import TicketQRCode from "./TicketQRCode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Ticket {
  id: string;
  ticket_code: string;
  qr_data: string;
  ticket_type: string;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
  event: {
    id: string;
    title: string;
    date: string;
    venue: string;
    city: string;
    state: string;
  };
}

const MyTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          id,
          ticket_code,
          qr_data,
          ticket_type,
          checked_in,
          checked_in_at,
          created_at,
          event:events(id, title, date, venue, city, state)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data to handle the event join
      const transformedData = (data || []).map(item => ({
        ...item,
        event: Array.isArray(item.event) ? item.event[0] : item.event
      }));
      
      setTickets(transformedData as Ticket[]);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const downloadTicketPDF = async (ticket: Ticket) => {
    setDownloading(true);
    try {
      // Wait for dialog to render the ticket
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const ticketElement = document.getElementById(`ticket-${ticket.ticket_code}`);
      if (!ticketElement) {
        throw new Error("Ticket element not found");
      }

      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`ticket-${ticket.ticket_code}.pdf`);
      
      toast.success("Ticket downloaded successfully");
    } catch (error) {
      console.error("Error downloading ticket:", error);
      toast.error("Failed to download ticket");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">You don't have any tickets yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Purchase tickets to events to see them here.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold">{ticket.event?.title || "Event"}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{ticket.event?.date}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{ticket.event?.venue}, {ticket.event?.city}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{ticket.ticket_type}</Badge>
                  {ticket.checked_in ? (
                    <Badge variant="default" className="bg-green-500">Checked In</Badge>
                  ) : (
                    <Badge variant="secondary">Valid</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Your Ticket</DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              <TicketQRCode
                ticketCode={selectedTicket.ticket_code}
                qrData={selectedTicket.qr_data}
                eventTitle={selectedTicket.event?.title || "Event"}
                eventDate={selectedTicket.event?.date || ""}
                eventVenue={selectedTicket.event?.venue || ""}
                eventCity={selectedTicket.event?.city || ""}
                eventState={selectedTicket.event?.state || ""}
                ticketType={selectedTicket.ticket_type}
                checkedIn={selectedTicket.checked_in}
              />
              
              <Button
                className="w-full"
                onClick={() => downloadTicketPDF(selectedTicket)}
                disabled={downloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? "Generating PDF..." : "Download PDF"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MyTickets;
