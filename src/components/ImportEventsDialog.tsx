import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, MapPin, CalendarIcon, AlertCircle, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ScrapedEvent {
  title: string;
  date: string;
  city: string;
  state: string;
  venue: string;
  image_url: string | null;
  source_url: string | null;
  description: string | null;
  address: string | null;
  entry_fee: number | null;
}

interface ImportEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

const ImportEventsDialog = ({ open, onOpenChange, onImported }: ImportEventsDialogProps) => {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [events, setEvents] = useState<ScrapedEvent[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [scraped, setScraped] = useState(false);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setEvents([]);
    setSelected(new Set());
    setScraped(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('scrape-events', {
        body: { url: url.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to scrape events');

      if (data.events.length === 0) {
        setError('No events found on this page. Try a different URL or an events listing page.');
      } else {
        setEvents(data.events);
        setSelected(new Set(data.events.map((_: any, i: number) => i)));
        setScraped(true);
      }
    } catch (err: any) {
      console.error('Scrape error:', err);
      setError(err.message || 'Failed to scrape events from this URL');
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === events.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(events.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    if (!user || selected.size === 0) return;

    setImporting(true);
    let successCount = 0;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const organizerName = profile?.full_name || user.email || 'Organizer';

      for (const idx of selected) {
        const event = events[idx];
        
        // Parse date - try to get a reasonable date string
        let dateStr = event.date || new Date().toISOString().split('T')[0];
        // Try to parse common date formats
        try {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            dateStr = parsed.toISOString().split('T')[0];
          }
        } catch {
          // Keep original
        }

        const { error: insertError } = await supabase.from('events').insert({
          title: event.title,
          date: dateStr,
          city: event.city || 'TBD',
          state: event.state || 'TBD',
          venue: event.venue || 'TBD',
          address: event.address || 'TBD',
          zip_code: '',
          event_type: 'card_show',
          organizer_id: user.id,
          organizer_name: organizerName,
          description: event.description || `Imported from: ${event.source_url || url}`,
          entry_fee: event.entry_fee,
          image_url: event.image_url,
          flyer_url: event.image_url,
        });

        if (insertError) {
          console.error('Failed to import event:', event.title, insertError);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} event${successCount > 1 ? 's' : ''}!`);
        onImported?.();
        onOpenChange(false);
        // Reset state
        setUrl('');
        setEvents([]);
        setSelected(new Set());
        setScraped(false);
      } else {
        toast.error('Failed to import events. Please try again.');
      }
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to import events');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Import Events from URL
          </DialogTitle>
          <DialogDescription>
            Paste a URL from an events listing site to discover and import events.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleScrape} className="flex gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.ontreasure.com/events"
            className="flex-1"
            required
          />
          <Button type="submit" disabled={loading || !url.trim()}>
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning...</>
            ) : (
              'Find Events'
            )}
          </Button>
        </form>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {scraped && events.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found <span className="font-semibold text-foreground">{events.length}</span> events
              </p>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selected.size === events.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Badge variant="secondary">
                  {selected.size} selected
                </Badge>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {events.map((event, idx) => (
                <Card
                  key={idx}
                  className={`cursor-pointer transition-colors ${
                    selected.has(idx) ? 'border-primary bg-primary/5' : 'hover:bg-accent/30'
                  }`}
                  onClick={() => toggleEvent(idx)}
                >
                  <CardContent className="p-3 flex items-start gap-3">
                    <Checkbox
                      checked={selected.has(idx)}
                      onCheckedChange={() => toggleEvent(idx)}
                      className="mt-1"
                    />
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {event.date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {event.date}
                          </span>
                        )}
                        {(event.city || event.state) && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[event.city, event.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className="w-full"
            >
              {importing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
              ) : (
                <><Download className="h-4 w-4 mr-2" /> Import {selected.size} Event{selected.size !== 1 ? 's' : ''}</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportEventsDialog;
