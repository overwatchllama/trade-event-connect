import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Building2, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VenueEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  city: string;
  state: string;
  organizer_name: string;
  pending_applications: number;
  approved_applications: number;
  total_applications: number;
}

export const VenueApplicationsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [venueEvents, setVenueEvents] = useState<VenueEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchVenueEvents();
    }
  }, [user]);

  const fetchVenueEvents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First get venues owned by this user
      const { data: venues, error: venuesError } = await supabase
        .from("venues")
        .select("id, name")
        .eq("owner_id", user.id);

      if (venuesError) throw venuesError;

      if (!venues || venues.length === 0) {
        setVenueEvents([]);
        setLoading(false);
        return;
      }

      const venueIds = venues.map(v => v.id);

      // Get events at these venues
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, title, date, venue, city, state, organizer_name, venue_id")
        .in("venue_id", venueIds)
        .order("date", { ascending: false });

      if (eventsError) throw eventsError;

      if (!events || events.length === 0) {
        setVenueEvents([]);
        setLoading(false);
        return;
      }

      // Get application counts for each event
      const eventIds = events.map(e => e.id);
      const { data: applications, error: appsError } = await supabase
        .from("vendor_applications")
        .select("event_id, application_status")
        .in("event_id", eventIds);

      if (appsError) throw appsError;

      // Calculate counts per event
      const appCounts = new Map<string, { pending: number; approved: number; total: number }>();
      eventIds.forEach(id => appCounts.set(id, { pending: 0, approved: 0, total: 0 }));

      applications?.forEach(app => {
        const counts = appCounts.get(app.event_id);
        if (counts) {
          counts.total++;
          if (app.application_status === "pending") counts.pending++;
          if (app.application_status === "approved") counts.approved++;
        }
      });

      const venueEventsData: VenueEvent[] = events.map(event => ({
        id: event.id,
        title: event.title,
        date: event.date,
        venue: event.venue,
        city: event.city,
        state: event.state,
        organizer_name: event.organizer_name,
        pending_applications: appCounts.get(event.id)?.pending || 0,
        approved_applications: appCounts.get(event.id)?.approved || 0,
        total_applications: appCounts.get(event.id)?.total || 0,
      }));

      setVenueEvents(venueEventsData);
    } catch (error) {
      console.error("Error fetching venue events:", error);
      toast({
        title: "Error",
        description: "Failed to load venue events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageEvent = (eventId: string) => {
    navigate(`/event/${eventId}/manage`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (venueEvents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No events at your venues</p>
          <p className="text-sm text-muted-foreground mt-1">
            Events hosted at your venues will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        View and manage vendor applications for events at your venues
      </p>
      
      {venueEvents.map((event) => (
        <Card key={event.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{event.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(event.date), "PPP")}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {event.pending_applications > 0 && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
                    {event.pending_applications} Pending
                  </Badge>
                )}
                <Badge variant="secondary">
                  {event.total_applications} Total
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.venue}, {event.city}, {event.state}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Organizer: {event.organizer_name}
                </span>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Store className="w-4 h-4 text-success" />
                    {event.approved_applications} Approved
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleManageEvent(event.id)}
                >
                  Manage Applications
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default VenueApplicationsList;
