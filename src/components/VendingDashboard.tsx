import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPin, Users, Star, Building2 } from "lucide-react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import PersonalCalendar from "@/components/PersonalCalendar";
import VendorTableListings from "@/components/vending/VendorTableListings";
import EmployeeManagement from "@/components/vendor/EmployeeManagement";
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
  const [eventTab, setEventTab] = useState("upcoming");

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
        // Auto-create vendor profile if user has vendor role but no profile yet
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

  const today = startOfDay(new Date());

  const upcomingEvents = events
    .filter((e) => !isBefore(parseISO(e.date), today))
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  const pastEvents = events
    .filter((e) => isBefore(parseISO(e.date), today))
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  const displayedEvents = eventTab === "upcoming" ? upcomingEvents : pastEvents;

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
          <PersonalCalendar defaultTab="vending" visibleTabs={['vending']} />

          {/* Table Marketplace */}
          {vendorId && <VendorTableListings vendorId={vendorId} />}

          {/* My Vending Events */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">My Vending Events</h3>
            </div>

            <Tabs value={eventTab} onValueChange={setEventTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="upcoming">
                  Upcoming
                  {upcomingEvents.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{upcomingEvents.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past
                  {pastEvents.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{pastEvents.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={eventTab}>
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4 space-y-3">
                          <div className="h-5 bg-muted rounded w-3/4" />
                          <div className="h-4 bg-muted rounded w-1/2" />
                          <div className="h-4 bg-muted rounded w-1/3" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : displayedEvents.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      {eventTab === "upcoming"
                        ? "No upcoming vending events. Browse events to apply!"
                        : "No past vending events yet."}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {displayedEvents.map((event) => (
                      <Card
                        key={event.id}
                        className="hover:shadow-md transition-shadow cursor-pointer group"
                        onClick={() => navigate(`/event/${event.event_id}`)}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                              {event.title}
                            </h4>
                            {getStatusBadge(event)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span>{format(parseISO(event.date), "MMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">
                              {event.venue} · {event.city}, {event.state}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <Badge variant="outline" className="text-xs">
                              {event.approved_tables || event.requested_tables} table{(event.approved_tables || event.requested_tables) !== 1 ? "s" : ""}
                            </Badge>
                            {event.table_number && (
                              <Badge variant="secondary" className="text-xs">
                                Table #{event.table_number}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          {vendorId ? (
            <EmployeeManagement vendorId={vendorId} />
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
