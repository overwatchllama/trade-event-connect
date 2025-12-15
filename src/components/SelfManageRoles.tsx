import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type NonProRole = 'vendor' | 'organizer' | 'venue' | 'sponsor';

interface RoleInfo {
  id: NonProRole;
  label: string;
  description: string;
}

const roleDefinitions: RoleInfo[] = [
  {
    id: 'vendor',
    label: "I'm a vendor",
    description: 'Sell trading cards and collectibles at events',
  },
  {
    id: 'organizer',
    label: "I'm an event organizer",
    description: 'Create and manage trading card events',
  },
  {
    id: 'venue',
    label: 'I have a venue',
    description: 'Host events at your location',
  },
  {
    id: 'sponsor',
    label: "I'm an event sponsor",
    description: 'Sponsor events and promote your brand',
  },
];

export const SelfManageRoles = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentRoles, setCurrentRoles] = useState<NonProRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, [user]);

  const fetchRoles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      // Filter to only non-pro roles (exclude 'user' from display)
      const nonProRoles = (data?.map(r => r.role) || []).filter(role =>
        ['vendor', 'organizer', 'venue', 'sponsor'].includes(role)
      ) as NonProRole[];

      setCurrentRoles(nonProRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load roles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (role: NonProRole, isChecked: boolean) => {
    if (!user) return;

    try {
      if (isChecked) {
        // Add role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role });

        if (error) {
          if (error.message.includes('duplicate')) {
            return; // Already has role, no need to show error
          }
          throw error;
        }

        toast({
          title: 'Role Added',
          description: `${roleDefinitions.find(r => r.id === role)?.label}`,
        });
      } else {
        // Remove role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('role', role);

        if (error) throw error;

        toast({
          title: 'Role Removed',
          description: `Removed: ${roleDefinitions.find(r => r.id === role)?.label}`,
        });
      }

      await fetchRoles();
    } catch (error: unknown) {
      console.error('Error toggling role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive',
      });
      // Revert checkbox state
      await fetchRoles();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Roles</CardTitle>
        <CardDescription>
          Select the roles that apply to you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {roleDefinitions.map((role) => {
          const isChecked = currentRoles.includes(role.id);
          return (
            <div key={role.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
              <Checkbox
                id={role.id}
                checked={isChecked}
                onCheckedChange={(checked) => handleToggleRole(role.id, checked as boolean)}
                disabled={loading}
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={role.id}
                  className="text-base font-medium cursor-pointer"
                >
                  {role.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {role.description}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
