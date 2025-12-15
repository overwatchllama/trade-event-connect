import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Activity, Shield, Ban, CheckCircle, UserCheck } from 'lucide-react';

interface AdminAction {
  id: string;
  action: string;
  details: Database['public']['Tables']['admin_actions']['Row']['details'];
  created_at: string;
  admin: {
    full_name: string;
    email: string;
    avatar_url: string;
  };
  target_user: {
    full_name: string;
    email: string;
    avatar_url: string;
  };
}

export const AdminActions = () => {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');

  const fetchAdminActions = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_actions')
        .select(`
          *,
          admin:profiles!admin_id(full_name, email, avatar_url),
          target_user:profiles!target_user_id(full_name, email, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      console.error('Error fetching admin actions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminActions();
  }, []);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'user_blocked':
        return <Ban className="h-4 w-4" />;
      case 'user_unblocked':
        return <CheckCircle className="h-4 w-4" />;
      case 'role_change':
        return <UserCheck className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'user_blocked':
        return 'destructive';
      case 'user_unblocked':
        return 'default';
      case 'role_change':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatActionText = (action: string, details: Database['public']['Tables']['admin_actions']['Row']['details']) => {
    switch (action) {
      case 'user_blocked':
        return `Blocked user${details?.reason ? ` (${details.reason})` : ''}`;
      case 'user_unblocked':
        return 'Unblocked user';
      case 'role_change':
        return `Changed role to ${details?.new_role || 'unknown'}`;
      default:
        return action.replace('_', ' ');
    }
  };

  const filteredActions = actions.filter(action => {
    const matchesSearch = 
      action.admin?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.admin?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.target_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.target_user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterAction === 'all' || action.action === filterAction;
    
    return matchesSearch && matchesFilter;
  });

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
        <CardTitle>Admin Actions Log</CardTitle>
        <CardDescription>View recent administrative actions and changes</CardDescription>
        
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="role_change">Role Changes</SelectItem>
              <SelectItem value="user_blocked">User Blocks</SelectItem>
              <SelectItem value="user_unblocked">User Unblocks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {filteredActions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No actions found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No admin actions match your current filters.
              </p>
            </div>
          ) : (
            filteredActions.map((action) => (
              <div key={action.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(action.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getActionBadgeVariant(action.action)}>
                      {action.action.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(action.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={action.admin?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {action.admin?.full_name?.split(' ').map(n => n[0]).join('') || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {action.admin?.full_name || 'Unknown Admin'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatActionText(action.action, action.details)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Target:</span>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={action.target_user?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {action.target_user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {action.target_user?.full_name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({action.target_user?.email})
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};