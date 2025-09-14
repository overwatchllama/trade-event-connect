import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPin, Clock, Users } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  city: string;
  state: string;
  organizer: string;
  cardTypes: string[];
  eventType: string;
  attendees: number;
  maxAttendees: number;
  tablesAvailable: number;
  price: number;
}

interface EventsCalendarProps {
  events: Event[];
  userType?: string;
}

const EventsCalendar = ({ events, userType }: EventsCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Parse event dates and create date objects
  const eventDates = events.map(event => {
    try {
      // Handle different date formats
      let eventDate: Date;
      if (event.date.includes('-')) {
        eventDate = parseISO(event.date);
      } else {
        eventDate = new Date(event.date);
      }
      return {
        ...event,
        parsedDate: eventDate
      };
    } catch (error) {
      console.error('Error parsing date for event:', event.title, event.date);
      return {
        ...event,
        parsedDate: new Date()
      };
    }
  });

  // Get events for selected date
  const eventsForSelectedDate = selectedDate 
    ? eventDates.filter(event => 
        isSameDay(event.parsedDate, selectedDate)
      )
    : [];

  // Create array of dates that have events
  const datesWithEvents = eventDates.map(event => event.parsedDate);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Events Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border pointer-events-auto"
              modifiers={{
                hasEvent: datesWithEvents
              }}
              modifiersStyles={{
                hasEvent: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  borderRadius: '50%'
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Events for selected date */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate 
                ? `Events on ${format(selectedDate, 'MMMM d, yyyy')}`
                : 'Select a date'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsForSelectedDate.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No events scheduled for this date
              </p>
            ) : (
              <div className="space-y-4">
                {eventsForSelectedDate.map((event) => (
                  <div
                    key={event.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <h3 className="font-semibold text-sm mb-2">{event.title}</h3>
                    
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{event.time}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}, {event.city}, {event.state}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>{event.attendees}/{event.maxAttendees} attendees</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-3">
                      <Badge variant="outline" className="text-xs">
                        {event.eventType}
                      </Badge>
                      {event.cardTypes.slice(0, 2).map((type, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                      {event.cardTypes.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{event.cardTypes.length - 2} more
                        </Badge>
                      )}
                    </div>

                    {userType === 'vendor' && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">
                            Tables: {event.tablesAvailable} available
                          </span>
                          <span className="font-semibold">
                            ${event.price}
                          </span>
                        </div>
                      </div>
                    )}
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

export default EventsCalendar;