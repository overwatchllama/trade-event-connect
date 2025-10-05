import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, X, Clock, FileText } from 'lucide-react';

interface RoleRequest {
  id: string;
  user_id: string;
  requested_role: string;
  reason: string;
  status: string;
  created_at: string;
  admin_notes: string | null;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string;
  } | null;
}

export const RoleRequests = () => {
  const { approveRoleRequest, addUserRole } = useAdmin();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RoleRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  const fetchRoleRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('role_requests')
        .select(`
          *,
          profiles(full_name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to handle potential null profiles
      const transformedData = (data || []).map(request => ({
        ...request,
        profiles: request.profiles && typeof request.profiles === 'object' && !('error' in (request.profiles as any)) 
          ? request.profiles 
          : null
      }));
      
      setRequests(transformedData as RoleRequest[]);
    } catch (error) {
      console.error('Error fetching role requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch role requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoleRequests();
  }, []);

  const handleRequest = async (approve: boolean) => {
    if (!selectedRequest) return;

    try {
      // First approve/reject the request
      const { error: requestError } = await approveRoleRequest(
        selectedRequest.id,
        approve,
        adminNotes
      );
      
      if (requestError) throw requestError;

      // If approved, also add the role to the user
      if (approve) {
        const { error: roleError } = await addUserRole(
          selectedRequest.user_id,
          selectedRequest.requested_role as any
        );
        
        if (roleError) throw roleError;
      }

      toast({
        title: "Success",
        description: `Role request ${approve ? 'approved' : 'rejected'} successfully`
      });
      
      setDialogOpen(false);
      setAdminNotes('');
      setSelectedRequest(null);
      fetchRoleRequests();
    } catch (error) {
      console.error('Error handling request:', error);
      toast({
        title: "Error",
        description: `Failed to ${approve ? 'approve' : 'reject'} role request`,
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'organizer': return 'default';
      case 'vendor': return 'secondary';
      case 'venue': return 'outline';
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
        <CardTitle>Role Requests</CardTitle>
        <CardDescription>Review and approve role change requests from users</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No role requests</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                All caught up! No pending role requests to review.
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-medium">
                      {request.profiles?.full_name || 'Unknown User'}
                    </div>
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    {request.profiles?.email}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">Requesting role:</span>
                    <Badge variant={getRoleBadgeVariant(request.requested_role)}>
                      {request.requested_role}
                    </Badge>
                  </div>
                  
                  {request.reason && (
                    <div className="text-sm">
                      <span className="font-medium">Reason:</span> {request.reason}
                    </div>
                  )}
                  
                  {request.admin_notes && (
                    <div className="text-sm mt-2 p-2 bg-muted rounded">
                      <span className="font-medium">Admin Notes:</span> {request.admin_notes}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    Submitted {new Date(request.created_at).toLocaleDateString()}
                  </div>
                </div>

                {request.status === 'pending' && (
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setActionType('approve');
                        setDialogOpen(true);
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedRequest(request);
                        setActionType('reject');
                        setDialogOpen(true);
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Role Request
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? `Approve ${selectedRequest?.profiles?.full_name}'s request for ${selectedRequest?.requested_role} role?`
                : `Reject ${selectedRequest?.profiles?.full_name}'s request for ${selectedRequest?.requested_role} role?`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
            <Textarea
              id="admin-notes"
              placeholder="Add notes for this decision..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={() => handleRequest(actionType === 'approve')}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};