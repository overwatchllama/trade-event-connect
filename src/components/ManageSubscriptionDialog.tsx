import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from 'lucide-react';

interface ManageSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
}

export const ManageSubscriptionDialog = ({ open, onOpenChange, userId, userEmail }: ManageSubscriptionDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string>('');
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetchCurrentSubscription();
    }
  }, [open, userId]);

  const fetchCurrentSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setCurrentSubscription(data);
      if (data) {
        setSubscriptionTier(data.subscription_tier || '');
        if (data.subscription_end) {
          const date = new Date(data.subscription_end);
          setSubscriptionEnd(date.toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update subscribers table
      const subscriptionData: any = {
        user_id: userId,
        email: userEmail,
        subscription_tier: subscriptionTier || null,
        subscription_end: subscriptionEnd ? new Date(subscriptionEnd).toISOString() : null,
        subscribed: !!(subscriptionTier && subscriptionEnd),
        updated_at: new Date().toISOString(),
      };

      const { error: subError } = await supabase
        .from('subscribers')
        .upsert(subscriptionData, { onConflict: 'email' });

      if (subError) throw subError;

      // Manage subscription roles
      const allSubscriptionRoles: ('event_pro' | 'vendor_pro' | 'collector_pro')[] = ['event_pro', 'vendor_pro', 'collector_pro'];
      
      if (subscriptionTier && allSubscriptionRoles.includes(subscriptionTier as any)) {
        // Grant the subscription role
        const { error: insertRoleError } = await supabase
          .from('user_roles')
          .insert(
            { user_id: userId, role: subscriptionTier as any }
          )
          .select()
          .single();

        // Ignore unique constraint violations (role already exists)
        if (insertRoleError && !insertRoleError.message.includes('duplicate')) {
          throw insertRoleError;
        }

        // Remove other subscription roles
        const otherRoles = allSubscriptionRoles.filter(r => r !== subscriptionTier);
        if (otherRoles.length > 0) {
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .in('role', otherRoles as any);
        }
      } else {
        // No subscription tier - remove all subscription roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .in('role', allSubscriptionRoles as any);
      }

      toast({
        title: "Success",
        description: "Subscription updated successfully"
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickExtend = (days: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    setSubscriptionEnd(newDate.toISOString().split('T')[0]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[500px] w-full">
        <SheetHeader>
          <SheetTitle>Manage Subscription</SheetTitle>
          <SheetDescription>
            Manually manage subscription for {userEmail}
          </SheetDescription>
        </SheetHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tier">Subscription Tier</Label>
            <Select value={subscriptionTier} onValueChange={setSubscriptionTier}>
              <SelectTrigger id="tier">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value="event_pro">Event Pro</SelectItem>
                <SelectItem value="vendor_pro">Vendor Pro</SelectItem>
                <SelectItem value="collector_pro">Collector Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="endDate">Subscription End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={subscriptionEnd}
              onChange={(e) => setSubscriptionEnd(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickExtend(30)}
              >
                +30 days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickExtend(90)}
              >
                +90 days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickExtend(365)}
              >
                +1 year
              </Button>
            </div>
          </div>

          {currentSubscription && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Current Status:</strong> {currentSubscription.subscribed ? 'Active' : 'Inactive'}</p>
              {currentSubscription.subscription_tier && (
                <p><strong>Current Tier:</strong> {currentSubscription.subscription_tier}</p>
              )}
              {currentSubscription.subscription_end && (
                <p><strong>Current End Date:</strong> {new Date(currentSubscription.subscription_end).toLocaleDateString()}</p>
              )}
            </div>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
