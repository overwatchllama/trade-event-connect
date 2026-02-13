import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MapPin, Clock, Plus, Settings } from "lucide-react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import PersonalCalendar from "@/components/PersonalCalendar";

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
}

const HostingDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<HostedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTab, setEventTab] = useState("upcoming");

  useEffect(() => {
    if (!user) return;

    const fetchHostedEvents = async () => {
      setLoading(true);
      try {
        const { data: eventsData, error } = await supabase
          .from("events")
          .select("id, title, date, venue, city, state, event_type, card_types, max_attendees, total_tables, tables_available, flyer_url")
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

          setEvents(
            eventsData.map((e) => ({
              ...e,
              vendor_count: vendorCounts.get(e.id) || 0,
              ticket_count: ticketCounts.get(e.id) || 0,
            }))
          );
        } else {
          setEvents([]);
        }
      } catch (error) {
        console.error("Error fetching hosted events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHostedEvents();
  }, [user]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const upcomingEvents = useMemo(
    () => events.filter((e) => !isBefore(parseISO(e.date), today)),
    [events, today]
  );

  const pastEvents = useMemo(
    () => events.filter((e) => isBefore(parseISO(e.date), today)).reverse(),
    [events, today]
  );

  const displayedEvents = eventTab === "upcoming" ? upcomingEvents : pastEvents;

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Calendar */}
      <PersonalCalendar defaultTab="hosting" visibleTabs={['hosting']} tabLabels={{ hosting: 'Events' }} />

      {/* Event Lists */}
      <section className="py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">My Events</h3>
            <Button onClick={() => navigate("/events")} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Create Event
            </Button>
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
                      ? "No upcoming events. Create one to get started!"
                      : "No past events yet."}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {displayedEvents.map((event) => (
                    <Card
                      key={event.id}
                      className="hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => navigate(`/event/${event.id}`)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {event.title}
                          </h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/manage-event/${event.id}`);
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
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
                            {event.event_type}
                          </Badge>
                          {event.vendor_count != null && event.vendor_count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {event.vendor_count} vendor{event.vendor_count !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          {event.ticket_count != null && event.ticket_count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {event.ticket_count} ticket{event.ticket_count !== 1 ? "s" : ""}
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

export default HostingDashboard;
