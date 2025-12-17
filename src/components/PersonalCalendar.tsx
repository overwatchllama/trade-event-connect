import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, MapPin, Clock, Heart, Store, Ticket } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  city: string;
  state: string;
  venue: string;
  type: 'favorite_vendor' | 'following' | 'vending';
  vendorName?: string;
}

const PersonalCalendar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [favoriteVendorEvents, setFavoriteVendorEvents] = useState<CalendarEvent[]>([]);
  const [followingEvents, setFollowingEvents] = useState<CalendarEvent[]>([]);
  const [vendingEvents, setVendingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('favorites');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchAllEvents();
  }, [user]);

  const fetchAllEvents = async () => {
    if (!user) return;
    setLoading(true);
    
    await Promise.all([
      fetchFavoriteVendorEvents(),
      fetchFollowingEvents(),
      fetchVendingEvents()
    ]);
    
    setLoading(false);
  };

  const fetchFavoriteVendorEvents = async () => {
    try {
      // Get favorite vendor IDs
      const { data: favorites } = await supabase
        .from('user_subscriptions')
        .select('target_id')
        .eq('user_id', user!.id)
        .eq('subscription_type', 'favorite_vendor');

      if (!favorites?.length) {
        setFavoriteVendorEvents([]);
        return;
      }

      const vendorIds = favorites.map(f => f.target_id);

      // Get approved & paid vendor applications for these vendors
      const { data: applications } = await supabase
        .from('vendor_applications')
        .select(`
          event_id,
          vendors!inner(business_name)
        `)
        .in('vendor_id', vendorIds)
        .eq('application_status', 'approved')
        .eq('payment_status', 'paid');

      if (!applications?.length) {
        setFavoriteVendorEvents([]);
        return;
      }

      const eventIds = applications.map(a => a.event_id);
      
      // Get event details with event_days
      const { data: events } = await supabase
        .from('events')
        .select('id, title, city, state, venue')
        .in('id', eventIds);

      const { data: eventDays } = await supabase
        .from('event_days')
        .select('event_id, day_date')
        .in('event_id', eventIds);

      const calendarEvents: CalendarEvent[] = [];
      
      events?.forEach(event => {
        const days = eventDays?.filter(d => d.event_id === event.id) || [];
        const app = applications.find(a => a.event_id === event.id);
        const vendorName = (app?.vendors as any)?.business_name;
        
        days.forEach(day => {
          calendarEvents.push({
            id: `${event.id}-${day.day_date}`,
            title: event.title,
            date: parseISO(day.day_date),
            city: event.city,
            state: event.state,
            venue: event.venue,
            type: 'favorite_vendor',
            vendorName
          });
        });
      });

      setFavoriteVendorEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching favorite vendor events:', error);
    }
  };

  const fetchFollowingEvents = async () => {
    try {
      // Get followed event IDs
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('target_id')
        .eq('user_id', user!.id)
        .eq('subscription_type', 'event');

      if (!subscriptions?.length) {
        setFollowingEvents([]);
        return;
      }

      const eventIds = subscriptions.map(s => s.target_id);

      // Get event details
      const { data: events } = await supabase
        .from('events')
        .select('id, title, city, state, venue')
        .in('id', eventIds);

      const { data: eventDays } = await supabase
        .from('event_days')
        .select('event_id, day_date')
        .in('event_id', eventIds);

      const calendarEvents: CalendarEvent[] = [];
      
      events?.forEach(event => {
        const days = eventDays?.filter(d => d.event_id === event.id) || [];
        
        days.forEach(day => {
          calendarEvents.push({
            id: `${event.id}-${day.day_date}`,
            title: event.title,
            date: parseISO(day.day_date),
            city: event.city,
            state: event.state,
            venue: event.venue,
            type: 'following'
          });
        });
      });

      setFollowingEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching following events:', error);
    }
  };

  const fetchVendingEvents = async () => {
    try {
      // Get approved vendor applications for this user
      const { data: applications } = await supabase
        .from('vendor_applications')
        .select('event_id')
        .eq('user_id', user!.id)
        .eq('application_status', 'approved');

      if (!applications?.length) {
        setVendingEvents([]);
        return;
      }

      const eventIds = applications.map(a => a.event_id);

      // Get event details
      const { data: events } = await supabase
        .from('events')
        .select('id, title, city, state, venue')
        .in('id', eventIds);

      const { data: eventDays } = await supabase
        .from('event_days')
        .select('event_id, day_date')
        .in('event_id', eventIds);

      const calendarEvents: CalendarEvent[] = [];
      
      events?.forEach(event => {
        const days = eventDays?.filter(d => d.event_id === event.id) || [];
        
        days.forEach(day => {
          calendarEvents.push({
            id: `${event.id}-${day.day_date}`,
            title: event.title,
            date: parseISO(day.day_date),
            city: event.city,
            state: event.state,
            venue: event.venue,
            type: 'vending'
          });
        });
      });

      setVendingEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching vending events:', error);
    }
  };

  const getActiveEvents = () => {
    switch (activeTab) {
      case 'favorites':
        return favoriteVendorEvents;
      case 'following':
        return followingEvents;
      case 'vending':
        return vendingEvents;
      default:
        return [];
    }
  };

  const activeEvents = getActiveEvents();
  const eventDates = activeEvents.map(e => e.date);
  
  const eventsForSelectedDate = selectedDate 
    ? activeEvents.filter(event => isSameDay(event.date, selectedDate))
    : [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'favorite_vendor':
        return <Heart className="h-3 w-3 text-red-500" />;
      case 'following':
        return <Ticket className="h-3 w-3 text-blue-500" />;
      case 'vending':
        return <Store className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-48 mx-auto mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-[350px] w-full" />
            </div>
            <Skeleton className="h-[350px] w-full" />
          </div>
        </div>
      </section>
    );
  }

  const totalEvents = favoriteVendorEvents.length + followingEvents.length + vendingEvents.length;

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            My Calendar
          </h2>
          <p className="text-muted-foreground">
            Your personalized event schedule
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Favorites</span>
              {favoriteVendorEvents.length > 0 && (
                <Badge variant="secondary" className="ml-1">{favoriteVendorEvents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              <span className="hidden sm:inline">Following</span>
              {followingEvents.length > 0 && (
                <Badge variant="secondary" className="ml-1">{followingEvents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vending" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Vending</span>
              {vendingEvents.length > 0 && (
                <Badge variant="secondary" className="ml-1">{vendingEvents.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarIcon className="h-5 w-5" />
                    {activeTab === 'favorites' && 'Favorite Vendors Events'}
                    {activeTab === 'following' && 'Followed Events'}
                    {activeTab === 'vending' && 'My Vending Events'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border pointer-events-auto"
                    modifiers={{
                      hasEvent: eventDates
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {selectedDate 
                      ? format(selectedDate, 'MMMM d, yyyy')
                      : 'Select a date'
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {eventsForSelectedDate.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 text-sm">
                      No events on this date
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {eventsForSelectedDate.map((event) => (
                        <div
                          key={event.id}
                          className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/event/${event.id.split('-')[0]}`)}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            {getTypeIcon(event.type)}
                            <h3 className="font-semibold text-sm leading-tight">{event.title}</h3>
                          </div>
                          
                          {event.vendorName && (
                            <p className="text-xs text-primary mb-1">
                              with {event.vendorName}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{event.city}, {event.state}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    </section>
  );
};

export default PersonalCalendar;
