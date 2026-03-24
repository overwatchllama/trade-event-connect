import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Trophy, Loader2, CheckCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { RaffleCountdown } from './RaffleCountdown';

interface EventRafflesProps {
  eventId: string;
}

interface RaffleItem {
  id: string;
  name: string;
  description: string | null;
  entry_method: string;
  claim_time_seconds: number;
  status: string;
  vendor_id: string | null;
  vendor_name?: string;
}

interface RaffleDraw {
  id: string;
  raffle_item_id: string;
  winner_user_id: string;
  claim_deadline: string;
  status: string;
}

export const EventRaffles = ({ eventId }: EventRafflesProps) => {
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<RaffleItem[]>([]);
  const [draws, setDraws] = useState<Record<string, RaffleDraw[]>>({});
  const [myEntries, setMyEntries] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState<string | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: items } = await supabase
      .from('raffle_items')
      .select('*')
      .eq('event_id', eventId)
      .in('status', ['active', 'drawn', 'claimed'])
      .order('created_at');

    setRaffles(items || []);

    if (items && items.length > 0) {
      const ids = items.map(r => r.id);
      const { data: drawData } = await supabase.from('raffle_draws').select('*').in('raffle_item_id', ids);
      if (drawData) {
        const grouped: Record<string, RaffleDraw[]> = {};
        drawData.forEach(d => {
          if (!grouped[d.raffle_item_id]) grouped[d.raffle_item_id] = [];
          grouped[d.raffle_item_id].push(d);
        });
        setDraws(grouped);
      }
    }

    if (user) {
      // Check if user is checked in
      const { data: tickets } = await supabase
        .from('order_items')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('checked_in', true)
        .limit(1);
      setIsCheckedIn(!!(tickets && tickets.length > 0));

      // Get my entries
      if (items && items.length > 0) {
        const { data: entries } = await supabase
          .from('raffle_entries')
          .select('raffle_item_id')
          .eq('user_id', user.id)
          .in('raffle_item_id', items.map(r => r.id));
        if (entries) {
          setMyEntries(new Set(entries.map(e => e.raffle_item_id)));
        }
      }
    }

    setLoading(false);
  }, [eventId, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Poll for updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const enterRaffle = async (raffleId: string) => {
    if (!user) { toast.error('Please sign in to enter'); return; }
    if (!isCheckedIn) { toast.error('You must be checked in to enter'); return; }
    setEntering(raffleId);
    try {
      const { error } = await supabase.from('raffle_entries').insert({
        raffle_item_id: raffleId,
        user_id: user.id,
      });
      if (error) throw error;
      setMyEntries(prev => new Set([...prev, raffleId]));
      toast.success('You\'re entered!');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to enter raffle');
    } finally { setEntering(null); }
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (raffles.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Raffles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {raffles.map(raffle => {
          const rafflDraws = draws[raffle.id] || [];
          const latestDraw = rafflDraws.length > 0 ? rafflDraws[rafflDraws.length - 1] : null;
          const isMyWin = latestDraw && user && latestDraw.winner_user_id === user.id;
          const hasEntered = myEntries.has(raffle.id);

          return (
            <div key={raffle.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="font-medium">{raffle.name}</span>
                  {raffle.status === 'claimed' && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Claimed</Badge>
                  )}
                </div>
                {raffle.entry_method === 'opt_in' && raffle.status === 'active' && !hasEntered && (
                  <Button size="sm" onClick={() => enterRaffle(raffle.id)} disabled={entering === raffle.id || !isCheckedIn}>
                    {entering === raffle.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enter Raffle'}
                  </Button>
                )}
                {hasEntered && raffle.status === 'active' && (
                  <Badge variant="outline" className="text-primary"><CheckCircle className="h-3 w-3 mr-1" />Entered</Badge>
                )}
              </div>

              {raffle.description && <p className="text-sm text-muted-foreground">{raffle.description}</p>}

              {/* Active draw with countdown */}
              {latestDraw && latestDraw.status === 'pending' && (
                <div className={`rounded-lg p-3 ${isMyWin ? 'bg-primary/10 border-primary border-2' : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'}`}>
                  {isMyWin ? (
                    <div className="text-center space-y-2">
                      <p className="text-lg font-bold text-primary">🎉 YOU WON!</p>
                      <p className="text-sm">Report to the raffle counter now!</p>
                      <RaffleCountdown deadline={latestDraw.claim_deadline} />
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Winner drawn! Waiting for claim...</p>
                      <RaffleCountdown deadline={latestDraw.claim_deadline} />
                    </div>
                  )}
                </div>
              )}

              {raffle.entry_method === 'auto' && raffle.status === 'active' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />All checked-in attendees are automatically entered
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
