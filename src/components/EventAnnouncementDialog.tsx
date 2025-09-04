import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EventAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const EventAnnouncementDialog = ({ open, onOpenChange, eventId, eventTitle }: EventAnnouncementDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: 'both' as 'vendors' | 'attendees' | 'both'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to send announcements');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-announcement', {
        body: {
          eventId,
          title: formData.title,
          message: formData.message,
          targetAudience: formData.targetAudience
        }
      });

      if (error) throw error;

      toast.success(data.message || 'Announcement sent successfully!');
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: '',
        message: '',
        targetAudience: 'both'
      });

    } catch (error) {
      console.error('Error sending announcement:', error);
      toast.error('Failed to send announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Send Announcement
          </DialogTitle>
          <DialogDescription>
            Send an announcement to vendors and/or attendees for "{eventTitle}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Announcement Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Announcement Title</Label>
              <Input
                id="title"
                placeholder="e.g., Important Update: Event Schedule Changed"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your announcement message here..."
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                rows={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Send To</Label>
              <Select 
                value={formData.targetAudience} 
                onValueChange={(value) => handleInputChange('targetAudience', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendors">Vendors Only</SelectItem>
                  <SelectItem value="attendees">Attendees Only</SelectItem>
                  <SelectItem value="both">Both Vendors & Attendees</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-muted p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Preview:</h4>
            <div className="space-y-2 text-sm">
              <div><strong>{eventTitle}</strong></div>
              <div><strong>{formData.title || 'Announcement Title'}</strong></div>
              <div className="text-muted-foreground">
                {formData.message || 'Your announcement message will appear here...'}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Send className="w-4 h-4" />
              {loading ? 'Sending...' : 'Send Announcement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventAnnouncementDialog;