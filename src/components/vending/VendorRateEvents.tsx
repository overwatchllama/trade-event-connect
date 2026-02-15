import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface EventRating {
  event_id: string;
  event_title: string;
  event_date: string;
  rating: number | null;
  review: string;
  rating_id: string | null;
}

interface VendorRateEventsProps {
  vendorId: string;
}

const VendorRateEvents = ({ vendorId }: VendorRateEventsProps) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempRating, setTempRating] = useState(0);
  const [tempReview, setTempReview] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);

  useEffect(() => {
    if (!user || !vendorId) return;
    fetchEvents();
  }, [user, vendorId]);

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get all events (for rating any event)
      const { data: allEvents } = await supabase
        .from('events')
        .select('id, title, date')
        .order('date', { ascending: false })
        .limit(50);

      // Get existing ratings
      const { data: ratings } = await supabase
        .from('vendor_event_ratings')
        .select('*')
        .eq('vendor_id', vendorId);

      const ratingsMap = new Map(ratings?.map(r => [r.event_id, r]) || []);

      setEvents((allEvents || []).map(event => {
        const rating = ratingsMap.get(event.id);
        return {
          event_id: event.id,
          event_title: event.title,
          event_date: event.date,
          rating: rating?.rating || null,
          review: rating?.review || '',
          rating_id: rating?.id || null,
        };
      }));
    } catch (error) {
      console.error('Error fetching events for rating:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRating = async (eventId: string, existingRatingId: string | null) => {
    if (!user || tempRating === 0) return;
    try {
      if (existingRatingId) {
        const { error } = await supabase
          .from('vendor_event_ratings')
          .update({ rating: tempRating, review: tempReview || null })
          .eq('id', existingRatingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendor_event_ratings')
          .insert({
            vendor_id: vendorId,
            user_id: user.id,
            event_id: eventId,
            rating: tempRating,
            review: tempReview || null,
          });
        if (error) throw error;
      }
      toast.success('Rating saved!');
      setEditingId(null);
      fetchEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save rating');
    }
  };

  const startEditing = (event: EventRating) => {
    setEditingId(event.event_id);
    setTempRating(event.rating || 0);
    setTempReview(event.review || '');
    setHoveredStar(0);
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    const displayRating = interactive && hoveredStar > 0 ? hoveredStar : rating;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`h-5 w-5 ${interactive ? 'cursor-pointer' : ''} ${
              star <= displayRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
            onClick={interactive ? () => setTempRating(star) : undefined}
            onMouseEnter={interactive ? () => setHoveredStar(star) : undefined}
            onMouseLeave={interactive ? () => setHoveredStar(0) : undefined}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Rate Events
        </CardTitle>
        <CardDescription>Share your experience at events you've attended</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No events to rate yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.event_id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{event.event_title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      <span>{event.event_date ? format(parseISO(event.event_date), 'MMM d, yyyy') : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === event.event_id ? (
                      <div className="space-y-3">
                        {renderStars(tempRating, true)}
                        <Textarea
                          placeholder="Write a review (optional)..."
                          value={tempReview}
                          onChange={(e) => setTempReview(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => handleSaveRating(event.event_id, event.rating_id)} disabled={tempRating === 0}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {event.rating ? renderStars(event.rating) : null}
                        <Button variant="outline" size="sm" onClick={() => startEditing(event)}>
                          {event.rating ? 'Edit' : 'Rate'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {event.review && editingId !== event.event_id && (
                  <p className="text-sm text-muted-foreground mt-2 italic">"{event.review}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorRateEvents;
