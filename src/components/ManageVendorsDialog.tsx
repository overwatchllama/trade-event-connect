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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, DollarSign, User, Star, Calendar, History, Mail, Bell, Upload, ExternalLink, Printer, Ban, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
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
  table_number?: string;
  requested_tables: number;
  approved_tables?: number;
  notes?: string;
  file_url?: string;
  vendor: {
    id: string;
    business_name: string;
    business_email: string;
    business_phone?: string;
    rating: number;
    total_reviews: number;
  };
  total_shows?: number;
  previous_shows_with_organizer?: number;
  event_table_price?: number;
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
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: boolean }>({});

  const fetchApplications = async () => {
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
            business_phone,
            rating,
            total_reviews
          )
        `)
        .eq('event_id', eventId);

      if (error) throw error;

      // Get the organizer ID and table price for this event
      const { data: eventData } = await supabase
        .from('events')
        .select('organizer_id, vendor_table_price')
        .eq('id', eventId)
        .single();

      // Enrich each application with additional stats
      const enrichedApplications = await Promise.all(
        (data || []).map(async (app) => {
          // Get total shows for this vendor (approved applications)
          const { count: totalShows } = await supabase
            .from('vendor_applications')
            .select('*', { count: 'exact', head: true })
            .eq('vendor_id', app.vendor_id)
            .eq('application_status', 'approved');

          // Get previous shows with this organizer
          const { count: previousShows } = await supabase
            .from('vendor_applications')
            .select('event_id, events!inner(organizer_id)', { count: 'exact', head: true })
            .eq('vendor_id', app.vendor_id)
            .eq('application_status', 'approved')
            .eq('events.organizer_id', eventData?.organizer_id)
            .neq('event_id', eventId); // Don't count current event

          return {
            ...app,
            total_shows: totalShows || 0,
            previous_shows_with_organizer: previousShows || 0,
            event_table_price: eventData?.vendor_table_price || 0,
          };
        })
      );

      setApplications(enrichedApplications);
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

  const refundPayment = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({
          payment_status: 'refunded',
          payment_date: null
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Payment refunded successfully');
      fetchApplications();
    } catch (error) {
      console.error('Error refunding payment:', error);
      toast.error('Failed to refund payment');
    }
  };

  const cancelWithRefund = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({
          application_status: 'rejected',
          payment_status: 'refunded',
          payment_date: null,
          notes: 'Cancelled by organizer with refund'
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Vendor cancelled and refunded');
      fetchApplications();
    } catch (error) {
      console.error('Error cancelling with refund:', error);
      toast.error('Failed to cancel vendor');
    }
  };

  const cancelWithoutRefund = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({
          application_status: 'rejected',
          notes: 'Cancelled by organizer without refund'
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Vendor cancelled (no refund)');
      fetchApplications();
    } catch (error) {
      console.error('Error cancelling vendor:', error);
      toast.error('Failed to cancel vendor');
    }
  };

  const printBadge = (application: VendorApplication) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print badges');
      return;
    }

    const tableCount = application.approved_tables || application.requested_tables;
    const tableNumbers = application.table_number || 'TBD';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vendor Badge - ${application.vendor.business_name}</title>
        <style>
          @page { size: 4in 3in; margin: 0; }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            box-sizing: border-box;
          }
          .badge {
            border: 3px solid #333;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            width: 100%;
            max-width: 350px;
          }
          .event-title { font-size: 14px; color: #666; margin-bottom: 8px; }
          .vendor-name { font-size: 24px; font-weight: bold; margin-bottom: 12px; }
          .label { font-size: 12px; color: #888; text-transform: uppercase; margin-top: 12px; }
          .value { font-size: 18px; font-weight: 600; }
          .table-section { margin-top: 16px; padding-top: 16px; border-top: 1px dashed #ccc; }
        </style>
      </head>
      <body>
        <div class="badge">
          <div class="event-title">${eventTitle}</div>
          <div class="vendor-name">${application.vendor.business_name}</div>
          <div class="table-section">
            <div class="label">Table Assignment</div>
            <div class="value">${tableNumbers}</div>
            <div class="label" style="margin-top: 8px;">Tables</div>
            <div class="value">${tableCount}</div>
          </div>
          <div style="margin-top: 16px; font-size: 10px; color: #999;">VENDOR</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const sendInvoice = async (application: VendorApplication) => {
    try {
      const tableCount = application.approved_tables || application.requested_tables;
      const pricePerTable = application.event_table_price || 0;
      const totalAmount = pricePerTable * tableCount;

      // Create an in-app notification for the vendor
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: application.user_id,
          title: 'Invoice from ' + eventTitle,
          message: `You have an invoice for ${tableCount} table${tableCount > 1 ? 's' : ''} at $${pricePerTable} each. Total: $${totalAmount}. Please make payment to secure your spot.`,
          type: 'invoice',
          reference_id: application.id,
          reference_type: 'vendor_application',
        });

      if (error) throw error;
      
      toast.success('Invoice sent to vendor in-app!');
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    }
  };

  const sendEmailInvoice = async (application: VendorApplication) => {
    try {
      const { error } = await supabase.functions.invoke('send-vendor-invoice', {
        body: {
          vendorEmail: application.vendor.business_email,
          vendorName: application.vendor.business_name,
          eventTitle: eventTitle,
          tableCount: application.approved_tables || application.requested_tables,
          pricePerTable: application.event_table_price || 0,
          totalAmount: (application.event_table_price || 0) * (application.approved_tables || application.requested_tables),
          applicationId: application.id,
        }
      });

      if (error) throw error;
      
      toast.success('Invoice email sent successfully!');
    } catch (error) {
      console.error('Error sending invoice email:', error);
      toast.error('Failed to send invoice email');
    }
  };

  const updateApprovedTables = async (applicationId: string, tables: number) => {
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({
          approved_tables: tables
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      toast.success(`Approved ${tables} table${tables > 1 ? 's' : ''}`);
      fetchApplications(); // Refresh the list
    } catch (error) {
      console.error('Error updating approved tables:', error);
      toast.error('Failed to update approved tables');
    }
  };

  const updateTableNumber = async (applicationId: string, tableNumber: string) => {
    try {
      const tableNum = tableNumber.trim() || null;
      
      const { error } = await supabase
        .from('vendor_applications')
        .update({ table_number: tableNum })
        .eq('id', applicationId);

      if (error) throw error;
      
      // Update local state instead of fetching all applications
      setApplications(prev => prev.map(app => 
        app.id === applicationId 
          ? { ...app, table_number: tableNum }
          : app
      ));
      
      toast.success('Table number updated');
    } catch (error) {
      console.error('Error updating table number:', error);
      toast.error('Failed to update table number');
    }
  };

  const updateNotes = async (applicationId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({ notes })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Notes updated successfully');
      fetchApplications();
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
    }
  };

  const handleFileUpload = async (applicationId: string, file: File) => {
    setUploadingFiles(prev => ({ ...prev, [applicationId]: true }));
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}/${applicationId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('event-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-files')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('vendor_applications')
        .update({ file_url: publicUrl })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      toast.success('File uploaded successfully');
      fetchApplications();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [applicationId]: false }));
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
    if (status === 'payment_due') {
      return applications.filter(app => 
        app.application_status === 'approved' && app.payment_status === 'unpaid'
      );
    }
    if (status === 'approved_paid') {
      return applications.filter(app => 
        app.application_status === 'approved' && app.payment_status === 'paid'
      );
    }
    return applications.filter(app => app.application_status === status);
  };

  const VendorApplicationCard = ({ application }: { application: VendorApplication }) => (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <Link 
              to={`/vendor/${application.vendor.id}`}
              className="font-semibold text-primary hover:underline"
            >
              {application.vendor.business_name}
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= application.vendor.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {application.vendor.rating.toFixed(1)} ({application.vendor.total_reviews} reviews)
            </span>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{application.total_shows || 0} total shows</span>
            </div>
            {(application.previous_shows_with_organizer || 0) > 0 && (
              <div className="flex items-center gap-1">
                <History className="w-3 h-3" />
                <span className="font-medium text-primary">
                  {application.previous_shows_with_organizer} shows with you
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Requested Tables:</span>
              <span className="text-primary font-bold">{application.requested_tables}</span>
            </div>
            {application.application_status === 'approved' && application.approved_tables && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Approved Tables:</span>
                <span className="text-green-600 font-bold">{application.approved_tables}</span>
              </div>
            )}
            {application.event_table_price && application.event_table_price > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Invoice Amount:</span>
                <span className="text-lg font-bold text-primary">
                  ${(application.event_table_price * (application.approved_tables || application.requested_tables)).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{application.vendor.business_email}</p>
          {application.vendor.business_phone && (
            <p className="text-sm text-muted-foreground">{application.vendor.business_phone}</p>
          )}
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
              Accept/Invoice
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
              Accept/Invoice
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
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap items-end">
              {application.payment_status === 'unpaid' && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => sendInvoice(application)}
                  >
                    <Bell className="w-3 h-3 mr-1" />
                    Send Invoice
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendEmailInvoice(application)}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Email Invoice
                  </Button>
                </>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Tables</Label>
                <Select
                  value={application.approved_tables?.toString() || application.requested_tables.toString()}
                  onValueChange={(value) => updateApprovedTables(application.id, parseInt(value))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.max(application.requested_tables + 10, 20) }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Table Number</Label>
                <Input
                  type="text"
                  placeholder="e.g., 12, 13, A5"
                  defaultValue={application.table_number || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (application.table_number || '')) {
                      updateTableNumber(application.id, e.target.value);
                    }
                  }}
                  className="flex-1 min-w-[120px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment</Label>
                {application.payment_status === 'paid' ? (
                  <div className="flex gap-2 items-center flex-wrap">
                    <Badge className="bg-green-100 text-green-800">
                      <DollarSign className="w-3 h-3 mr-1" />
                      Paid
                    </Badge>
                  </div>
                ) : (
                  <Select
                    value={application.payment_status}
                    onValueChange={(value) => updatePaymentStatus(application.id, value as Database['public']['Enums']['payment_status'])}
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
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Notes for Vendor (Table Assignment, etc.)</Label>
              <Textarea
                placeholder="e.g., Assigned to Table A12. Please arrive by 8 AM for setup."
                defaultValue={application.notes || ''}
                onBlur={(e) => {
                  if (e.target.value !== (application.notes || '')) {
                    updateNotes(application.id, e.target.value);
                  }
                }}
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-2">
                <Upload className="w-3 h-3" />
                Upload Payment Receipt / Documents
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(application.id, file);
                  }}
                  disabled={uploadingFiles[application.id]}
                  className="flex-1 text-sm"
                />
                {application.file_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(application.file_url, '_blank')}
                    title="View uploaded file"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {uploadingFiles[application.id] && (
                <p className="text-xs text-muted-foreground">Uploading file...</p>
              )}
              {application.file_url && !uploadingFiles[application.id] && (
                <p className="text-xs text-green-600">✓ File uploaded</p>
              )}
            </div>

            {/* Paid Vendor Actions */}
            {application.payment_status === 'paid' && (
              <div className="flex gap-2 flex-wrap pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printBadge(application)}
                >
                  <Printer className="w-3 h-3 mr-1" />
                  Print Badge
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => cancelWithRefund(application.id)}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Cancel with Refund
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => cancelWithoutRefund(application.id)}
                >
                  <Ban className="w-3 h-3 mr-1" />
                  Cancel (No Refund)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {application.notes && application.application_status !== 'approved' && (
        <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
          <strong>Vendor Notes:</strong> {application.notes}
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({filterApplications('pending').length})
            </TabsTrigger>
            <TabsTrigger value="waitlist">
              Waitlist ({filterApplications('waitlist').length})
            </TabsTrigger>
            <TabsTrigger value="payment_due">
              Payment Due ({filterApplications('payment_due').length})
            </TabsTrigger>
            <TabsTrigger value="approved_paid">
              Approved - Paid ({filterApplications('approved_paid').length})
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

          <TabsContent value="payment_due" className="space-y-4">
            {filterApplications('payment_due').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending payments
              </div>
            ) : (
              <div className="space-y-4">
                {filterApplications('payment_due').map((application) => (
                  <VendorApplicationCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved_paid" className="space-y-4">
            {filterApplications('approved_paid').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No paid vendors yet
              </div>
            ) : (
              <div className="space-y-4">
                {filterApplications('approved_paid').map((application) => (
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