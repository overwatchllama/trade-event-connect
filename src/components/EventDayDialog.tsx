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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, User, DollarSign, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VendorApplication {
  id: string;
  vendor_id: string;
  user_id: string;
  payment_status: 'unpaid' | 'paid' | 'refunded';
  table_number?: number;
  approved_tables?: number;
  requested_tables: number;
  checked_in: boolean;
  checked_in_at?: string;
  vendor: {
    id: string;
    business_name: string;
    business_email: string;
    business_phone?: string;
  };
}

interface EventDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const EventDayDialog = ({ open, onOpenChange, eventId, eventTitle }: EventDayDialogProps) => {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_applications')
        .select(`
          *,
          vendor:vendor_id (
            id,
            business_name,
            business_email,
            business_phone
          )
        `)
        .eq('event_id', eventId)
        .eq('application_status', 'approved')
        .in('payment_status', ['paid', 'unpaid']);

      if (error) throw error;

      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      toast.success('Vendor checked in successfully!');
      fetchVendors(); // Refresh the list
    } catch (error) {
      console.error('Error checking in vendor:', error);
      toast.error('Failed to check in vendor');
    }
  };

  const handleUndoCheckIn = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({
          checked_in: false,
          checked_in_at: null
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      toast.success('Check-in undone');
      fetchVendors(); // Refresh the list
    } catch (error) {
      console.error('Error undoing check-in:', error);
      toast.error('Failed to undo check-in');
    }
  };

  useEffect(() => {
    if (open) {
      fetchVendors();
    }
  }, [open, eventId]);

  const filterVendors = (status: 'paid' | 'unpaid' | 'all') => {
    if (status === 'all') return applications;
    return applications.filter(app => app.payment_status === status);
  };

  const paidVendors = filterVendors('paid');
  const unpaidVendors = filterVendors('unpaid');
  const checkedInCount = paidVendors.filter(v => v.checked_in).length;

  const VendorCard = ({ application }: { application: VendorApplication }) => (
    <Card className="p-4">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-lg">{application.vendor.business_name}</span>
          </div>
          
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {application.table_number && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>Table {application.table_number}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{application.approved_tables || application.requested_tables} table(s)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{application.vendor.business_email}</span>
          </div>
          {application.vendor.business_phone && (
            <div className="text-sm text-muted-foreground">
              {application.vendor.business_phone}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {application.payment_status === 'paid' ? (
            <Badge className="bg-green-100 text-green-800">
              <DollarSign className="w-3 h-3 mr-1" />
              Paid
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              <DollarSign className="w-3 h-3 mr-1" />
              Unpaid
            </Badge>
          )}

          {application.checked_in && (
            <Badge className="bg-blue-100 text-blue-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Checked In
            </Badge>
          )}

          {application.payment_status === 'paid' && (
            <div className="mt-2">
              {!application.checked_in ? (
                <Button
                  size="sm"
                  onClick={() => handleCheckIn(application.id)}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Check In
                </Button>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {new Date(application.checked_in_at!).toLocaleTimeString()}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUndoCheckIn(application.id)}
                  >
                    Undo Check-in
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Event Day - {eventTitle}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{paidVendors.length}</div>
            <div className="text-sm text-muted-foreground">Paid Vendors</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{checkedInCount}</div>
            <div className="text-sm text-muted-foreground">Checked In</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{unpaidVendors.length}</div>
            <div className="text-sm text-muted-foreground">Unpaid</div>
          </Card>
        </div>

        <Tabs defaultValue="paid" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              All ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="paid">
              Paid ({paidVendors.length})
            </TabsTrigger>
            <TabsTrigger value="unpaid">
              Unpaid ({unpaidVendors.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {loading ? (
              <div className="text-center py-8">Loading vendors...</div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No approved vendors yet
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <VendorCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="paid" className="space-y-4 mt-4">
            {paidVendors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No paid vendors yet
              </div>
            ) : (
              <div className="space-y-4">
                {paidVendors.map((application) => (
                  <VendorCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="unpaid" className="space-y-4 mt-4">
            {unpaidVendors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No unpaid vendors
              </div>
            ) : (
              <div className="space-y-4">
                {unpaidVendors.map((application) => (
                  <VendorCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EventDayDialog;
