import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VendorRecipient {
  userId: string;
  businessName: string;
}

interface VendorMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: VendorRecipient[];
  eventId: string;
  eventTitle: string;
  groupLabel: string;
}

export const VendorMessageDialog = ({
  open,
  onOpenChange,
  recipients,
  eventId,
  eventTitle,
  groupLabel,
}: VendorMessageDialogProps) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Please enter a title and message');
      return;
    }
    if (recipients.length === 0) {
      toast.error('No recipients to message');
      return;
    }

    setSending(true);
    try {
      const notifications = recipients.map(r => ({
        user_id: r.userId,
        title: title.trim(),
        message: `[${eventTitle}] ${message.trim()}`,
        type: 'organizer_message',
        reference_type: 'event',
      }));

      const { error } = await supabase.rpc('send_event_notifications', {
        p_event_id: eventId,
        p_notifications: notifications,
      });
      if (error) throw error;

      toast.success(`Message sent to ${recipients.length} vendor${recipients.length !== 1 ? 's' : ''}!`);
      setTitle('');
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending messages:', error);
      toast.error('Failed to send messages');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Message {groupLabel}
          </DialogTitle>
          <DialogDescription>
            Send a notification to {recipients.length} vendor{recipients.length !== 1 ? 's' : ''} for "{eventTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Recipients preview */}
          <div className="space-y-2">
            <Label>Recipients</Label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {recipients.map(r => (
                <Badge key={r.userId} variant="secondary" className="text-xs">
                  {r.businessName}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-title">Subject</Label>
            <Input
              id="msg-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Payment Reminder"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-body">Message</Label>
            <Textarea
              id="msg-body"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your message to the vendors..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}>
            {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Send className="h-4 w-4 mr-2" />Send</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
