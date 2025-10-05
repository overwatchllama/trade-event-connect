import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Calendar, Clock, Users, DollarSign, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import EventVendors from '@/components/EventVendors';
import { SubscriptionButton } from '@/components/SubscriptionButton';

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        setEvent(data);
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleBuyTicket = async () => {
    if (!user) {
      toast.error('Please sign in to purchase tickets');
      navigate('/auth');
      return;
    }

    if (!event) return;

    setPurchasing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceAmount: event.entry_fee,
          successUrl: `${window.location.origin}/events?ticket=success&event=${event.id}`,
          cancelUrl: `${window.location.origin}/event/${event.id}`,
          metadata: {
            type: 'event_ticket',
            event_id: event.id,
            event_title: event.title,
            user_id: user.id,
          },
        },
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error('Failed to process ticket purchase');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-20 text-center">
              <p className="text-muted-foreground">Event not found</p>
              <Button onClick={() => navigate('/events')} className="mt-4">
                Back to Events
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/events')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-2 mb-4">
                  {event.card_types?.map((type: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {type}
                    </Badge>
                  ))}
                </div>
                <CardTitle className="text-3xl">{event.title}</CardTitle>
                <CardDescription className="text-base">
                  Organized by {event.organizer_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {event.flyer_url && (
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <img
                      src={event.flyer_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{event.venue}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.address}, {event.city}, {event.state} {event.zip_code}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <p className="font-medium">{event.date}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5 text-muted-foreground" />
                    <p className="font-medium capitalize">{event.event_type} Event</p>
                  </div>

                  {event.max_attendees && (
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <p className="font-medium">Max {event.max_attendees} attendees</p>
                    </div>
                  )}
                </div>

                {event.description && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">About This Event</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {event.description}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Vendors at this Event</h3>
                  <EventVendors eventId={event.id} maxDisplay={10} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ticket Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Entry Fee</span>
                  <span className="text-2xl font-bold">
                    ${event.entry_fee || 0}
                  </span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBuyTicket}
                  disabled={purchasing}
                >
                  {purchasing ? 'Processing...' : 'Buy Ticket'}
                </Button>

                <div className="text-center">
                  <SubscriptionButton
                    type="event"
                    targetId={event.id}
                    variant="ghost"
                    size="sm"
                  />
                </div>
              </CardContent>
            </Card>

            {event.total_tables && (
              <Card>
                <CardHeader>
                  <CardTitle>Vendor Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Tables</span>
                    <span className="font-medium">{event.total_tables}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available Tables</span>
                    <span className="font-medium text-success">
                      {event.tables_available || 0}
                    </span>
                  </div>
                  {event.vendor_table_price && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Table Price</span>
                      <span className="font-medium">${event.vendor_table_price}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
