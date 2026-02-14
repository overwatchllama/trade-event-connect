import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Store,
  Users,
  Award,
  Star,
} from "lucide-react";
import { format, parseISO, isBefore, startOfDay, isSameDay, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import CreateEventDialog from "@/components/CreateEventDialog";
import EventDetailPanel from "@/components/organize/EventDetailPanel";
import { EventVendorsOverview } from "@/components/vendor-management/EventVendorsOverview";
import { OrganizerVendorNotes } from "@/components/OrganizerVendorNotes";

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
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState<HostedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [vendorNotesDialogOpen, setVendorNotesDialogOpen] = useState(false);
  const [selectedVendorForNotes, setSelectedVendorForNotes] = useState<{ id: string; name: string } | null>(null);
  const [organizerNotes, setOrganizerNotes] = useState<Map<string, {
    is_favorite: boolean;
    is_blacklisted: boolean;
    private_rating: number | null;
    custom_list: string | null;
  }>>(new Map());

  const defaultTab = searchParams.get('tab') || 'calendar';

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
    fetchOrganizerNotes();
  }, [user, fetchHostedEvents]);

  const fetchOrganizerNotes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('organizer_vendor_notes')
        .select('vendor_id, is_favorite, is_blacklisted, private_rating, custom_list')
        .eq('organizer_id', user.id);
      if (error) throw error;
      const notesMap = new Map<string, { is_favorite: boolean; is_blacklisted: boolean; private_rating: number | null; custom_list: string | null }>();
      data?.forEach((note) => {
        notesMap.set(note.vendor_id, {
          is_favorite: note.is_favorite || false,
          is_blacklisted: note.is_blacklisted || false,
          private_rating: note.private_rating,
          custom_list: note.custom_list,
        });
      });
      setOrganizerNotes(notesMap);
    } catch (error) {
      console.error('Error fetching organizer notes:', error);
    }
  };

  const handleOpenVendorNotes = (vendorId: string, vendorName: string) => {
    setSelectedVendorForNotes({ id: vendorId, name: vendorName });
    setVendorNotesDialogOpen(true);
  };

  const getVendorNotesBadges = (vendorId: string) => {
    const notes = organizerNotes.get(vendorId);
    if (!notes) return null;
    return (
      <div className="flex gap-1 flex-wrap mt-1">
        {notes.is_favorite && (
          <Badge className="bg-accent text-accent-foreground text-xs py-0">♥ Fav</Badge>
        )}
        {notes.is_blacklisted && (
          <Badge variant="destructive" className="text-xs py-0">Blocked</Badge>
        )}
        {notes.private_rating && (
          <Badge variant="secondary" className="text-xs py-0">★ {notes.private_rating}</Badge>
        )}
        {notes.custom_list && (
          <Badge variant="outline" className="text-xs py-0">{notes.custom_list}</Badge>
        )}
      </div>
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'V';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const today = useMemo(() => startOfDay(new Date()), []);

  const upcomingEvents = useMemo(
    () => events.filter((e) => !isBefore(parseISO(e.date), today)),
    [events, today]
  );

  const pastEvents = useMemo(
    () => events.filter((e) => isBefore(parseISO(e.date), today)).reverse(),
    [events, today]
  );

  // Events in next 2 weeks
  const twoWeeksOut = useMemo(() => addDays(today, 14), [today]);
  const upcomingTwoWeeks = useMemo(
    () => events
      .filter((e) => {
        const d = parseISO(e.date);
        return !isBefore(d, today) && isBefore(d, twoWeeksOut);
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
    [events, today, twoWeeksOut]
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
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-center flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                Organize
              </h2>
              <p className="text-muted-foreground text-sm">
                Manage your events, vendors, sponsors, and staff
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Create Event
            </Button>
          </div>

          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="manage-vendors" className="gap-2">
                <Store className="w-4 h-4" />
                Manage Vendors
              </TabsTrigger>
              <TabsTrigger value="manage-sponsors" className="gap-2">
                <Award className="w-4 h-4" />
                Manage Sponsors
              </TabsTrigger>
              <TabsTrigger value="manage-staff" className="gap-2">
                <Users className="w-4 h-4" />
                Manage Staff
              </TabsTrigger>
              <TabsTrigger value="rate-review" className="gap-2">
                <Star className="w-4 h-4" />
                Rate & Review
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-6">

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Skeleton className="h-[350px] w-full" />
              </div>
              <Skeleton className="h-[350px] w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
              {/* Calendar - auto width to fit content */}
              <div>
                <Card className="w-fit">
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

                    {/* Upcoming 2 weeks */}
                    {upcomingTwoWeeks.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Upcoming Events
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {upcomingTwoWeeks.map((event) => (
                            <Button
                              key={event.id}
                              variant={selectedEventId === event.id ? "default" : "outline"}
                              size="sm"
                              className="text-xs h-auto py-1.5 px-3"
                              onClick={() => {
                                setSelectedEventId(event.id);
                                setSelectedDate(parseISO(event.date));
                              }}
                            >
                              {event.title}
                              <span className="ml-1 opacity-70">
                                {format(parseISO(event.date), "M/d")}
                              </span>
                            </Button>
                          ))}
                        </div>
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
          {selectedEvent && <EventDetailPanel event={selectedEvent} />}
            </TabsContent>

            <TabsContent value="manage-vendors" className="mt-6">
              <EventVendorsOverview
                eventVendors={{ approved: [], pending: [], rejected: [] }}
                organizerNotes={organizerNotes}
                getVendorNotesBadges={getVendorNotesBadges}
                getInitials={getInitials}
                onOpenVendorNotes={handleOpenVendorNotes}
              />
            </TabsContent>

            <TabsContent value="manage-sponsors" className="mt-6">
              <div className="text-center py-12">
                <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Manage Sponsors</h3>
                <p className="text-muted-foreground">View and manage sponsor applications across your events.</p>
              </div>
            </TabsContent>

            <TabsContent value="manage-staff" className="mt-6">
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Manage Staff</h3>
                <p className="text-muted-foreground">View and manage staff assignments across your events.</p>
              </div>
            </TabsContent>

            <TabsContent value="rate-review" className="mt-6">
              <div className="space-y-6">
                <div className="text-center pb-4">
                  <Star className="h-10 w-10 text-primary mx-auto mb-2" />
                  <h3 className="text-xl font-semibold text-foreground mb-1">Rate & Review</h3>
                  <p className="text-muted-foreground text-sm">Rate vendors and sponsors you've worked with across your events.</p>
                </div>

                {/* Vendors to rate */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Store className="h-5 w-5" />
                      Vendors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm text-center py-6">
                      Select an event from the Calendar tab to view and rate its vendors using private notes and star ratings.
                    </p>
                  </CardContent>
                </Card>

                {/* Sponsors to rate */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="h-5 w-5" />
                      Sponsors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm text-center py-6">
                      Select an event from the Calendar tab to view and rate its sponsors.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {vendorNotesDialogOpen && selectedVendorForNotes && (
        <OrganizerVendorNotes
          vendorId={selectedVendorForNotes.id}
          vendorName={selectedVendorForNotes.name}
          open={vendorNotesDialogOpen}
          onOpenChange={(open) => {
            setVendorNotesDialogOpen(open);
            if (!open) fetchOrganizerNotes();
          }}
        />
      )}

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
