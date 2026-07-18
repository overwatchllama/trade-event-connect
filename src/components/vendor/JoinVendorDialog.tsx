import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useJoinVendor } from '@/hooks/useVendorEmployees';
import { UserPlus } from 'lucide-react';

interface JoinVendorDialogProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const JoinVendorDialog = ({ onSuccess, trigger }: JoinVendorDialogProps) => {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const { joinWithCode, loading } = useJoinVendor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    const success = await joinWithCode(inviteCode.trim());
    if (success) {
      setOpen(false);
      setInviteCode('');
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Join a Vendor Team
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Vendor Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                placeholder="Enter your invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="font-mono text-center tracking-widest"
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground">
                Ask your employer for an invite code to join their team
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !inviteCode.trim()}>
              {loading ? 'Joining...' : 'Join Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinVendorDialog;
