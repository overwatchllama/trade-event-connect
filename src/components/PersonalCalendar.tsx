import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, MapPin, Clock, Heart, Store, Ticket, Megaphone } from 'lucide-react';
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
  type: 'favorite_vendor' | 'following' | 'vending' | 'hosting';
  vendorName?: string;
}

const PersonalCalendar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [favoriteVendorEvents, setFavoriteVendorEvents] = useState<CalendarEvent[]>([]);
  const [followingEvents, setFollowingEvents] = useState<CalendarEvent[]>([]);
  const [vendingEvents, setVendingEvents] = useState<CalendarEvent[]>([]);
  const [hostingEvents, setHostingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('favorites');
  const [dataFetched, setDataFetched] = useState(false);

  // Fetch data only once when user is available
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (dataFetched) return;
    
    fetchAllEvents();
  }, [user, dataFetched]);

  const fetchAllEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Batch all subscriptions in one query
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('target_id, subscription_type')
        .eq('user_id', user.id)
        .in('subscription_type', ['favorite_vendor', 'event']);

      const favoriteVendorIds = subscriptions?.filter(s => s.subscription_type === 'favorite_vendor').map(s => s.target_id) || [];
      const followedEventIds = subscriptions?.filter(s => s.subscription_type === 'event').map(s => s.target_id) || [];

      // Fetch vending applications and hosting events in parallel
      const [vendingAppsResult, hostingEventsResult] = await Promise.all([
        supabase
          .from('vendor_applications')
          .select('event_id')
          .eq('user_id', user.id)
          .eq('application_status', 'approved'),
        supabase
          .from('events')
          .select('id')
          .eq('organizer_id', user.id)
      ]);

      const vendingEventIds = vendingAppsResult.data?.map(a => a.event_id) || [];
      const hostingEventIds = hostingEventsResult.data?.map(e => e.id) || [];

      // Get all unique event IDs we need
      let allEventIds: string[] = [...followedEventIds, ...vendingEventIds, ...hostingEventIds];

      // For favorite vendors, get their event applications first
      let vendorApplicationsMap = new Map<string, string>();
      if (favoriteVendorIds.length > 0) {
        const { data: vendorApps } = await supabase
          .from('vendor_applications')
          .select('event_id, vendors!inner(business_name)')
          .in('vendor_id', favoriteVendorIds)
          .eq('application_status', 'approved')
          .eq('payment_status', 'paid');

        vendorApps?.forEach(app => {
          allEventIds.push(app.event_id);
          vendorApplicationsMap.set(app.event_id, (app.vendors as any)?.business_name || '');
        });
      }

      // Remove duplicates
      allEventIds = [...new Set(allEventIds)];

      if (allEventIds.length === 0) {
        setFavoriteVendorEvents([]);
        setFollowingEvents([]);
        setVendingEvents([]);
        setHostingEvents([]);
        setDataFetched(true);
        setLoading(false);
        return;
      }

      // Batch fetch events and days
      const [eventsResult, daysResult] = await Promise.all([
        supabase.from('events').select('id, title, city, state, venue').in('id', allEventIds),
        supabase.from('event_days').select('event_id, day_date').in('event_id', allEventIds)
      ]);

      const events = eventsResult.data || [];
      const eventDays = daysResult.data || [];

      // Build calendar events for each type
      const favoriteEvents: CalendarEvent[] = [];
      const following: CalendarEvent[] = [];
      const vending: CalendarEvent[] = [];
      const hosting: CalendarEvent[] = [];

      events.forEach(event => {
        const days = eventDays.filter(d => d.event_id === event.id);
        
        days.forEach(day => {
          const baseEvent = {
            id: `${event.id}-${day.day_date}`,
            title: event.title,
            date: parseISO(day.day_date),
            city: event.city,
            state: event.state,
            venue: event.venue,
          };

          // Favorite vendor events
          if (vendorApplicationsMap.has(event.id)) {
            favoriteEvents.push({
              ...baseEvent,
              type: 'favorite_vendor',
              vendorName: vendorApplicationsMap.get(event.id)
            });
          }

          // Following events
          if (followedEventIds.includes(event.id)) {
            following.push({ ...baseEvent, type: 'following' });
          }

          // Vending events
          if (vendingEventIds.includes(event.id)) {
            vending.push({ ...baseEvent, type: 'vending' });
          }

          // Hosting events
          if (hostingEventIds.includes(event.id)) {
            hosting.push({ ...baseEvent, type: 'hosting' });
          }
        });
      });

      setFavoriteVendorEvents(favoriteEvents);
      setFollowingEvents(following);
      setVendingEvents(vending);
      setHostingEvents(hosting);
      setDataFetched(true);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);


  const activeEvents = useMemo(() => {
    switch (activeTab) {
      case 'favorites':
        return favoriteVendorEvents;
      case 'following':
        return followingEvents;
      case 'vending':
        return vendingEvents;
      case 'hosting':
        return hostingEvents;
      default:
        return [];
    }
  }, [activeTab, favoriteVendorEvents, followingEvents, vendingEvents, hostingEvents]);

  const eventDates = useMemo(() => activeEvents.map(e => e.date), [activeEvents]);
  
  const eventsForSelectedDate = useMemo(() => 
    selectedDate 
      ? activeEvents.filter(event => isSameDay(event.date, selectedDate))
      : [],
    [selectedDate, activeEvents]
  );

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'favorite_vendor':
        return <Heart className="h-3 w-3 text-destructive" />;
      case 'following':
        return <Ticket className="h-3 w-3 text-primary" />;
      case 'vending':
        return <Store className="h-3 w-3 text-accent-foreground" />;
      case 'hosting':
        return <Megaphone className="h-3 w-3 text-primary" />;
      default:
        return null;
    }
  }, []);

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

  const totalEvents = favoriteVendorEvents.length + followingEvents.length + vendingEvents.length + hostingEvents.length;

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
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-4 mb-6">
            <TabsTrigger value="favorites" className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Favorites</span>
              {favoriteVendorEvents.length > 0 && (
                <Badge variant="secondary" className="ml-1">{favoriteVendorEvents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center gap-1">
              <Ticket className="h-4 w-4" />
              <span className="hidden sm:inline">Following</span>
              {followingEvents.length > 0 && (
                <Badge variant="secondary" className="ml-1">{followingEvents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vending" className="flex items-center gap-1">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Vending</span>
              {vendingEvents.length > 0 && (
                <Badge variant="secondary" className="ml-1">{vendingEvents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="hosting" className="flex items-center gap-1">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Hosting</span>
              {hostingEvents.length > 0 && (
                <Badge variant="secondary" className="ml-1">{hostingEvents.length}</Badge>
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
                    {activeTab === 'hosting' && 'My Hosted Events'}
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
