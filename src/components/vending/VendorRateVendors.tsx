import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, Heart, Ban, Filter, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface VendorEntry {
  target_vendor_id: string;
  business_name: string;
  specialties: string[];
  note_id: string | null;
  private_rating: number | null;
  private_notes: string;
  is_favorite: boolean;
  is_blacklisted: boolean;
  blacklist_reason: string;
}

interface VendorRateVendorsProps {
  vendorId: string;
}

const VendorRateVendors = ({ vendorId }: VendorRateVendorsProps) => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<VendorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempRating, setTempRating] = useState(0);
  const [tempNotes, setTempNotes] = useState('');
  const [tempFavorite, setTempFavorite] = useState(false);
  const [tempBlacklisted, setTempBlacklisted] = useState(false);
  const [tempBlacklistReason, setTempBlacklistReason] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user || !vendorId) return;
    fetchVendors();
  }, [user, vendorId]);

  const fetchVendors = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get all vendors except self
      const { data: allVendors } = await supabase
        .from('vendors')
        .select('id, business_name, specialties')
        .neq('id', vendorId)
        .order('business_name');

      // Get existing notes
      const { data: notes } = await supabase
        .from('vendor_vendor_notes')
        .select('*')
        .eq('vendor_id', vendorId);

      const notesMap = new Map(
        (notes || []).map(n => [n.target_vendor_id, n])
      );

      setVendors(
        (allVendors || []).map(v => {
          const note = notesMap.get(v.id);
          return {
            target_vendor_id: v.id,
            business_name: v.business_name,
            specialties: v.specialties || [],
            note_id: note?.id || null,
            private_rating: note?.private_rating || null,
            private_notes: note?.private_notes || '',
            is_favorite: note?.is_favorite || false,
            is_blacklisted: note?.is_blacklisted || false,
            blacklist_reason: note?.blacklist_reason || '',
          };
        })
      );
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (v: VendorEntry) => {
    setEditingId(v.target_vendor_id);
    setTempRating(v.private_rating || 0);
    setTempNotes(v.private_notes || '');
    setTempFavorite(v.is_favorite);
    setTempBlacklisted(v.is_blacklisted);
    setTempBlacklistReason(v.blacklist_reason || '');
    setHoveredStar(0);
  };

  const handleSave = async (v: VendorEntry) => {
    if (!user) return;
    try {
      const payload = {
        vendor_id: vendorId,
        target_vendor_id: v.target_vendor_id,
        private_rating: tempRating > 0 ? tempRating : null,
        private_notes: tempNotes || null,
        is_favorite: tempFavorite,
        is_blacklisted: tempBlacklisted,
        blacklist_reason: tempBlacklisted ? (tempBlacklistReason || null) : null,
      };

      if (v.note_id) {
        const { error } = await supabase
          .from('vendor_vendor_notes')
          .update(payload)
          .eq('id', v.note_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendor_vendor_notes')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Saved!');
      setEditingId(null);
      fetchVendors();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  const toggleQuickFavorite = async (v: VendorEntry) => {
    if (!user) return;
    try {
      const newVal = !v.is_favorite;
      if (v.note_id) {
        await supabase
          .from('vendor_vendor_notes')
          .update({ is_favorite: newVal })
          .eq('id', v.note_id);
      } else {
        await supabase
          .from('vendor_vendor_notes')
          .insert({
            vendor_id: vendorId,
            target_vendor_id: v.target_vendor_id,
            is_favorite: newVal,
          });
      }
      toast.success(newVal ? 'Shortlisted!' : 'Removed from shortlist');
      fetchVendors();
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

  const filtered = useMemo(() => {
    let list = vendors;

    // Apply filter
    if (filter === 'favorites') list = list.filter(v => v.is_favorite);
    else if (filter === 'blocked') list = list.filter(v => v.is_blacklisted);
    else if (filter === 'unrated') list = list.filter(v => !v.private_rating);

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.business_name.toLowerCase().includes(q) ||
        v.specialties.some(s => s.toLowerCase().includes(q))
      );
    }

    // Sort: rated vendors with notes first, then alphabetical
    return list.sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      if (!a.private_rating && b.private_rating) return 1;
      if (a.private_rating && !b.private_rating) return -1;
      return a.business_name.localeCompare(b.business_name);
    });
  }, [vendors, filter, search]);

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
          Rate Vendors
        </CardTitle>
        <CardDescription>Your private ratings and notes for other vendors</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <ToggleGroup type="single" value={filter} onValueChange={v => setFilter(v || 'all')} size="sm">
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="unrated">Unrated</ToggleGroupItem>
              <ToggleGroupItem value="favorites">Shortlisted</ToggleGroupItem>
              <ToggleGroupItem value="blocked">Blocked</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{vendors.length === 0 ? 'No other vendors found' : 'No vendors match this filter'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(v => (
              <div key={v.target_vendor_id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{v.business_name}</h4>
                      {v.is_favorite && (
                        <Heart className="h-4 w-4 fill-red-500 text-red-500 shrink-0" />
                      )}
                      {v.is_blacklisted && (
                        <Ban className="h-4 w-4 text-destructive shrink-0" />
                      )}
                    </div>
                    {v.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {v.specialties.slice(0, 3).map(s => (
                          <Badge key={s} variant="secondary" className="text-xs py-0">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {editingId === v.target_vendor_id ? (
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
                          <span className="ml-1">Block</span>
                        </Button>
                      </div>
                      {tempBlacklisted && (
                        <Textarea
                          placeholder="Reason for blocking (optional)..."
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
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                        <Button size="sm" onClick={() => handleSave(v)}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      {v.private_rating ? renderStars(v.private_rating) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleQuickFavorite(v)}
                        title={v.is_favorite ? 'Remove from shortlist' : 'Shortlist'}
                      >
                        <Heart className={`h-4 w-4 ${v.is_favorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => startEditing(v)}>
                        {v.private_rating ? 'Edit' : 'Rate'}
                      </Button>
                    </div>
                  )}
                </div>
                {v.private_notes && editingId !== v.target_vendor_id && (
                  <p className="text-sm text-muted-foreground mt-2 italic">"{v.private_notes}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorRateVendors;
