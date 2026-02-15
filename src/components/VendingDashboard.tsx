import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, MapPin, Users, Star, Building2, ChevronRight, Store } from "lucide-react";
import { format, parseISO, isBefore, startOfDay, isSameDay, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import VendorTableListings from "@/components/vending/VendorTableListings";
import VendorStaffRoster from "@/components/vending/VendorStaffRoster";
import VendorRateEvents from "@/components/vending/VendorRateEvents";
import VendorRateVenues from "@/components/vending/VendorRateVenues";

interface VendingEvent {
  id: string;
  event_id: string;
  title: string;
  date: string;
  venue: string;
  city: string;
  state: string;
  event_type: string;
  application_status: string;
  payment_status: string;
  requested_tables: number;
  approved_tables: number | null;
  table_number: string | null;
}

const VendingDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [events, setEvents] = useState<VendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchVendingData();
  }, [user]);

  const fetchVendingData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let { data: vendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!vendor) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single();

        const { data: newVendor, error: createError } = await supabase
          .from("vendors")
          .insert({
            user_id: user.id,
            business_name: profile?.full_name || "My Business",
            business_email: profile?.email,
          })
          .select("id")
          .single();

        if (createError || !newVendor) {
          setVendorId(null);
          setEvents([]);
          setLoading(false);
          return;
        }
        vendor = newVendor;
      }

      setVendorId(vendor.id);

      const { data: apps, error } = await supabase
        .from("vendor_applications")
        .select("id, event_id, application_status, payment_status, requested_tables, approved_tables, table_number")
        .eq("vendor_id", vendor.id);

      if (error) throw error;

      if (apps && apps.length > 0) {
        const eventIds = apps.map((a) => a.event_id);
        const { data: eventsData } = await supabase
          .from("events")
          .select("id, title, date, venue, city, state, event_type")
          .in("id", eventIds);

        const eventsMap = new Map(eventsData?.map((e) => [e.id, e]) || []);

        setEvents(
          apps
            .map((app) => {
              const event = eventsMap.get(app.event_id);
              if (!event) return null;
              return {
                ...app,
                title: event.title,
                date: event.date,
                venue: event.venue,
                city: event.city,
                state: event.state,
                event_type: event.event_type,
              };
            })
            .filter(Boolean) as VendingEvent[]
        );
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Error fetching vending data:", error);
    } finally {
      setLoading(false);
    }
  };

  const today = useMemo(() => startOfDay(new Date()), []);

  const eventDates = useMemo(
    () => events.map((e) => parseISO(e.date)),
    [events]
  );

  const eventsOnSelectedDate = useMemo(
    () =>
      selectedDate
        ? events.filter((e) => isSameDay(parseISO(e.date), selectedDate))
        : [],
    [selectedDate, events]
  );

  const twoWeeksOut = useMemo(() => addDays(today, 14), [today]);
  const upcomingTwoWeeks = useMemo(
    () =>
      events
        .filter((e) => {
          const d = parseISO(e.date);
          return !isBefore(d, today) && isBefore(d, twoWeeksOut);
        })
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
    [events, today, twoWeeksOut]
  );

  // Auto-select first event on selected date
  useEffect(() => {
    if (eventsOnSelectedDate.length > 0) {
      // Only auto-select if current selection isn't on this date
      const currentlySelected = events.find((e) => e.id === selectedEventId);
      if (!currentlySelected || !selectedDate || !isSameDay(parseISO(currentlySelected.date), selectedDate)) {
        setSelectedEventId(eventsOnSelectedDate[0].id);
      }
    }
  }, [eventsOnSelectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedEventId(null);
  };

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const getStatusBadge = (app: VendingEvent) => {
    if (app.application_status === "approved" && app.payment_status === "paid") {
      return <Badge className="bg-green-600 text-white text-xs">Confirmed</Badge>;
    }
    if (app.application_status === "approved" && app.payment_status === "unpaid") {
      return <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">Payment Due</Badge>;
    }
    if (app.application_status === "pending") {
      return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
    if (app.application_status === "waitlist") {
      return <Badge variant="secondary" className="text-xs">Waitlisted</Badge>;
    }
    if (app.application_status === "rejected") {
      return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
    }
    return null;
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-foreground mb-6">Manage Vending</h2>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="w-4 h-4" />
            Manage Staff
          </TabsTrigger>
          <TabsTrigger value="rate-events" className="gap-2">
            <Star className="w-4 h-4" />
            Rate Events
          </TabsTrigger>
          <TabsTrigger value="rate-venues" className="gap-2">
            <Building2 className="w-4 h-4" />
            Rate Venues
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
            {/* Calendar - narrow */}
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
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm leading-tight">
                              {event.title}
                            </h3>
                            {getStatusBadge(event)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {event.venue} · {event.city}, {event.state}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-xs py-0">
                              {event.approved_tables || event.requested_tables} table{(event.approved_tables || event.requested_tables) !== 1 ? "s" : ""}
                            </Badge>
                            {event.table_number && (
                              <Badge variant="secondary" className="text-xs py-0">
                                Table #{event.table_number}
                              </Badge>
                            )}
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
            </div>
          </div>

          {/* Selected Event Detail Panel */}
          {selectedEvent && (
            <Card>
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
                    {getStatusBadge(selectedEvent)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/event/${selectedEvent.event_id}`)}
                    >
                      View Page
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-2xl font-bold">
                      {selectedEvent.approved_tables || selectedEvent.requested_tables}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEvent.approved_tables ? "Approved Tables" : "Requested Tables"}
                    </p>
                  </div>
                  {selectedEvent.table_number && (
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold">#{selectedEvent.table_number}</p>
                      <p className="text-xs text-muted-foreground">Table Assignment</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm font-semibold capitalize">{selectedEvent.application_status}</p>
                    <p className="text-xs text-muted-foreground">Application</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm font-semibold capitalize">{selectedEvent.payment_status}</p>
                    <p className="text-xs text-muted-foreground">Payment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table Marketplace */}
          {vendorId && <VendorTableListings vendorId={vendorId} />}
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          {vendorId ? (
            <VendorStaffRoster vendorId={vendorId} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Set up your vendor profile first to manage staff.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rate Events Tab */}
        <TabsContent value="rate-events">
          {vendorId ? (
            <VendorRateEvents vendorId={vendorId} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Set up your vendor profile first to rate events.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rate Venues Tab */}
        <TabsContent value="rate-venues">
          {vendorId ? (
            <VendorRateVenues vendorId={vendorId} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Set up your vendor profile first to rate venues.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendingDashboard;
