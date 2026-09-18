import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { SubscriptionButton } from '@/components/SubscriptionButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Calendar, MapPin, Store, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface SubscribedVendor {
  id: string;
  business_name: string;
  business_description: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  avatar_url: string | null;
  verified: boolean;
  rating: number;
  specialties: string[] | null;
  vendor_types: string[] | null;
}

interface SubscribedEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  address: string;
  city: string;
  state: string;
  event_type: string;
  organizer_name: string;
  image_url: string | null;
}

const Subscriptions = () => {
  const { user } = useAuth();
  const { subscriptions, loading: subscriptionsLoading, getSubscriptionsByType } = useSubscriptions();
  const [subscribedVendors, setSubscribedVendors] = useState<SubscribedVendor[]>([]);
  const [subscribedEvents, setSubscribedEvents] = useState<SubscribedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscribedVendors = async () => {
    const vendorSubscriptions = getSubscriptionsByType('vendor');
    if (vendorSubscriptions.length === 0) {
      setSubscribedVendors([]);
      return;
    }

    try {
      const vendorIds = vendorSubscriptions.map(sub => sub.target_id);
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .in('id', vendorIds);

      if (error) throw error;
      setSubscribedVendors(data || []);
    } catch (error) {
      console.error('Error fetching subscribed vendors:', error);
      toast.error('Failed to load subscribed vendors');
    }
  };

  const fetchSubscribedEvents = async () => {
    const eventSubscriptions = getSubscriptionsByType('event');
    if (eventSubscriptions.length === 0) {
      setSubscribedEvents([]);
      return;
    }

    try {
      const eventIds = eventSubscriptions.map(sub => sub.target_id);
      const { data, error } = await (supabase as any)
        .from('public_events')
        .select('*')
        .in('id', eventIds)
        .order('date', { ascending: true });

      if (error) throw error;
      setSubscribedEvents(data || []);
    } catch (error) {
      console.error('Error fetching subscribed events:', error);
      toast.error('Failed to load subscribed events');
    }
  };

  useEffect(() => {
    if (!subscriptionsLoading && subscriptions.length >= 0) {
      Promise.all([
        fetchSubscribedVendors(),
        fetchSubscribedEvents()
      ]).finally(() => setLoading(false));
    }
  }, [subscriptions, subscriptionsLoading]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">My Subscriptions</h1>
            <p className="text-muted-foreground">Please sign in to view your subscriptions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Bell className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">My Subscriptions</h1>
            <p className="text-muted-foreground">
              Manage your subscriptions to vendors and events
            </p>
          </div>
        </div>

        <Tabs defaultValue="vendors" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Vendors ({subscribedVendors.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Events ({subscribedEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="mt-6">
            {loading ? (
              <div className="text-center py-8">Loading subscribed vendors...</div>
            ) : subscribedVendors.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Vendor Subscriptions</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't subscribed to any vendors yet.
                </p>
                <Button asChild>
                  <Link to="/vendors">Browse Vendors</Link>
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subscribedVendors.map((vendor) => (
                  <Card key={vendor.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">
                            {vendor.business_name}
                            {vendor.verified && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Verified
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <span>⭐ {vendor.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        <SubscriptionButton
                          type="vendor"
                          targetId={vendor.id}
                          showText={false}
                          size="icon"
                          variant="ghost"
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {vendor.business_description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {vendor.business_description}
                        </p>
                      )}
                      
                      {vendor.business_address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{vendor.business_address}</span>
                        </div>
                      )}

                      {vendor.specialties && vendor.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {vendor.specialties.slice(0, 3).map((specialty, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                          {vendor.specialties.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{vendor.specialties.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link to={`/vendor/${vendor.id}`} className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          View Profile
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            {loading ? (
              <div className="text-center py-8">Loading subscribed events...</div>
            ) : subscribedEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Event Subscriptions</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't subscribed to any events yet.
                </p>
                <Button asChild>
                  <Link to="/events">Browse Events</Link>
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subscribedEvents.map((event) => (
                  <Card key={event.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg line-clamp-2 flex-1">
                          {event.title}
                        </CardTitle>
                        <SubscriptionButton
                          type="event"
                          targetId={event.id}
                          showText={false}
                          size="icon"
                          variant="ghost"
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="truncate">
                            {event.venue}, {event.city}, {event.state}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 items-center mb-3">
                        <Badge variant="outline">{event.event_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          by {event.organizer_name}
                        </span>
                      </div>

                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link to={`/events`} className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          View Event
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Subscriptions;