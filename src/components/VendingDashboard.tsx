import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPin, CheckCircle, Clock, DollarSign } from "lucide-react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import PersonalCalendar from "@/components/PersonalCalendar";

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
  const [events, setEvents] = useState<VendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTab, setEventTab] = useState("upcoming");

  useEffect(() => {
    if (!user) return;

    const fetchVendingEvents = async () => {
      setLoading(true);
      try {
        // Get vendor profile
        const { data: vendor } = await supabase
          .from("vendors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!vendor) {
          setEvents([]);
          setLoading(false);
          return;
        }

        // Get all applications with event data
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
        console.error("Error fetching vending events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendingEvents();
  }, [user]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((e) => !isBefore(parseISO(e.date), today))
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
    [events, today]
  );

  const pastEvents = useMemo(
    () =>
      events
        .filter((e) => isBefore(parseISO(e.date), today))
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()),
    [events, today]
  );

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
    <div className="space-y-8">
      <PersonalCalendar defaultTab="vending" />

      <section className="py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
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
        </div>
      </section>
    </div>
  );
};

export default VendingDashboard;
