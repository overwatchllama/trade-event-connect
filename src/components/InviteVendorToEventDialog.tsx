import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, MapPin, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Event {
  id: string;
  title: string;
  date: string;
  city: string;
  state: string;
}

interface Vendor {
  id: string;
  business_name: string;
  user_id: string;
}

interface InviteVendorToEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: Vendor[];
  preSelectedVendor?: Vendor | null;
}

export const InviteVendorToEventDialog = ({
  open,
  onOpenChange,
  vendors,
  preSelectedVendor
}: InviteVendorToEventDialogProps) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingEvents, setFetchingEvents] = useState(true);

  useEffect(() => {
    if (open && user) {
      fetchMyEvents();
      if (preSelectedVendor) {
        setSelectedVendors([preSelectedVendor]);
      }
    }
  }, [open, user, preSelectedVendor]);

  const fetchMyEvents = async () => {
    if (!user) return;
    
    setFetchingEvents(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, city, state')
        .eq('organizer_id', user.id)
        .gte('date', today)
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load your events');
    } finally {
      setFetchingEvents(false);
    }
  };

  const handleAddVendor = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor && !selectedVendors.find(v => v.id === vendorId)) {
      setSelectedVendors([...selectedVendors, vendor]);
    }
  };

  const handleRemoveVendor = (vendorId: string) => {
    setSelectedVendors(selectedVendors.filter(v => v.id !== vendorId));
  };

  const handleSendInvitations = async () => {
    if (!selectedEventId) {
      toast.error('Please select an event');
      return;
    }
    if (selectedVendors.length === 0) {
      toast.error('Please select at least one vendor');
      return;
    }

    setLoading(true);
    try {
      const selectedEvent = events.find(e => e.id === selectedEventId);
      if (!selectedEvent) throw new Error('Event not found');

      // Create notifications for each vendor
      const notifications = selectedVendors.map(vendor => ({
        user_id: vendor.user_id,
        title: 'Event Invitation',
        message: message 
          ? `You've been invited to "${selectedEvent.title}" on ${selectedEvent.date} in ${selectedEvent.city}, ${selectedEvent.state}. Message from organizer: ${message}`
          : `You've been invited to participate as a vendor at "${selectedEvent.title}" on ${selectedEvent.date} in ${selectedEvent.city}, ${selectedEvent.state}. Check out the event details and apply if interested!`,
        type: 'event_invitation',
        reference_id: selectedEventId,
        reference_type: 'event'
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      toast.success(`Invitation${selectedVendors.length > 1 ? 's' : ''} sent to ${selectedVendors.length} vendor${selectedVendors.length > 1 ? 's' : ''}!`);
      onOpenChange(false);
      setSelectedVendors([]);
      setSelectedEventId('');
      setMessage('');
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast.error('Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  const availableVendors = vendors.filter(v => !selectedVendors.find(sv => sv.id === v.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Vendors to Event</DialogTitle>
          <DialogDescription>
            Send event invitations to selected vendors. They will receive a notification about your event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Select Event */}
          <div className="space-y-2">
            <Label>Select Event</Label>
            {fetchingEvents ? (
              <div className="text-sm text-muted-foreground">Loading your events...</div>
            ) : events.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                You don't have any upcoming events. Create an event first to invite vendors.
              </div>
            ) : (
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{event.title}</span>
                        <span className="text-muted-foreground text-xs">
                          ({event.date})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Vendors */}
          <div className="space-y-2">
            <Label>Selected Vendors ({selectedVendors.length})</Label>
            {selectedVendors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedVendors.map(vendor => (
                  <Badge key={vendor.id} variant="secondary" className="gap-1 pr-1">
                    {vendor.business_name}
                    <button
                      onClick={() => handleRemoveVendor(vendor.id)}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No vendors selected</div>
            )}
          </div>

          {/* Add More Vendors */}
          {availableVendors.length > 0 && (
            <div className="space-y-2">
              <Label>Add Vendors</Label>
              <Select onValueChange={handleAddVendor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor to add" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {availableVendors.map(vendor => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.business_name}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Message */}
          <div className="space-y-2">
            <Label>Custom Message (Optional)</Label>
            <Textarea
              placeholder="Add a personal message to your invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendInvitations} 
            disabled={loading || !selectedEventId || selectedVendors.length === 0}
          >
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Sending...' : `Send Invitation${selectedVendors.length > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
