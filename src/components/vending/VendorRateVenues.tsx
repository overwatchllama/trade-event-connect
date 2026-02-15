import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VenueRating {
  venue_id: string;
  venue_name: string;
  venue_city: string;
  venue_state: string;
  rating: number | null;
  review: string;
  rating_id: string | null;
}

interface VendorRateVenuesProps {
  vendorId: string;
}

const VendorRateVenues = ({ vendorId }: VendorRateVenuesProps) => {
  const { user } = useAuth();
  const [venues, setVenues] = useState<VenueRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempRating, setTempRating] = useState(0);
  const [tempReview, setTempReview] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);

  useEffect(() => {
    if (!user || !vendorId) return;
    fetchVenues();
  }, [user, vendorId]);

  const fetchVenues = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: allVenues } = await supabase
        .from('venues')
        .select('id, name, city, state')
        .order('name')
        .limit(50);

      const { data: ratings } = await supabase
        .from('vendor_venue_ratings')
        .select('*')
        .eq('vendor_id', vendorId);

      const ratingsMap = new Map(ratings?.map(r => [r.venue_id, r]) || []);

      setVenues((allVenues || []).map(venue => {
        const rating = ratingsMap.get(venue.id);
        return {
          venue_id: venue.id,
          venue_name: venue.name,
          venue_city: venue.city,
          venue_state: venue.state,
          rating: rating?.rating || null,
          review: rating?.review || '',
          rating_id: rating?.id || null,
        };
      }));
    } catch (error) {
      console.error('Error fetching venues for rating:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRating = async (venueId: string, existingRatingId: string | null) => {
    if (!user || tempRating === 0) return;
    try {
      if (existingRatingId) {
        const { error } = await supabase
          .from('vendor_venue_ratings')
          .update({ rating: tempRating, review: tempReview || null })
          .eq('id', existingRatingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendor_venue_ratings')
          .insert({
            vendor_id: vendorId,
            user_id: user.id,
            venue_id: venueId,
            rating: tempRating,
            review: tempReview || null,
          });
        if (error) throw error;
      }
      toast.success('Rating saved!');
      setEditingId(null);
      fetchVenues();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save rating');
    }
  };

  const startEditing = (venue: VenueRating) => {
    setEditingId(venue.venue_id);
    setTempRating(venue.rating || 0);
    setTempReview(venue.review || '');
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
          <MapPin className="h-5 w-5" />
          Rate Venues
        </CardTitle>
        <CardDescription>Rate venues you've vended at</CardDescription>
      </CardHeader>
      <CardContent>
        {venues.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No venues to rate yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {venues.map(venue => (
              <div key={venue.venue_id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{venue.venue_name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{venue.venue_city}, {venue.venue_state}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === venue.venue_id ? (
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
                          <Button size="sm" onClick={() => handleSaveRating(venue.venue_id, venue.rating_id)} disabled={tempRating === 0}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {venue.rating ? renderStars(venue.rating) : null}
                        <Button variant="outline" size="sm" onClick={() => startEditing(venue)}>
                          {venue.rating ? 'Edit' : 'Rate'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {venue.review && editingId !== venue.venue_id && (
                  <p className="text-sm text-muted-foreground mt-2 italic">"{venue.review}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorRateVenues;
