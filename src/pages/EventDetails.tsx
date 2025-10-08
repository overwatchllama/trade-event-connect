import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { format, parseISO } from 'date-fns';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Calendar, Users, Tag, Settings, Store, Mail, Phone, Instagram, Twitter, Facebook, ExternalLink, Share2 } from 'lucide-react';
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
  const [socialMediaLinks, setSocialMediaLinks] = useState<any[]>([]);
  const [eventDays, setEventDays] = useState<any[]>([]);
  const [hasApplied, setHasApplied] = useState(false);

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
          .eq('application_status', 'approved')
          .eq('payment_status', 'paid');

        if (!vendorError && count !== null) {
          setVendorCount(count);
        }

        // Fetch social media links
        const { data: socialData, error: socialError } = await supabase
          .from('event_social_media')
          .select('*')
          .eq('event_id', id);

        if (!socialError && socialData) {
          setSocialMediaLinks(socialData);
        }

        // Fetch event days for pricing
        if (data.is_multi_day) {
          const { data: daysData, error: daysError } = await supabase
            .from('event_days')
            .select('*')
            .eq('event_id', id)
            .order('day_number');

          if (!daysError && daysData) {
            setEventDays(daysData);
          }
        }

        // Check if user has already applied as vendor
        if (user) {
          const { data: applicationData } = await supabase
            .from('vendor_applications')
            .select('id')
            .eq('event_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

          setHasApplied(!!applicationData);
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

  const handleShareEvent = async () => {
    const eventUrl = `${window.location.origin}/event/${id}`;
    const shareUrl = `https://gsjwamfnoezhwlhkqzdn.supabase.co/functions/v1/event-share?id=${id}&redirect=${encodeURIComponent(eventUrl)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: event?.title || 'Event', url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Share link copied to clipboard!');
      }
    } catch (err) {
      toast.error('Failed to share. Link copied to clipboard.');
      try { await navigator.clipboard.writeText(shareUrl); } catch {}
    }
  };

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
      <Helmet>
        <title>{event.title} - CC Events</title>
        <meta name="description" content={event.description || `Join us for ${event.title} at ${event.venue_name || 'this exciting event'}`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={event.title} />
        <meta property="og:description" content={event.description || `Join us for ${event.title} at ${event.venue_name || 'this exciting event'}`} />
        {event.flyer_url && <meta property="og:image" content={event.flyer_url} />}
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={event.title} />
        <meta name="twitter:description" content={event.description || `Join us for ${event.title} at ${event.venue_name || 'this exciting event'}`} />
        {event.flyer_url && <meta name="twitter:image" content={event.flyer_url} />}
      </Helmet>
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
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-3xl">{event.title}</CardTitle>
                  <Button
                    onClick={handleShareEvent}
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
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

                {event.floor_plan_url && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Floor Plan</h3>
                    <a 
                      href={event.floor_plan_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block aspect-video rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <img
                        src={event.floor_plan_url}
                        alt="Event floor plan"
                        className="w-full h-full object-contain"
                      />
                    </a>
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

                {(event.contact_email || event.contact_phone || socialMediaLinks.length > 0) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Contact & Social Media</h3>
                      <div className="space-y-3">
                        {event.contact_email && (
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-muted-foreground" />
                            <a 
                              href={`mailto:${event.contact_email}`}
                              className="text-primary hover:underline"
                            >
                              {event.contact_email}
                            </a>
                            {event.preferred_contact_method === 'email' && (
                              <Badge variant="secondary" className="text-xs">Preferred</Badge>
                            )}
                          </div>
                        )}
                        
                        {event.contact_phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-muted-foreground" />
                            <a 
                              href={`tel:${event.contact_phone}`}
                              className="text-primary hover:underline"
                            >
                              {event.contact_phone}
                            </a>
                            {event.preferred_contact_method === 'phone' && (
                              <Badge variant="secondary" className="text-xs">Preferred</Badge>
                            )}
                          </div>
                        )}

                        {socialMediaLinks.length > 0 && (
                          <div className="pt-2">
                            <p className="text-sm text-muted-foreground mb-3">
                              Follow us on social media
                              {event.preferred_contact_method === 'social_media' && ' (Preferred contact method)'}:
                            </p>
                            <div className="flex flex-wrap gap-3">
                              {socialMediaLinks.map((link) => {
                                const getSocialIcon = (platform: string) => {
                                  switch (platform.toLowerCase()) {
                                    case 'instagram':
                                      return <Instagram className="w-5 h-5" />;
                                    case 'x':
                                      return <Twitter className="w-5 h-5" />;
                                    case 'facebook':
                                      return <Facebook className="w-5 h-5" />;
                                    case 'tiktok':
                                      return <ExternalLink className="w-5 h-5" />;
                                    default:
                                      return <ExternalLink className="w-5 h-5" />;
                                  }
                                };

                                return (
                                  <Button
                                    key={link.id}
                                    variant="outline"
                                    size="sm"
                                    asChild
                                  >
                                    <a
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2"
                                    >
                                      {getSocialIcon(link.platform)}
                                      <span className="capitalize">{link.platform}</span>
                                    </a>
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <EventSponsors eventId={event.id} />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Vendors at this Event</h3>
                  <EventVendors eventId={event.id} maxDisplay={10} />
                </div>

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
                {event.is_multi_day && eventDays.length > 0 ? (
                  <div className="space-y-3">
                    {eventDays.map((day) => (
                      <div key={day.id} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(day.day_date), 'EEEE, MMM d')}
                        </span>
                        <span className="text-lg font-bold">
                          ${day.ticket_cost || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Entry Fee</span>
                    <span className="text-2xl font-bold">
                      ${event.entry_fee || 0}
                    </span>
                  </div>
                )}

                {event.age_pricing_info && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">{event.age_pricing_info}</p>
                  </div>
                )}

                {!event.no_online_ticket_sales && (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleBuyTicket}
                    disabled={purchasing}
                  >
                    {purchasing ? 'Processing...' : 'Buy Ticket'}
                  </Button>
                )}

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

                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setVendorDialogOpen(true)}
                    disabled={hasApplied}
                  >
                    <Store className="mr-2 h-4 w-4" />
                    {hasApplied ? 'Application Submitted' : 'Apply to be a Vendor'}
                  </Button>
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

                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setSponsorDialogOpen(true)}
                  >
                    <Store className="mr-2 h-4 w-4" />
                    Apply to be a Sponsor
                  </Button>
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
