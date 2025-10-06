import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, Crown, Settings, UserCheck, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionButton } from "@/components/SubscriptionButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import ManageVendorsDialog from "./ManageVendorsDialog";
import ManageSponsorsDialog from "./ManageSponsorsDialog";
import EventVendors from "./EventVendors";
import { VendorApplicationDialog } from "./VendorApplicationDialog";
import { SponsorApplicationDialog } from "./SponsorApplicationDialog";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    city: string;
    state: string;
    organizer: string;
    organizer_id?: string;
    rating: number;
    attendees: number;
    maxAttendees: number;
    tablesAvailable: number;
    totalTables: number;
    cardTypes: string[];
    image?: string;
    price: number;
    event_type?: string;
  };
  userType?: "collector" | "vendor" | "organizer";
  isMyEvent?: boolean;
}

const EventCard = ({ event, userType = "collector", isMyEvent = false }: EventCardProps) => {
  const { user } = useAuth();
  const { hasRole } = useUserRoles();
  const navigate = useNavigate();
  const { subscribed, subscription_tier, loading: subscriptionLoading } = useSubscription();
  const [bookingLoading, setBookingLoading] = useState(false);
  const [manageVendorsOpen, setManageVendorsOpen] = useState(false);
  const [manageSponsorsOpen, setManageSponsorsOpen] = useState(false);
  const [organizerVendorId, setOrganizerVendorId] = useState<string | null>(null);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [sponsorDialogOpen, setSponsorDialogOpen] = useState(false);

  const isVendorPro = subscribed && 
    (subscription_tier === 'Vendor Pro' || subscription_tier === 'vendor_pro');

  const isShowEvent = event.event_type === 'show';

  // Check if organizer is a vendor
  useEffect(() => {
    const checkOrganizerVendorStatus = async () => {
      if (event.organizer_id) {
        try {
          const { data, error } = await supabase
            .from('vendors')
            .select('id')
            .eq('user_id', event.organizer_id)
            .single();
          
          if (data && !error) {
            setOrganizerVendorId(data.id);
          }
        } catch (error) {
          // Organizer is not a vendor, which is fine
        }
      }
    };

    checkOrganizerVendorStatus();
  }, [event.organizer_id]);

  const handleBookTable = async () => {
    if (!user) {
      toast.error('Please sign in to book a table');
      return;
    }

    setBookingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vendor-registration-payment', {
        body: {
          eventId: event.id,
          eventTitle: event.title
        }
      });

      if (error) throw error;

      if (data.isPro) {
        // Pro user - no payment needed
        toast.success('Table booked successfully! Pro subscription waives the fee.');
      } else if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to process table booking');
    } finally {
      setBookingLoading(false);
    }
  };
  return (
    <>
      <Card 
        className="overflow-hidden hover:shadow-event transition-all duration-300 group cursor-pointer w-full"
        onClick={() => navigate(`/event/${event.id}`)}
      >
        <div className="h-16 bg-gradient-primary relative overflow-hidden flex items-center justify-between px-4">
          <div className="flex gap-2 flex-wrap">
            {event.cardTypes.slice(0, 2).map((type, index) => (
              <Badge key={index} variant="outline" className="bg-background/90 text-foreground text-xs">
                {type}
              </Badge>
            ))}
            {event.cardTypes.length > 2 && (
              <Badge variant="outline" className="bg-background/90 text-foreground text-xs">
                +{event.cardTypes.length - 2}
              </Badge>
            )}
          </div>
          <Badge variant="secondary" className="bg-background/90 text-foreground">
            ${event.price}
          </Badge>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-card-foreground mb-2 group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{event.location}, {event.city}, {event.state}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-2" />
                <span>{event.date} at {event.time}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-vendor">{event.totalTables}</span> tables
              </div>
              <div className="text-sm text-muted-foreground">
                by {organizerVendorId ? (
                  <Link 
                    to={`/vendor/${organizerVendorId}`}
                    className="font-medium text-card-foreground hover:text-primary transition-colors underline decoration-dotted"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {event.organizer}
                  </Link>
                ) : (
                  <span className="font-medium text-card-foreground">{event.organizer}</span>
                )}
              </div>
            </div>

            {isShowEvent && (
              <div className="flex flex-col sm:flex-row gap-2 text-sm text-center">
                {hasRole('vendor') && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVendorDialogOpen(true);
                    }}
                  >
                    <Store className="w-3 h-3 mr-1" />
                    Apply as Vendor
                  </Button>
                )}
                {hasRole('sponsor') && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSponsorDialogOpen(true);
                    }}
                  >
                    <Crown className="w-3 h-3 mr-1" />
                    Become a Sponsor
                  </Button>
                )}
              </div>
            )}

            {/* Event Vendors */}
            <EventVendors eventId={event.id} maxDisplay={2} />

            <div className="flex gap-2 pt-2">
              {userType === "vendor" ? (
                <>
                  <Button 
                    variant="vendor" 
                    className="flex-1 relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookTable();
                    }}
                    disabled={bookingLoading || subscriptionLoading || event.tablesAvailable === 0}
                  >
                    {bookingLoading ? 'Processing...' : (
                      <>
                        {isVendorPro ? 'Book Table (Free)' : 'Book Table ($5)'}
                        {isVendorPro && <Crown className="w-4 h-4 ml-1" />}
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.info('Claim event feature coming soon!');
                    }}
                  >
                    Claim Event
                  </Button>
                </>
              ) : userType === "organizer" && isMyEvent ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setManageVendorsOpen(true);
                      }}
                    >
                      <Settings className="w-4 h-4" />
                      Manage Vendors
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <UserCheck className="w-4 h-4" />
                      Manage Attendees
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setManageSponsorsOpen(true);
                    }}
                  >
                    <Crown className="w-4 h-4" />
                    Manage Sponsors
                  </Button>
                </div>
              ) : (
                <>
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/event/${event.id}`);
                    }}
                  >
                    Buy Tickets
                  </Button>
                  <div onClick={(e) => e.stopPropagation()}>
                    <SubscriptionButton
                      type="event"
                      targetId={event.id}
                      size="default"
                      showText={false}
                    />
                  </div>
                </>
              )}
            </div>
            
            {/* Subscription button for vendors (additional row) */}
            {userType === "vendor" && (
              <div className="flex justify-center pt-2" onClick={(e) => e.stopPropagation()}>
                <SubscriptionButton
                  type="event"
                  targetId={event.id}
                  variant="ghost"
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>
      </Card>
      
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

      <VendorApplicationDialog
        eventId={event.id}
        eventTitle={event.title}
        vendorTablePrice={event.price}
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
      />

      <SponsorApplicationDialog
        eventId={event.id}
        eventTitle={event.title}
        open={sponsorDialogOpen}
        onOpenChange={setSponsorDialogOpen}
      />
    </>
  );
};

export default EventCard;