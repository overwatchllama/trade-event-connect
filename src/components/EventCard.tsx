import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, Crown, Settings, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionButton } from "@/components/SubscriptionButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import ManageVendorsDialog from "./ManageVendorsDialog";
import EventVendors from "./EventVendors";

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
  };
  userType?: "collector" | "vendor" | "organizer";
  isMyEvent?: boolean;
}

const EventCard = ({ event, userType = "collector", isMyEvent = false }: EventCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscribed, subscription_tier, loading: subscriptionLoading } = useSubscription();
  const [bookingLoading, setBookingLoading] = useState(false);
  const [manageVendorsOpen, setManageVendorsOpen] = useState(false);
  const [organizerVendorId, setOrganizerVendorId] = useState<string | null>(null);

  const isVendorPro = subscribed && 
    (subscription_tier === 'Vendor Pro' || subscription_tier === 'vendor_pro');

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
        className="overflow-hidden hover:shadow-event transition-all duration-300 group cursor-pointer"
        onClick={() => navigate(`/event/${event.id}`)}
      >
        <div className="aspect-video bg-gradient-subtle relative overflow-hidden">
          {event.image ? (
            <img 
              src={event.image} 
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
              <Calendar className="w-12 h-12 text-primary-foreground opacity-50" />
            </div>
          )}
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-background/90 text-foreground">
              ${event.price}
            </Badge>
          </div>
          <div className="absolute top-4 left-4 flex gap-2">
            {event.cardTypes.slice(0, 2).map((type, index) => (
              <Badge key={index} variant="outline" className="bg-background/90 text-foreground">
                {type}
              </Badge>
            ))}
            {event.cardTypes.length > 2 && (
              <Badge variant="outline" className="bg-background/90 text-foreground">
                +{event.cardTypes.length - 2}
              </Badge>
            )}
          </div>
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
                  >
                    {event.organizer}
                  </Link>
                ) : (
                  <span className="font-medium text-card-foreground">{event.organizer}</span>
                )}
              </div>
            </div>

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
                <>
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
                </>
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
    </>
  );
};

export default EventCard;