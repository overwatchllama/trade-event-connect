import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { CalendarDays, MapPin, Users } from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  address: string;
  city: string;
  state: string;
  event_type: string;
  organizer_name: string;
  max_attendees: number | null;
}

interface VenueCalendarProps {
  venueId: string;
  venueName: string;
}

export const VenueCalendar = ({ venueId, venueName }: VenueCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsForDate, setEventsForDate] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVenueEvents();
  }, [venueId]);

  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const filtered = events.filter(event => event.date === dateStr);
      setEventsForDate(filtered);
    }
  }, [selectedDate, events]);

  const fetchVenueEvents = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('public_events')
        .select('*')
        .eq('venue_id', venueId)
        .order('date');

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching venue events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventDates = () => {
    return events.map(event => parseISO(event.date));
  };

  const hasEvents = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.some(event => event.date === dateStr);
  };

  if (loading) {
    return <div className="p-4">Loading calendar...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">{venueName} Calendar</h3>
        <p className="text-muted-foreground">View all events scheduled at this venue</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Event Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                hasEvent: getEventDates()
              }}
              modifiersStyles={{
                hasEvent: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  fontWeight: 'bold'
                }
              }}
            />
            <div className="mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary"></div>
                <span>Days with events</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? `Events on ${format(selectedDate, 'PPP')}` : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsForDate.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No events scheduled for this date
              </p>
            ) : (
              <div className="space-y-4">
                {eventsForDate.map((event) => (
                  <div key={event.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">{event.title}</h4>
                      <Badge variant="secondary">{event.event_type}</Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{event.address}, {event.city}, {event.state}</span>
                      </div>
                      
                      {event.max_attendees && (
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          <span>Max attendees: {event.max_attendees}</span>
                        </div>
                      )}
                      
                      <div>
                        <span className="font-medium">Organizer:</span> {event.organizer_name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};