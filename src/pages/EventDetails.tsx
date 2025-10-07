import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Calendar, Users, Tag, Settings, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import EventVendors from '@/components/EventVendors';
import { SubscriptionButton } from '@/components/SubscriptionButton';
import { LayoutDrawingTool } from '@/components/LayoutDrawingTool';
import { VendorApplicationDialog } from '@/components/VendorApplicationDialog';
import { SponsorApplicationDialog } from '@/components/SponsorApplicationDialog';
import { EventSponsors } from '@/components/EventSponsors';
import EditEventDialog from '@/components/EditEventDialog';
import ManageVendorsDialog from '@/components/ManageVendorsDialog';
import ManageSponsorsDialog from '@/components/ManageSponsorsDialog';

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasRole } = useUserRoles();
  const { subscribed, subscription_tier } = useSubscription();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [sponsorDialogOpen, setSponsorDialogOpen] = useState(false);
  const [vendorCount, setVendorCount] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [organizerEmail, setOrganizerEmail] = useState<string | null>(null);
  const [manageVendorsOpen, setManageVendorsOpen] = useState(false);
  const [manageSponsorsOpen, setManageSponsorsOpen] = useState(false);

  const isVendorPro = subscribed && 
    (subscription_tier === 'Vendor Pro' || subscription_tier === 'vendor_pro');
  const canSeeVendorInfo = hasRole('vendor') || isVendorPro;
  const canSeeSponsorInfo = hasRole('sponsor');

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
        setIsOrganizer(user?.id === data.organizer_id);

        // Fetch organizer email
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', data.organizer_id)
          .single();
        
        if (profileData) {
          setOrganizerEmail(profileData.email);
        }

        // Fetch vendor count
        const { count, error: vendorError } = await supabase
          .from('vendor_applications')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', id)
          .eq('application_status', 'approved');

        if (!vendorError && count !== null) {
          setVendorCount(count);
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, user]);

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

        {isOrganizer && (
          <div className="mb-6 flex gap-2">
            <Button
              onClick={() => setEditDialogOpen(true)}
              variant="outline"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Event
            </Button>
            <Button
              onClick={() => setManageVendorsOpen(true)}
              variant="outline"
            >
              <Store className="w-4 h-4 mr-2" />
              Manage Vendors
            </Button>
            <Button
              onClick={() => setManageSponsorsOpen(true)}
              variant="outline"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Sponsors
            </Button>
          </div>
        )}

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
                {organizerEmail && !isOrganizer && (
                  <CardDescription className="text-base">
                    <a 
                      href={`mailto:${organizerEmail}?subject=Question about ${encodeURIComponent(event.title)}`}
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Contact Event Organizer
                    </a>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {event.flyer_url && (
                  <div className="aspect-[9/16] rounded-lg overflow-hidden max-w-md mx-auto bg-muted">
                    <img
                      src={event.flyer_url}
                      alt={event.title}
                      className="w-full h-full object-contain"
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

                  <div className="flex items-center gap-3">
                    <Store className="w-5 h-5 text-muted-foreground" />
                    <p className="font-medium">{vendorCount} vendor{vendorCount !== 1 ? 's' : ''}</p>
                  </div>
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

                <EventSponsors eventId={event.id} />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Vendors at this Event</h3>
                  <EventVendors eventId={event.id} maxDisplay={10} />
                </div>

                {event.layout_json && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Floor Plan Layout</h3>
                      <LayoutDrawingTool
                        initialLayout={event.layout_json}
                        readOnly={true}
                      />
                    </div>
                  </>
                )}

                <Separator />
                <EventSponsors eventId={event.id} />
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

            {event.total_tables && canSeeVendorInfo && (
              <Card>
                <CardHeader>
                  <CardTitle>Vendor Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.vendor_table_price && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Table Price</span>
                      <span className="text-2xl font-bold">${event.vendor_table_price}</span>
                    </div>
                  )}

                  {!isOrganizer && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setVendorDialogOpen(true)}
                    >
                      <Store className="mr-2 h-4 w-4" />
                      Apply to be a Vendor
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {canSeeSponsorInfo && (
              <Card>
                <CardHeader>
                  <CardTitle>Sponsor Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Support this event and get your brand in front of the community.
                  </p>

                  {!isOrganizer && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setSponsorDialogOpen(true)}
                    >
                      <Store className="mr-2 h-4 w-4" />
                      Apply to be a Sponsor
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <VendorApplicationDialog
          eventId={event.id}
          eventTitle={event.title}
          vendorTablePrice={event.vendor_table_price}
          open={vendorDialogOpen}
          onOpenChange={setVendorDialogOpen}
        />

        <SponsorApplicationDialog
          eventId={event.id}
          eventTitle={event.title}
          open={sponsorDialogOpen}
          onOpenChange={setSponsorDialogOpen}
        />

        <EditEventDialog
          eventId={event.id}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onEventUpdated={() => {
            // Refresh event data
            window.location.reload();
          }}
        />

        <ManageVendorsDialog
          open={manageVendorsOpen}
          onOpenChange={setManageVendorsOpen}
          eventId={event.id}
          eventTitle={event.title}
        />

        <ManageSponsorsDialog
          open={manageSponsorsOpen}
          onOpenChange={setManageSponsorsOpen}
          eventId={event.id}
          eventTitle={event.title}
        />
      </div>
    </div>
  );
};

export default EventDetails;
