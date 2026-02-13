import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarIcon,
  MapPin,
  Plus,
  Settings,
  Users,
  Store,
  Ticket,
  ChevronRight,
} from "lucide-react";
import { format, parseISO, isBefore, startOfDay, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import CreateEventDialog from "@/components/CreateEventDialog";

interface HostedEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  city: string;
  state: string;
  event_type: string;
  card_types: string[];
  max_attendees: number | null;
  total_tables: number | null;
  tables_available: number | null;
  flyer_url: string | null;
  vendor_count?: number;
  ticket_count?: number;
  description?: string | null;
  entry_fee?: number | null;
  vendor_table_price?: number | null;
}

const HostingDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<HostedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchHostedEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: eventsData, error } = await supabase
        .from("events")
        .select(
          "id, title, date, venue, city, state, event_type, card_types, max_attendees, total_tables, tables_available, flyer_url, description, entry_fee, vendor_table_price"
        )
        .eq("organizer_id", user.id)
        .order("date", { ascending: true });

      if (error) throw error;

      if (eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map((e) => e.id);

        const [vendorAppsResult, ordersResult] = await Promise.all([
          supabase
            .from("vendor_applications")
            .select("event_id")
            .in("event_id", eventIds)
            .eq("application_status", "approved")
            .eq("payment_status", "paid"),
          supabase
            .from("order_items")
            .select("event_id")
            .in("event_id", eventIds),
        ]);

        const vendorCounts = new Map<string, number>();
        vendorAppsResult.data?.forEach((app) => {
          vendorCounts.set(app.event_id, (vendorCounts.get(app.event_id) || 0) + 1);
        });

        const ticketCounts = new Map<string, number>();
        ordersResult.data?.forEach((item) => {
          ticketCounts.set(item.event_id, (ticketCounts.get(item.event_id) || 0) + 1);
        });

        const enriched = eventsData.map((e) => ({
          ...e,
          vendor_count: vendorCounts.get(e.id) || 0,
          ticket_count: ticketCounts.get(e.id) || 0,
        }));

        setEvents(enriched);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Error fetching hosted events:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchHostedEvents();
  }, [user, fetchHostedEvents]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const upcomingEvents = useMemo(
    () => events.filter((e) => !isBefore(parseISO(e.date), today)),
    [events, today]
  );

  const pastEvents = useMemo(
    () => events.filter((e) => isBefore(parseISO(e.date), today)).reverse(),
    [events, today]
  );

  // Calendar event dates for indicators
  const eventDates = useMemo(
    () => events.map((e) => parseISO(e.date)),
    [events]
  );

  // Events on the selected calendar date
  const eventsOnSelectedDate = useMemo(
    () =>
      selectedDate
        ? events.filter((e) => isSameDay(parseISO(e.date), selectedDate))
        : [],
    [selectedDate, events]
  );

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  // Auto-select first event on selected date
  useEffect(() => {
    if (eventsOnSelectedDate.length > 0 && !selectedEventId) {
      setSelectedEventId(eventsOnSelectedDate[0].id);
    }
  }, [eventsOnSelectedDate, selectedEventId]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedEventId(null); // reset so auto-select kicks in
  };

  if (!user) return null;

  return (
    <div className="space-y-0">
      {/* Calendar Section */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-center flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                My Calendar
              </h2>
              <p className="text-muted-foreground text-sm">
                Your event schedule
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Create Event
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Skeleton className="h-[350px] w-full" />
              </div>
              <Skeleton className="h-[350px] w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CalendarIcon className="h-5 w-5" />
                      My Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      className="rounded-md border pointer-events-auto"
                      modifiers={{ hasEvent: eventDates }}
                      modifiersStyles={{
                        hasEvent: {
                          backgroundColor: "hsl(var(--primary))",
                          color: "hsl(var(--primary-foreground))",
                          borderRadius: "50%",
                        },
                      }}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Event list sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      {selectedDate
                        ? format(selectedDate, "MMMM d, yyyy")
                        : "Select a date"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {eventsOnSelectedDate.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4 text-sm">
                        No events on this date
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {eventsOnSelectedDate.map((event) => (
                          <div
                            key={event.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                              selectedEventId === event.id
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-accent/50"
                            }`}
                            onClick={() => setSelectedEventId(event.id)}
                          >
                            <h3 className="font-semibold text-sm leading-tight">
                              {event.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {event.city}, {event.state}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick select dropdown for all events */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Jump to Event
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedEventId || ""}
                      onValueChange={(val) => {
                        setSelectedEventId(val);
                        const ev = events.find((e) => e.id === val);
                        if (ev) setSelectedDate(parseISO(ev.date));
                      }}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select an event..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {upcomingEvents.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Upcoming
                            </div>
                            {upcomingEvents.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.title} — {format(parseISO(e.date), "MMM d")}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {pastEvents.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Past
                            </div>
                            {pastEvents.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.title} — {format(parseISO(e.date), "MMM d")}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Selected event detail panel */}
          {selectedEvent && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedEvent.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(parseISO(selectedEvent.date), "EEEE, MMMM d, yyyy")} ·{" "}
                      {selectedEvent.venue}, {selectedEvent.city}, {selectedEvent.state}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/event/${selectedEvent.id}`)}
                    >
                      View Page
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/manage-event/${selectedEvent.id}`)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Ticket className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {selectedEvent.ticket_count || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Tickets Sold</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {selectedEvent.vendor_count || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Vendors</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {selectedEvent.max_attendees ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Max Attendees</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {selectedEvent.tables_available ?? selectedEvent.total_tables ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Tables Available</p>
                    </div>
                  </div>
                </div>

                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground mt-4 line-clamp-3">
                    {selectedEvent.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="outline">{selectedEvent.event_type}</Badge>
                  {selectedEvent.card_types?.map((ct) => (
                    <Badge key={ct} variant="secondary" className="text-xs">
                      {ct}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) fetchHostedEvents();
        }}
      />
    </div>
  );
};

export default HostingDashboard;
