import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Eye, Calendar, MapPin, Clock, ChevronDown, ChevronRight, Ticket } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import TicketQRCode from "./TicketQRCode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  checked_in_at: string | null;
  created_at: string;
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
  };
}

interface GroupedEvent {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  city: string;
  state: string;
  isMultiDay: boolean;
  tickets: TicketData[];
  checkedInCount: number;
}

const MyTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

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
          event_day_id,
          event_day:event_days(id, day_number, day_date, start_time, end_time),
          event:events(id, title, date, venue, city, state, is_multi_day)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const transformedData = (data || []).map(item => ({
        ...item,
        event: Array.isArray(item.event) ? item.event[0] : item.event,
        event_day: Array.isArray(item.event_day) ? item.event_day[0] : item.event_day
      }));
      
      setTickets(transformedData as TicketData[]);
      
      // Auto-expand all events by default
      const eventIds = new Set(transformedData.map(t => t.event?.id).filter(Boolean));
      setExpandedEvents(eventIds as Set<string>);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  // Group tickets by event
  const groupedTickets = useMemo(() => {
    const groups: Map<string, GroupedEvent> = new Map();
    
    tickets.forEach(ticket => {
      if (!ticket.event?.id) return;
      
      const eventId = ticket.event.id;
      if (!groups.has(eventId)) {
        groups.set(eventId, {
          eventId,
          eventTitle: ticket.event.title,
          eventDate: ticket.event.date,
          venue: ticket.event.venue,
          city: ticket.event.city,
          state: ticket.event.state,
          isMultiDay: ticket.event.is_multi_day,
          tickets: [],
          checkedInCount: 0
        });
      }
      
      const group = groups.get(eventId)!;
      group.tickets.push(ticket);
      if (ticket.checked_in) {
        group.checkedInCount++;
      }
    });
    
    // Sort tickets within each group by day number
    groups.forEach(group => {
      group.tickets.sort((a, b) => {
        const dayA = a.event_day?.day_number ?? 0;
        const dayB = b.event_day?.day_number ?? 0;
        return dayA - dayB;
      });
    });
    
    return Array.from(groups.values());
  }, [tickets]);

  const toggleEvent = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const downloadTicketPDF = async (ticket: TicketData) => {
    setDownloading(true);
    try {
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
        {groupedTickets.map((group) => (
          <Card key={group.eventId} className="overflow-hidden">
            <Collapsible 
              open={expandedEvents.has(group.eventId)} 
              onOpenChange={() => toggleEvent(group.eventId)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {expandedEvents.has(group.eventId) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">{group.eventTitle}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>{group.eventDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{group.venue}, {group.city}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Ticket className="h-3 w-3" />
                      {group.tickets.length} ticket{group.tickets.length !== 1 ? 's' : ''}
                    </Badge>
                    {group.isMultiDay && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        Multi-day
                      </Badge>
                    )}
                    {group.checkedInCount > 0 && (
                      <Badge className="bg-green-500">
                        {group.checkedInCount} checked in
                      </Badge>
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="border-t divide-y">
                  {group.tickets.map((ticket) => (
                    <div key={ticket.id} className="p-4 pl-12 flex items-center justify-between bg-muted/20">
                      <div className="space-y-1">
                        {/* Show specific day for multi-day events */}
                        {group.isMultiDay && ticket.event_day ? (
                          <>
                            <div className="flex items-center gap-2 text-sm font-medium">
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
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">{ticket.ticket_type}</Badge>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Code: {ticket.ticket_code}</span>
                          {ticket.checked_in ? (
                            <Badge variant="default" className="bg-green-500 text-xs">Checked In</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Valid</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View QR
                      </Button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
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
                eventDate={
                  selectedTicket.event_day 
                    ? `Day ${selectedTicket.event_day.day_number}: ${format(parseISO(selectedTicket.event_day.day_date), "MMM d, yyyy")}`
                    : selectedTicket.event?.date || ""
                }
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
