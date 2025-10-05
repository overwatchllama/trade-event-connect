import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send } from 'lucide-react';

const roles = [
  { id: 'user', label: 'Users' },
  { id: 'vendor', label: 'Vendors' },
  { id: 'organizer', label: 'Event Organizers' },
  { id: 'venue', label: 'Venue Owners' },
  { id: 'admin', label: 'Admins' },
];

export const AdminAnnouncements = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(false);

  const handleRoleToggle = (roleId: string) => {
    if (sendToAll) return; // Don't allow role selection if "all" is checked
    
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(r => r !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSendToAllToggle = (checked: boolean) => {
    setSendToAll(checked);
    if (checked) {
      setSelectedRoles([]);
    }
  };

  const handleSendAnnouncement = async () => {
    // Validation
    if (!subject.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a subject',
        variant: 'destructive',
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    if (!sendToAll && selectedRoles.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one role or "Send to All Users"',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-announcement', {
        body: {
          subject: subject.trim(),
          message: message.trim(),
          roles: sendToAll ? ['all'] : selectedRoles,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Announcement sent to ${data.recipientCount} user(s)`,
      });

      // Reset form
      setSubject('');
      setMessage('');
      setSelectedRoles([]);
      setSendToAll(false);
    } catch (error: any) {
      console.error('Error sending announcement:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send announcement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Send Announcement
        </CardTitle>
        <CardDescription>
          Send email announcements to users based on their roles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject *</Label>
          <Input
            id="subject"
            placeholder="Enter email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message *</Label>
          <Textarea
            id="message"
            placeholder="Enter your announcement message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground">
            {message.length} / 5000 characters
          </p>
        </div>

        <div className="space-y-4">
          <Label>Recipients</Label>
          
          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-accent/50">
            <Checkbox
              id="send-to-all"
              checked={sendToAll}
              onCheckedChange={handleSendToAllToggle}
            />
            <Label
              htmlFor="send-to-all"
              className="text-base font-medium cursor-pointer"
            >
              Send to All Users
            </Label>
          </div>

          {!sendToAll && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Or select specific roles:</p>
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={role.id}
                    checked={selectedRoles.includes(role.id)}
                    onCheckedChange={() => handleRoleToggle(role.id)}
                  />
                  <Label
                    htmlFor={role.id}
                    className="text-base cursor-pointer flex-1"
                  >
                    {role.label}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleSendAnnouncement}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            'Sending...'
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Announcement
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
