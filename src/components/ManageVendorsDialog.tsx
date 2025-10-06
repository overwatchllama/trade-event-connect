import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, DollarSign, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VendorApplication {
  id: string;
  event_id: string;
  vendor_id: string;
  user_id: string;
  application_status: 'pending' | 'approved' | 'rejected' | 'waitlist';
  payment_status: 'unpaid' | 'paid' | 'refunded';
  application_date: string;
  approved_date?: string;
  payment_date?: string;
  table_number?: number;
  notes?: string;
  vendor: {
    business_name: string;
    business_email: string;
    business_phone?: string;
    rating: number;
    total_reviews: number;
  };
}

interface ManageVendorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const ManageVendorsDialog = ({ open, onOpenChange, eventId, eventTitle }: ManageVendorsDialogProps) => {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_applications')
        .select(`
          *,
          vendor:vendor_id (
            business_name,
            business_email,
            business_phone,
            rating,
            total_reviews
          )
        `)
        .eq('event_id', eventId);

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching vendor applications:', error);
      toast.error('Failed to load vendor applications');
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: 'approved' | 'rejected' | 'waitlist') => {
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({
          application_status: status,
          approved_date: status === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      toast.success(`Application ${status === 'waitlist' ? 'added to waitlist' : status} successfully`);
      fetchApplications(); // Refresh the list
    } catch (error) {
      console.error('Error updating application status:', error);
      toast.error('Failed to update application status');
    }
  };

  const updatePaymentStatus = async (applicationId: string, status: 'paid' | 'unpaid' | 'refunded') => {
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({
          payment_status: status,
          payment_date: status === 'paid' ? new Date().toISOString() : null
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      toast.success(`Payment status updated to ${status}`);
      fetchApplications(); // Refresh the list
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  useEffect(() => {
    if (open) {
      fetchApplications();
    }
  }, [open, eventId]);

  const getStatusBadge = (status: string, type: 'application' | 'payment') => {
    const baseClasses = "font-medium";
    
    if (type === 'application') {
      switch (status) {
        case 'pending':
          return <Badge variant="secondary" className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>;
        case 'approved':
          return <Badge variant="secondary" className={`${baseClasses} bg-green-100 text-green-800`}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>;
        case 'rejected':
          return <Badge variant="secondary" className={`${baseClasses} bg-red-100 text-red-800`}>
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>;
        case 'waitlist':
          return <Badge variant="secondary" className={`${baseClasses} bg-blue-100 text-blue-800`}>
            <Clock className="w-3 h-3 mr-1" />
            Waitlist
          </Badge>;
        default:
          return <Badge variant="secondary">{status}</Badge>;
      }
    } else {
      switch (status) {
        case 'paid':
          return <Badge variant="secondary" className={`${baseClasses} bg-green-100 text-green-800`}>
            <DollarSign className="w-3 h-3 mr-1" />
            Paid
          </Badge>;
        case 'unpaid':
          return <Badge variant="secondary" className={`${baseClasses} bg-red-100 text-red-800`}>
            <XCircle className="w-3 h-3 mr-1" />
            Unpaid
          </Badge>;
        case 'refunded':
          return <Badge variant="secondary" className={`${baseClasses} bg-blue-100 text-blue-800`}>
            <DollarSign className="w-3 h-3 mr-1" />
            Refunded
          </Badge>;
        default:
          return <Badge variant="secondary">{status}</Badge>;
      }
    }
  };

  const filterApplications = (status: string) => {
    if (status === 'all') return applications;
    return applications.filter(app => app.application_status === status);
  };

  const VendorApplicationCard = ({ application }: { application: VendorApplication }) => (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-semibold">{application.vendor.business_name}</h4>
          </div>
          <p className="text-sm text-muted-foreground">{application.vendor.business_email}</p>
          {application.vendor.business_phone && (
            <p className="text-sm text-muted-foreground">{application.vendor.business_phone}</p>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span>Rating: {application.vendor.rating}/5.0</span>
            <span>({application.vendor.total_reviews} reviews)</span>
          </div>
        </div>
        <div className="text-right space-y-2">
          {getStatusBadge(application.application_status, 'application')}
          {getStatusBadge(application.payment_status, 'payment')}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {application.application_status === 'pending' && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => updateApplicationStatus(application.id, 'approved')}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateApplicationStatus(application.id, 'waitlist')}
            >
              <Clock className="w-3 h-3 mr-1" />
              Waitlist
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateApplicationStatus(application.id, 'rejected')}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </>
        )}
        
        {application.application_status === 'waitlist' && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => updateApplicationStatus(application.id, 'approved')}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateApplicationStatus(application.id, 'rejected')}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </>
        )}
        
        {application.application_status === 'approved' && (
          <Select
            value={application.payment_status}
            onValueChange={(value) => updatePaymentStatus(application.id, value as any)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {application.notes && (
        <div className="text-sm text-muted-foreground">
          <strong>Notes:</strong> {application.notes}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Applied: {new Date(application.application_date).toLocaleDateString()}
        {application.approved_date && (
          <span> • Approved: {new Date(application.approved_date).toLocaleDateString()}</span>
        )}
        {application.payment_date && (
          <span> • Paid: {new Date(application.payment_date).toLocaleDateString()}</span>
        )}
      </div>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Vendors - {eventTitle}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({filterApplications('pending').length})
            </TabsTrigger>
            <TabsTrigger value="waitlist">
              Waitlist ({filterApplications('waitlist').length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({filterApplications('approved').length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({filterApplications('rejected').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading vendor applications...</div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No vendor applications yet
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <VendorApplicationCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {filterApplications('pending').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending applications
              </div>
            ) : (
              <div className="space-y-4">
                {filterApplications('pending').map((application) => (
                  <VendorApplicationCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {filterApplications('approved').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No approved applications
              </div>
            ) : (
              <div className="space-y-4">
                {filterApplications('approved').map((application) => (
                  <VendorApplicationCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="waitlist" className="space-y-4">
            {filterApplications('waitlist').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No waitlisted applications
              </div>
            ) : (
              <div className="space-y-4">
                {filterApplications('waitlist').map((application) => (
                  <VendorApplicationCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {filterApplications('rejected').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rejected applications
              </div>
            ) : (
              <div className="space-y-4">
                {filterApplications('rejected').map((application) => (
                  <VendorApplicationCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ManageVendorsDialog;