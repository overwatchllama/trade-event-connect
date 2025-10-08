import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, MapPin, Clock, DollarSign, Users, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface VendorEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  address: string;
  city: string;
  state: string;
  organizer_name: string;
  vendor_table_price: number;
  application_status: 'pending' | 'approved' | 'rejected';
  payment_status: 'paid' | 'unpaid' | 'refunded';
  table_number?: string;
  application_date: string;
  notes?: string;
}

interface VendorCalendarProps {
  vendorId: string;
}

const VendorCalendar = ({ vendorId }: VendorCalendarProps) => {
  const [events, setEvents] = useState<VendorEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendorEvents();
  }, [vendorId]);

  const fetchVendorEvents = async () => {
    try {
      // First get vendor applications
      const { data: applications, error: applicationsError } = await supabase
        .from('vendor_applications')
        .select('*')
        .eq('vendor_id', vendorId);

      if (applicationsError) throw applicationsError;

      if (!applications || applications.length === 0) {
        setEvents([]);
        return;
      }

      // Get unique event IDs
      const eventIds = [...new Set(applications.map(app => app.event_id))];

      // Fetch events data
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds);

      if (eventsError) throw eventsError;

      // Combine application and event data
      const vendorEvents: VendorEvent[] = applications
        .map(app => {
          const event = eventsData?.find(e => e.id === app.event_id);
          if (!event) return null;
          
          return {
            id: event.id,
            title: event.title,
            date: event.date,
            venue: event.venue,
            address: event.address,
            city: event.city,
            state: event.state,
            organizer_name: event.organizer_name,
            vendor_table_price: event.vendor_table_price,
            application_status: app.application_status,
            payment_status: app.payment_status,
            table_number: app.table_number,
            application_date: app.application_date,
            notes: app.notes,
          };
        })
        .filter(Boolean) as VendorEvent[];

      setEvents(vendorEvents);
    } catch (error) {
      console.error('Error fetching vendor events:', error);
      toast.error('Failed to load vendor events');
    } finally {
      setLoading(false);
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.date).toISOString().split('T')[0];
      return eventDate === dateString;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const eventDates = events.map(event => new Date(event.date));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-muted h-64 rounded-lg" />
        <div className="animate-pulse bg-muted h-32 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Event Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              modifiers={{
                hasEvent: eventDates,
              }}
              modifiersStyles={{
                hasEvent: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  fontWeight: 'bold',
                },
              }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Event Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Event Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {events.filter(e => e.application_status === 'approved').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Approved</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-warning">
                    {events.filter(e => e.application_status === 'pending').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {events.filter(e => e.payment_status === 'paid').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Paid</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {events.filter(e => e.payment_status === 'unpaid').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Unpaid</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events for Selected Date */}
      <Card>
        <CardHeader>
          <CardTitle>
            Events for {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No events scheduled for this date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDateEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{event.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {event.venue} • {event.city}, {event.state}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {event.address}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className={getStatusColor(event.application_status)}>
                        {event.application_status}
                      </Badge>
                      <Badge className={getPaymentStatusColor(event.payment_status)}>
                        {event.payment_status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>Organizer: {event.organizer_name}</span>
                    </div>
                    
                    {event.vendor_table_price && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>Table Price: ${event.vendor_table_price}</span>
                      </div>
                    )}
                    
                    {event.table_number && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Table #{event.table_number}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {event.notes && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                      <p className="text-sm font-medium text-primary mb-1">Organizer Notes:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/events`}>View Event Details</Link>
                    </Button>
                    
                    <div className="text-xs text-muted-foreground ml-auto self-center">
                      Applied: {new Date(event.application_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorCalendar;