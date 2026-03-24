import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Gift, Plus, Trophy, Clock, Users, Loader2, CheckCircle, XCircle, Shuffle, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { RaffleCountdown } from '@/components/raffle/RaffleCountdown';

interface VendorRafflesProps {
  vendorId: string;
}

interface VendorEvent {
  event_id: string;
  event_title: string;
  event_date: string;
}

interface RaffleItem {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  entry_method: string;
  claim_time_seconds: number;
  status: string;
  created_at: string;
}

interface RaffleDraw {
  id: string;
  raffle_item_id: string;
  winner_user_id: string;
  drawn_at: string;
  claim_deadline: string;
  claimed_at: string | null;
  status: string;
}

export const VendorRaffles = ({ vendorId }: VendorRafflesProps) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<VendorEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [raffles, setRaffles] = useState<RaffleItem[]>([]);
  const [draws, setDraws] = useState<Record<string, RaffleDraw[]>>({});
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [winnerProfiles, setWinnerProfiles] = useState<Record<string, { full_name: string | null; email: string }>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [drawing, setDrawing] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entryMethod, setEntryMethod] = useState('auto');
  const [claimTime, setClaimTime] = useState('120');
  const [filterFavorites, setFilterFavorites] = useState(false);

  // Fetch vendor's approved+paid events
  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('vendor_applications')
        .select('event_id, events!vendor_applications_event_id_fkey(title, date)')
        .eq('vendor_id', vendorId)
        .eq('application_status', 'approved')
        .eq('payment_status', 'paid');

      if (data) {
        const mapped = data
          .filter((d: any) => d.events)
          .map((d: any) => ({
            event_id: d.event_id,
            event_title: d.events.title,
            event_date: d.events.date,
          }))
          .sort((a: VendorEvent, b: VendorEvent) => b.event_date.localeCompare(a.event_date));
        setEvents(mapped);
        if (mapped.length > 0 && !selectedEventId) {
          setSelectedEventId(mapped[0].event_id);
        }
      }
      setLoading(false);
    };
    fetchEvents();
  }, [vendorId]);

  const fetchRaffles = useCallback(async () => {
    if (!selectedEventId) return;

    const { data, error } = await supabase
      .from('raffle_items')
      .select('*')
      .eq('event_id', selectedEventId)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vendor raffles:', error);
      return;
    }
    setRaffles(data || []);

    if (data && data.length > 0) {
      const ids = data.map(r => r.id);

      const [drawsRes, entriesRes] = await Promise.all([
        supabase.from('raffle_draws').select('*').in('raffle_item_id', ids),
        supabase.from('raffle_entries').select('raffle_item_id').in('raffle_item_id', ids),
      ]);

      if (drawsRes.data) {
        const grouped: Record<string, RaffleDraw[]> = {};
        const winnerIds = new Set<string>();
        drawsRes.data.forEach(d => {
          if (!grouped[d.raffle_item_id]) grouped[d.raffle_item_id] = [];
          grouped[d.raffle_item_id].push(d);
          winnerIds.add(d.winner_user_id);
        });
        setDraws(grouped);

        if (winnerIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', Array.from(winnerIds));
          if (profiles) {
            const map: Record<string, { full_name: string | null; email: string }> = {};
            profiles.forEach(p => { map[p.id] = { full_name: p.full_name, email: p.email }; });
            setWinnerProfiles(map);
          }
        }
      }

      if (entriesRes.data) {
        const counts: Record<string, number> = {};
        entriesRes.data.forEach(e => {
          counts[e.raffle_item_id] = (counts[e.raffle_item_id] || 0) + 1;
        });
        setEntryCounts(counts);
      }
    } else {
      setDraws({});
      setEntryCounts({});
    }
  }, [selectedEventId, vendorId]);

  // Fetch favorites count for current event
  useEffect(() => {
    if (!selectedEventId) return;
    const fetchFavCount = async () => {
      // Get users who favorited this vendor AND are checked in at the event
      const { data: favorites } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('subscription_type', 'favorite_vendor')
        .eq('target_id', vendorId);

      if (favorites && favorites.length > 0) {
        const favUserIds = favorites.map(f => f.user_id);
        const { data: checkedIn } = await supabase
          .from('order_items')
          .select('user_id')
          .eq('event_id', selectedEventId)
          .eq('checked_in', true)
          .in('user_id', favUserIds);

        const uniqueCheckedInFavs = new Set(checkedIn?.map(c => c.user_id) || []);
        setFavoritesCount(uniqueCheckedInFavs.size);
      } else {
        setFavoritesCount(0);
      }
    };
    fetchFavCount();
  }, [selectedEventId, vendorId]);

  useEffect(() => { fetchRaffles(); }, [fetchRaffles]);

  const handleCreate = async () => {
    if (!name.trim() || !selectedEventId) {
      toast.error('Please enter a raffle item name');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('raffle_items').insert({
        event_id: selectedEventId,
        organizer_id: user!.id,
        vendor_id: vendorId,
        name: name.trim(),
        description: description.trim() || null,
        entry_method: entryMethod,
        claim_time_seconds: parseInt(claimTime) || 120,
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Raffle item created!');
      setName('');
      setDescription('');
      setEntryMethod('auto');
      setClaimTime('120');
      setFilterFavorites(false);
      setDialogOpen(false);
      fetchRaffles();
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to create raffle item');
    } finally {
      setCreating(false);
    }
  };

  const activateRaffle = async (raffle: RaffleItem) => {
    if (raffle.entry_method === 'auto') {
      // Get checked-in attendees
      const { data: checkedIn } = await supabase
        .from('order_items')
        .select('user_id')
        .eq('event_id', raffle.event_id)
        .eq('checked_in', true);

      let eligibleUsers = [...new Set(checkedIn?.map(c => c.user_id) || [])];

      // If favorites-only filter is on, intersect with favorites
      if (favoritesOnly) {
        const { data: favorites } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('subscription_type', 'favorite_vendor')
          .eq('target_id', vendorId);

        const favSet = new Set(favorites?.map(f => f.user_id) || []);
        eligibleUsers = eligibleUsers.filter(uid => favSet.has(uid));
      }

      if (eligibleUsers.length > 0) {
        const entries = eligibleUsers.map(uid => ({
          raffle_item_id: raffle.id,
          user_id: uid,
        }));
        await supabase.from('raffle_entries').upsert(entries, { onConflict: 'raffle_item_id,user_id' });
      }
    }

    await supabase.from('raffle_items').update({ status: 'active' }).eq('id', raffle.id);
    toast.success('Raffle is now active!');
    fetchRaffles();
  };

  const drawWinner = async (raffle: RaffleItem) => {
    setDrawing(raffle.id);
    try {
      const { data: entries } = await supabase
        .from('raffle_entries')
        .select('user_id')
        .eq('raffle_item_id', raffle.id);

      if (!entries || entries.length === 0) {
        toast.error('No entries for this raffle!');
        return;
      }

      const previousWinners = (draws[raffle.id] || []).map(d => d.winner_user_id);
      const eligible = entries.filter(e => !previousWinners.includes(e.user_id));

      if (eligible.length === 0) {
        toast.error('No eligible entries remaining!');
        return;
      }

      const winner = eligible[Math.floor(Math.random() * eligible.length)];
      const claimDeadline = new Date(Date.now() + raffle.claim_time_seconds * 1000).toISOString();

      const { error: drawError } = await supabase.from('raffle_draws').insert({
        raffle_item_id: raffle.id,
        winner_user_id: winner.user_id,
        claim_deadline: claimDeadline,
        status: 'pending',
      });
      if (drawError) throw drawError;

      await supabase.from('raffle_items').update({ status: 'drawn' }).eq('id', raffle.id);

      // Get vendor business name for notification
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('business_name')
        .eq('id', vendorId)
        .single();

      await supabase.rpc('send_event_notifications', {
        p_event_id: raffle.event_id,
        p_notifications: [{
          user_id: winner.user_id,
          title: '🎉 You Won a Vendor Raffle!',
          message: `You won "${raffle.name}" from ${vendorData?.business_name || 'a vendor'}! Report to their table within ${Math.floor(raffle.claim_time_seconds / 60)} minutes to claim your prize.`,
          type: 'raffle_win',
          reference_id: raffle.id,
          reference_type: 'raffle_item',
        }],
      });

      toast.success('Winner drawn and notified!');
      fetchRaffles();
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to draw winner');
    } finally {
      setDrawing(null);
    }
  };

  const markClaimed = async (draw: RaffleDraw, raffleId: string) => {
    await supabase.from('raffle_draws').update({ status: 'claimed', claimed_at: new Date().toISOString() }).eq('id', draw.id);
    await supabase.from('raffle_items').update({ status: 'claimed' }).eq('id', raffleId);
    toast.success('Prize claimed!');
    fetchRaffles();
  };

  const markExpired = async (draw: RaffleDraw) => {
    await supabase.from('raffle_draws').update({ status: 'expired' }).eq('id', draw.id);
    toast.info('Draw expired. You can draw another winner.');
    fetchRaffles();
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-muted text-muted-foreground',
      active: 'bg-primary/10 text-primary',
      drawn: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      claimed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      expired: 'bg-destructive/10 text-destructive',
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Gift className="h-12 w-12 mb-4 opacity-50" />
          <p className="font-medium">No approved events</p>
          <p className="text-sm mt-1">You need an approved & paid event to create raffles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Gift className="h-5 w-5" /> My Raffles
          </h3>
          <p className="text-sm text-muted-foreground">
            Create raffle prizes for attendees at your events.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Event selector */}
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select event..." />
            </SelectTrigger>
            <SelectContent>
              {events.map(e => (
                <SelectItem key={e.event_id} value={e.event_id}>
                  {e.event_title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Raffle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Vendor Raffle Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Prize Name *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Booster Box" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details about the prize..." />
                </div>
                <div className="space-y-2">
                  <Label>Entry Method</Label>
                  <Select value={entryMethod} onValueChange={setEntryMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-enter checked-in attendees</SelectItem>
                      <SelectItem value="opt_in">Attendees must opt-in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Claim Time (seconds)</Label>
                  <Input type="number" value={claimTime} onChange={e => setClaimTime(e.target.value)} min="30" max="600" />
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(parseInt(claimTime || '0') / 60)}m {parseInt(claimTime || '0') % 60}s for the winner to claim
                  </p>
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Raffle Item'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Favorites filter toggle */}
      <Card>
        <CardContent className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">Favorites-only mode</span>
            <Badge variant="secondary" className="text-xs">
              {favoritesCount} fans checked in
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {favoritesOnly ? 'Only fans who favorited you' : 'All checked-in attendees'}
            </span>
            <Switch checked={favoritesOnly} onCheckedChange={setFavoritesOnly} />
          </div>
        </CardContent>
      </Card>

      {raffles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Gift className="h-12 w-12 mb-4 opacity-50" />
            <p>No raffle items yet for this event. Create one to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {raffles.map(raffle => {
            const rafflDraws = draws[raffle.id] || [];
            const latestDraw = rafflDraws.length > 0 ? rafflDraws[rafflDraws.length - 1] : null;

            return (
              <Card key={raffle.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        {raffle.name}
                        {statusBadge(raffle.status)}
                      </CardTitle>
                      {raffle.description && <CardDescription>{raffle.description}</CardDescription>}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {entryCounts[raffle.id] || 0} entries
                      <Clock className="h-4 w-4 ml-2" />
                      {Math.floor(raffle.claim_time_seconds / 60)}m {raffle.claim_time_seconds % 60}s
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{raffle.entry_method === 'auto' ? 'Auto-entry' : 'Opt-in'}</Badge>
                  </div>

                  {latestDraw && latestDraw.status === 'pending' && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-300">
                            Winner: {winnerProfiles[latestDraw.winner_user_id]?.full_name || winnerProfiles[latestDraw.winner_user_id]?.email || 'Loading...'}
                          </p>
                          <RaffleCountdown deadline={latestDraw.claim_deadline} onExpire={() => fetchRaffles()} />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => markClaimed(latestDraw, raffle.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" />Claimed
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => markExpired(latestDraw)}>
                            <XCircle className="h-4 w-4 mr-1" />No Show
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {latestDraw && latestDraw.status === 'claimed' && (
                    <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-3">
                      <p className="text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Claimed by {winnerProfiles[latestDraw.winner_user_id]?.full_name || winnerProfiles[latestDraw.winner_user_id]?.email}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {raffle.status === 'pending' && (
                      <Button size="sm" onClick={() => activateRaffle(raffle)}>
                        Activate Raffle
                      </Button>
                    )}
                    {(raffle.status === 'active' || (raffle.status === 'drawn' && latestDraw?.status === 'expired')) && (
                      <Button size="sm" onClick={() => drawWinner(raffle)} disabled={drawing === raffle.id}>
                        {drawing === raffle.id ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Drawing...</> : <><Shuffle className="h-4 w-4 mr-2" />Draw Winner</>}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
