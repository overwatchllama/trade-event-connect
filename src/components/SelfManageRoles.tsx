import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserPlus, UserMinus, Building, Calendar, MapPin, User } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type NonProRole = 'user' | 'vendor' | 'organizer' | 'venue';

interface RoleInfo {
  id: NonProRole;
  label: string;
  description: string;
  icon: React.ElementType;
}

const roleDefinitions: RoleInfo[] = [
  {
    id: 'user',
    label: 'User',
    description: 'Basic user access',
    icon: User,
  },
  {
    id: 'vendor',
    label: 'Vendor',
    description: 'Sell trading cards and collectibles',
    icon: Building,
  },
  {
    id: 'organizer',
    label: 'Event Organizer',
    description: 'Create and manage events',
    icon: Calendar,
  },
  {
    id: 'venue',
    label: 'Venue',
    description: 'Host events at your location',
    icon: MapPin,
  },
];

export const SelfManageRoles = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentRoles, setCurrentRoles] = useState<NonProRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ role: NonProRole; action: 'add' | 'remove' } | null>(null);

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

      // Filter to only non-pro roles
      const nonProRoles = (data?.map(r => r.role) || []).filter(role =>
        ['user', 'vendor', 'organizer', 'venue'].includes(role)
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

  const handleAddRole = async (role: NonProRole) => {
    if (!user) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role });

      if (error) throw error;

      toast({
        title: 'Role Added',
        description: `${roleDefinitions.find(r => r.id === role)?.label} role has been added`,
      });

      await fetchRoles();
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast({
        title: 'Error',
        description: error.message.includes('duplicate') 
          ? 'You already have this role'
          : 'Failed to add role',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
      setDialogOpen(false);
      setPendingAction(null);
    }
  };

  const handleRemoveRole = async (role: NonProRole) => {
    if (!user) return;

    // Prevent removing the user role if it's the only role
    if (role === 'user' && currentRoles.length === 1) {
      toast({
        title: 'Cannot Remove',
        description: 'You must have at least one role',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id)
        .eq('role', role);

      if (error) throw error;

      toast({
        title: 'Role Removed',
        description: `${roleDefinitions.find(r => r.id === role)?.label} role has been removed`,
      });

      await fetchRoles();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove role',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
      setDialogOpen(false);
      setPendingAction(null);
    }
  };

  const confirmAction = (role: NonProRole, action: 'add' | 'remove') => {
    setPendingAction({ role, action });
    setDialogOpen(true);
  };

  const executeAction = () => {
    if (!pendingAction) return;
    
    if (pendingAction.action === 'add') {
      handleAddRole(pendingAction.role);
    } else {
      handleRemoveRole(pendingAction.role);
    }
  };

  const getRoleInfo = (roleId: NonProRole) => roleDefinitions.find(r => r.id === roleId);

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
    <>
      <Card>
        <CardHeader>
          <CardTitle>My Roles</CardTitle>
          <CardDescription>
            Manage your account roles. You can add or remove basic roles anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Roles */}
          <div>
            <h3 className="text-sm font-medium mb-3">Current Roles</h3>
            <div className="flex flex-wrap gap-2">
              {currentRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles assigned</p>
              ) : (
                currentRoles.map((role) => {
                  const roleInfo = getRoleInfo(role);
                  const Icon = roleInfo?.icon || User;
                  return (
                    <Badge key={role} variant="default" className="px-3 py-1.5 gap-2">
                      <Icon className="h-3 w-3" />
                      {roleInfo?.label || role}
                      {(role !== 'user' || currentRoles.length > 1) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                          onClick={() => confirmAction(role, 'remove')}
                          disabled={actionLoading}
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      )}
                    </Badge>
                  );
                })
              )}
            </div>
          </div>

          {/* Available Roles to Add */}
          <div>
            <h3 className="text-sm font-medium mb-3">Add Roles</h3>
            <div className="grid gap-3">
              {roleDefinitions
                .filter(role => !currentRoles.includes(role.id))
                .map((role) => {
                  const Icon = role.icon;
                  return (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{role.label}</p>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmAction(role.id, 'add')}
                        disabled={actionLoading}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  );
                })}
              {roleDefinitions.filter(role => !currentRoles.includes(role.id)).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  You have all available roles
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === 'add' ? 'Add Role' : 'Remove Role'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === 'add' ? (
                <>
                  Are you sure you want to add the <strong>{getRoleInfo(pendingAction.role)?.label}</strong> role?
                  This will grant you access to {getRoleInfo(pendingAction.role)?.description.toLowerCase()}.
                </>
              ) : (
                <>
                  Are you sure you want to remove the <strong>{getRoleInfo(pendingAction?.role!)?.label}</strong> role?
                  You may lose access to certain features.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} disabled={actionLoading}>
              {actionLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
