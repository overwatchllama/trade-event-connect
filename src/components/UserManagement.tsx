import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Shield, Ban, CheckCircle, MoreHorizontal, Crown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ManageSubscriptionDialog } from './ManageSubscriptionDialog';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: string;
  status: string;
  created_at: string;
  blocked_at: string | null;
  block_reason: string | null;
  user_roles?: { role: string }[];
}

export const UserManagement = () => {
  const { addUserRole, removeUserRole, blockUser, unblockUser } = useAdmin();
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);
          
          return {
            ...profile,
            user_roles: rolesData || []
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // Add the new role
      const { error } = await addUserRole(userId, newRole as any);
      if (error) throw error;

      toast({
        title: "Success",
        description: "User role added successfully"
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error adding role:', error);
      toast({
        title: "Error",
        description: "Failed to add user role",
        variant: "destructive"
      });
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    try {
      const { error } = await removeUserRole(userId, role as any);
      if (error) throw error;

      toast({
        title: "Success",
        description: "User role removed successfully"
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast({
        title: "Error",
        description: "Failed to remove user role",
        variant: "destructive"
      });
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser || !blockReason.trim()) return;

    try {
      const { error } = await blockUser(selectedUser.id, blockReason);
      if (error) throw error;

      toast({
        title: "Success",
        description: "User has been blocked"
      });
      
      setBlockDialogOpen(false);
      setBlockReason('');
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive"
      });
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const { error } = await unblockUser(userId);
      if (error) throw error;

      toast({
        title: "Success",
        description: "User has been unblocked"
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'organizer': return 'default';
      case 'vendor': return 'secondary';
      case 'venue': return 'outline';
      case 'event_pro': return 'default';
      case 'vendor_pro': return 'secondary';
      case 'collector_pro': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'blocked': return 'destructive';
      case 'suspended': return 'secondary';
      default: return 'secondary';
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
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
        
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>
                    {user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <div className="font-medium">{user.full_name || 'Unknown'}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {user.user_roles && user.user_roles.length > 0 ? (
                      user.user_roles.map((ur, idx) => (
                        <Badge 
                          key={idx}
                          variant={getRoleBadgeVariant(ur.role)}
                          className="cursor-pointer hover:opacity-80"
                          onClick={() => handleRemoveRole(user.id, ur.role)}
                        >
                          {ur.role} ×
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary">No roles</Badge>
                    )}
                    <Badge variant={getStatusBadgeVariant(user.status)}>
                      {user.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Select 
                  value="" 
                  onValueChange={(value) => handleRoleChange(user.id, value)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Add role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Add User</SelectItem>
                    <SelectItem value="vendor">Add Vendor</SelectItem>
                    <SelectItem value="organizer">Add Organizer</SelectItem>
                    <SelectItem value="venue">Add Venue</SelectItem>
                    <SelectItem value="event_pro">Add Event Pro</SelectItem>
                    <SelectItem value="vendor_pro">Add Vendor Pro</SelectItem>
                    <SelectItem value="collector_pro">Add Collector Pro</SelectItem>
                    <SelectItem value="admin">Add Admin</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => {
                        setSelectedUser(user);
                        setSubscriptionDialogOpen(true);
                      }}
                    >
                      <Crown className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </DropdownMenuItem>
                    {user.status === 'blocked' ? (
                      <DropdownMenuItem onClick={() => handleUnblockUser(user.id)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Unblock User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedUser(user);
                          setBlockDialogOpen(true);
                        }}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Block User
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {selectedUser && (
        <ManageSubscriptionDialog
          open={subscriptionDialogOpen}
          onOpenChange={(open) => {
            setSubscriptionDialogOpen(open);
            if (!open) {
              fetchUsers(); // Refresh the list when dialog closes
            }
          }}
          userId={selectedUser.id}
          userEmail={selectedUser.email}
        />
      )}

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              Are you sure you want to block {selectedUser?.full_name || selectedUser?.email}? 
              Please provide a reason for blocking this user.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="block-reason">Block Reason</Label>
            <Textarea
              id="block-reason"
              placeholder="Enter reason for blocking..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBlockUser}
              disabled={!blockReason.trim()}
            >
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};