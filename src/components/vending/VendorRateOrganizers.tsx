import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, Heart, Ban, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface OrganizerEntry {
  organizer_id: string;
  organizer_name: string;
  event_count: number;
  last_events: string[];
  // note fields
  note_id: string | null;
  private_rating: number | null;
  private_notes: string;
  is_favorite: boolean;
  is_blacklisted: boolean;
  blacklist_reason: string;
}

interface VendorRateOrganizersProps {
  vendorId: string;
}

const VendorRateOrganizers = ({ vendorId }: VendorRateOrganizersProps) => {
  const { user } = useAuth();
  const [organizers, setOrganizers] = useState<OrganizerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempRating, setTempRating] = useState(0);
  const [tempNotes, setTempNotes] = useState('');
  const [tempFavorite, setTempFavorite] = useState(false);
  const [tempBlacklisted, setTempBlacklisted] = useState(false);
  const [tempBlacklistReason, setTempBlacklistReason] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user || !vendorId) return;
    fetchOrganizers();
  }, [user, vendorId]);

  const fetchOrganizers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get all events the vendor has applied to
      const { data: apps } = await supabase
        .from('vendor_applications')
        .select('event_id')
        .eq('vendor_id', vendorId);

      if (!apps || apps.length === 0) {
        setOrganizers([]);
        setLoading(false);
        return;
      }

      const eventIds = apps.map(a => a.event_id);

      // Get events with organizer info
      const { data: events } = await supabase
        .from('events')
        .select('id, title, organizer_id, organizer_name')
        .in('id', eventIds);

      if (!events || events.length === 0) {
        setOrganizers([]);
        setLoading(false);
        return;
      }

      // Group by organizer
      const orgMap = new Map<string, { name: string; events: string[] }>();
      for (const ev of events) {
        const existing = orgMap.get(ev.organizer_id);
        if (existing) {
          existing.events.push(ev.title);
        } else {
          orgMap.set(ev.organizer_id, {
            name: ev.organizer_name,
            events: [ev.title],
          });
        }
      }

      // Get existing notes
      const { data: notes } = await supabase
        .from('vendor_organizer_notes')
        .select('*')
        .eq('vendor_id', vendorId);

      const notesMap = new Map(
        (notes || []).map(n => [n.organizer_id, n])
      );

      const entries: OrganizerEntry[] = Array.from(orgMap.entries()).map(
        ([orgId, info]) => {
          const note = notesMap.get(orgId);
          return {
            organizer_id: orgId,
            organizer_name: info.name,
            event_count: info.events.length,
            last_events: info.events.slice(0, 2),
            note_id: note?.id || null,
            private_rating: note?.private_rating || null,
            private_notes: note?.private_notes || '',
            is_favorite: note?.is_favorite || false,
            is_blacklisted: note?.is_blacklisted || false,
            blacklist_reason: note?.blacklist_reason || '',
          };
        }
      );

      // Sort: unrated first, then by name
      entries.sort((a, b) => {
        if (!a.private_rating && b.private_rating) return -1;
        if (a.private_rating && !b.private_rating) return 1;
        return a.organizer_name.localeCompare(b.organizer_name);
      });

      setOrganizers(entries);
    } catch (error) {
      console.error('Error fetching organizers:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (org: OrganizerEntry) => {
    setEditingId(org.organizer_id);
    setTempRating(org.private_rating || 0);
    setTempNotes(org.private_notes || '');
    setTempFavorite(org.is_favorite);
    setTempBlacklisted(org.is_blacklisted);
    setTempBlacklistReason(org.blacklist_reason || '');
    setHoveredStar(0);
  };

  const handleSave = async (org: OrganizerEntry) => {
    if (!user) return;
    try {
      const payload = {
        vendor_id: vendorId,
        organizer_id: org.organizer_id,
        private_rating: tempRating > 0 ? tempRating : null,
        private_notes: tempNotes || null,
        is_favorite: tempFavorite,
        is_blacklisted: tempBlacklisted,
        blacklist_reason: tempBlacklisted ? (tempBlacklistReason || null) : null,
      };

      if (org.note_id) {
        const { error } = await supabase
          .from('vendor_organizer_notes')
          .update(payload)
          .eq('id', org.note_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendor_organizer_notes')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Saved!');
      setEditingId(null);
      fetchOrganizers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  const toggleQuickFavorite = async (org: OrganizerEntry) => {
    if (!user) return;
    try {
      const newVal = !org.is_favorite;
      if (org.note_id) {
        await supabase
          .from('vendor_organizer_notes')
          .update({ is_favorite: newVal })
          .eq('id', org.note_id);
      } else {
        await supabase
          .from('vendor_organizer_notes')
          .insert({
            vendor_id: vendorId,
            organizer_id: org.organizer_id,
            is_favorite: newVal,
          });
      }
      toast.success(newVal ? 'Shortlisted!' : 'Removed from shortlist');
      fetchOrganizers();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const renderStars = (rating: number, interactive = false) => {
    const display = interactive && hoveredStar > 0 ? hoveredStar : rating;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`h-5 w-5 ${interactive ? 'cursor-pointer' : ''} ${
              star <= display
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

  const filtered = organizers.filter(org => {
    if (filter === 'favorites') return org.is_favorite;
    if (filter === 'banned') return org.is_blacklisted;
    if (filter === 'unrated') return !org.private_rating;
    return true;
  });

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
          Rate Organizers
        </CardTitle>
        <CardDescription>Your private ratings and notes for event organizers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <ToggleGroup type="single" value={filter} onValueChange={v => setFilter(v || 'all')} size="sm">
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="unrated">Unrated</ToggleGroupItem>
            <ToggleGroupItem value="favorites">Shortlisted</ToggleGroupItem>
            <ToggleGroupItem value="banned">Banned</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{organizers.length === 0 ? 'No organizers to rate yet' : 'No organizers match this filter'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(org => (
              <div key={org.organizer_id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{org.organizer_name}</h4>
                      {org.is_favorite && (
                        <Heart className="h-4 w-4 fill-red-500 text-red-500 shrink-0" />
                      )}
                      {org.is_blacklisted && (
                        <Ban className="h-4 w-4 text-destructive shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {org.event_count} event{org.event_count !== 1 ? 's' : ''} ·{' '}
                      {org.last_events.join(', ')}
                      {org.event_count > 2 && '…'}
                    </p>
                  </div>

                  {editingId === org.organizer_id ? (
                    <div className="space-y-3 w-full max-w-sm">
                      {renderStars(tempRating, true)}

                      <div className="flex gap-2">
                        <Button
                          variant={tempFavorite ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTempFavorite(!tempFavorite)}
                          className={tempFavorite ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                        >
                          <Heart className={`h-4 w-4 ${tempFavorite ? 'fill-current' : ''}`} />
                          <span className="ml-1">Shortlist</span>
                        </Button>
                        <Button
                          variant={tempBlacklisted ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => setTempBlacklisted(!tempBlacklisted)}
                        >
                          <Ban className="h-4 w-4" />
                          <span className="ml-1">Ban</span>
                        </Button>
                      </div>

                      {tempBlacklisted && (
                        <Textarea
                          placeholder="Reason for ban (optional)..."
                          value={tempBlacklistReason}
                          onChange={e => setTempBlacklistReason(e.target.value)}
                          className="min-h-[40px]"
                        />
                      )}

                      <Textarea
                        placeholder="Private notes (optional)..."
                        value={tempNotes}
                        onChange={e => setTempNotes(e.target.value)}
                        className="min-h-[60px]"
                      />

                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleSave(org)}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      {org.private_rating ? renderStars(org.private_rating) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleQuickFavorite(org)}
                        title={org.is_favorite ? 'Remove from shortlist' : 'Add to shortlist'}
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            org.is_favorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                          }`}
                        />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => startEditing(org)}>
                        {org.private_rating ? 'Edit' : 'Rate'}
                      </Button>
                    </div>
                  )}
                </div>

                {org.private_notes && editingId !== org.organizer_id && (
                  <p className="text-sm text-muted-foreground mt-2 italic">"{org.private_notes}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorRateOrganizers;
