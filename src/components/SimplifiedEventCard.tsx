import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Calendar, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SimplifiedEventCardProps {
  event: {
    id: string;
    title: string;
    date: string;
    city: string;
    state: string;
    flyerUrl?: string;
    cardTypes: string[];
  };
}

const SimplifiedEventCard = ({ event }: SimplifiedEventCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);

  useEffect(() => {
    const fetchTicketCount = async () => {
      if (!user) return;
      const { count } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('user_id', user.id);
      setTicketCount(count || 0);
    };
    fetchTicketCount();
  }, [user, event.id]);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('user_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('target_id', event.id)
          .eq('subscription_type', 'event')
          .maybeSingle();
        
        setIsFavorited(!!data);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [user, event.id]);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please sign in to save favorites');
      return;
    }

    setLoadingFavorite(true);
    try {
      if (isFavorited) {
        await supabase
          .from('user_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', event.id)
          .eq('subscription_type', 'event');
        
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            target_id: event.id,
            subscription_type: 'event'
          });
        
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setLoadingFavorite(false);
    }
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group relative"
      onClick={() => navigate(`/event/${event.id}`)}
    >
      {/* Favorite Button */}
      <Button
        variant="ghost"
        size="icon"
        className={`absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background ${
          isFavorited ? 'text-red-500' : 'text-muted-foreground'
        }`}
        onClick={handleFavoriteToggle}
        disabled={loadingFavorite}
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
      </Button>

      {/* Event Image */}
      <div className="relative h-64 overflow-hidden bg-muted">
        {event.flyerUrl ? (
          <img
            src={event.flyerUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-primary">
            <Calendar className="w-16 h-16 text-primary-foreground opacity-50" />
          </div>
        )}
        
        {/* Card Types Badge */}
        {event.cardTypes.length > 0 && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
              {event.cardTypes[0]}
            </Badge>
          </div>
        )}
      </div>

      {/* Event Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 mr-2 text-primary" />
          <span>{event.date}</span>
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mr-2 text-primary" />
          <span>{event.city}, {event.state}</span>
        </div>

        {ticketCount > 0 && (
          <div className="flex items-center text-sm font-medium text-primary">
            <Ticket className="w-4 h-4 mr-2" />
            <span>{ticketCount} ticket{ticketCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SimplifiedEventCard;
