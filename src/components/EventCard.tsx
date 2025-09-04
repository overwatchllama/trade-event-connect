import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users, Clock, Star, Crown, Settings, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const { subscribed, subscription_tier, loading: subscriptionLoading } = useSubscription();
  const [bookingLoading, setBookingLoading] = useState(false);

  const isVendorPro = subscribed && 
    (subscription_tier === 'Vendor Pro' || subscription_tier === 'vendor_pro');

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
    <Card className="overflow-hidden hover:shadow-event transition-all duration-300 group">
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

          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center text-muted-foreground">
              <Users className="w-4 h-4 mr-2" />
              <span>{event.attendees}/{event.maxAttendees} attendees</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Star className="w-4 h-4 mr-2 text-warning fill-warning" />
              <span>{event.rating}/5.0</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {userType === "vendor" ? (
                event.tablesAvailable > 0 ? (
                  <div className="flex items-center gap-2">
                    <span>
                      <span className="font-medium text-vendor">{event.tablesAvailable}</span> tables{" "}
                      <span className="text-vendor underline cursor-pointer">available</span>
                    </span>
                    {isVendorPro && (
                      <Badge variant="secondary" className="text-xs bg-gradient-primary text-primary-foreground">
                        <Crown className="w-3 h-3 mr-1" />
                        Pro
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span>Tables <span className="text-destructive">not available</span></span>
                )
              ) : (
                <span>
                  <span className="font-medium text-vendor">{event.tablesAvailable}</span> tables available
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              by <span className="font-medium text-card-foreground">{event.organizer}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1">
              View Details
            </Button>
            {userType === "vendor" ? (
              <Button 
                variant="vendor" 
                className="flex-1 relative"
                onClick={handleBookTable}
                disabled={bookingLoading || subscriptionLoading || event.tablesAvailable === 0}
              >
                {bookingLoading ? 'Processing...' : (
                  <>
                    {isVendorPro ? 'Book Table (Free)' : 'Book Table ($5)'}
                    {isVendorPro && <Crown className="w-4 h-4 ml-1" />}
                  </>
                )}
              </Button>
            ) : userType === "organizer" && isMyEvent ? (
              <>
                <Button variant="default" className="flex-1 gap-2">
                  <Settings className="w-4 h-4" />
                  Manage Vendors
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <UserCheck className="w-4 h-4" />
                  Manage Attendees
                </Button>
              </>
            ) : (
              <Button variant="default" className="flex-1">
                Buy Tickets
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EventCard;