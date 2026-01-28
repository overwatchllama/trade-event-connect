import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { VendorApplication } from "./types";

export const useVendorBulkActions = (
  applications: VendorApplication[],
  eventTitle: string,
  onSuccess: () => void
) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const getSelectedApplications = () => {
    return applications.filter(app => selectedIds.has(app.id));
  };

  const bulkUpdateStatus = async (status: 'approved' | 'rejected' | 'waitlist') => {
    if (selectedIds.size === 0) return;
    
    setIsProcessing(true);
    try {
      const updates = Array.from(selectedIds).map(id => ({
        id,
        application_status: status,
        approved_date: status === 'approved' ? new Date().toISOString() : null,
      }));

      // Update each application
      const promises = updates.map(update => 
        supabase
          .from('vendor_applications')
          .update({
            application_status: update.application_status,
            approved_date: update.approved_date,
          })
          .eq('id', update.id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        console.error('Some updates failed:', errors);
        toast.error(`${errors.length} updates failed`);
      }

      const successCount = results.length - errors.length;
      if (successCount > 0) {
        const statusLabel = status === 'waitlist' ? 'added to waitlist' : status;
        toast.success(`${successCount} vendor${successCount > 1 ? 's' : ''} ${statusLabel}`);
      }

      clearSelection();
      onSuccess();
    } catch (error) {
      console.error('Error in bulk update:', error);
      toast.error('Failed to update vendors');
    } finally {
      setIsProcessing(false);
    }
  };

  const bulkSendInvoice = async (viaEmail: boolean = false) => {
    if (selectedIds.size === 0) return;
    
    setIsProcessing(true);
    try {
      const selectedApps = getSelectedApplications().filter(
        app => app.application_status === 'approved' && app.payment_status === 'unpaid'
      );

      if (selectedApps.length === 0) {
        toast.error('No approved/unpaid vendors selected');
        setIsProcessing(false);
        return;
      }

      if (viaEmail) {
        // Send email invoices
        const promises = selectedApps.map(app => 
          supabase.functions.invoke('send-vendor-invoice', {
            body: {
              vendorEmail: app.vendor.business_email,
              vendorName: app.vendor.business_name,
              eventTitle: eventTitle,
              tableCount: app.approved_tables || app.requested_tables,
              pricePerTable: app.event_table_price || 0,
              totalAmount: (app.event_table_price || 0) * (app.approved_tables || app.requested_tables),
              applicationId: app.id,
            }
          })
        );

        const results = await Promise.all(promises);
        const errors = results.filter(r => r.error);
        
        if (errors.length > 0) {
          console.error('Some email sends failed:', errors);
        }

        const successCount = results.length - errors.length;
        toast.success(`${successCount} invoice email${successCount > 1 ? 's' : ''} sent`);
      } else {
        // Send in-app notifications
        const notifications = selectedApps.map(app => {
          const tableCount = app.approved_tables || app.requested_tables;
          const pricePerTable = app.event_table_price || 0;
          const totalAmount = pricePerTable * tableCount;

          return {
            user_id: app.user_id,
            title: 'Invoice from ' + eventTitle,
            message: `You have an invoice for ${tableCount} table${tableCount > 1 ? 's' : ''} at $${pricePerTable} each. Total: $${totalAmount}. Please make payment to secure your spot.`,
            type: 'invoice',
            reference_id: app.id,
            reference_type: 'vendor_application',
          };
        });

        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;
        
        toast.success(`${selectedApps.length} invoice${selectedApps.length > 1 ? 's' : ''} sent`);
      }

      clearSelection();
      onSuccess();
    } catch (error) {
      console.error('Error sending invoices:', error);
      toast.error('Failed to send invoices');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    selectedIds,
    isProcessing,
    toggleSelection,
    selectAll,
    clearSelection,
    getSelectedApplications,
    bulkApprove: () => bulkUpdateStatus('approved'),
    bulkReject: () => bulkUpdateStatus('rejected'),
    bulkWaitlist: () => bulkUpdateStatus('waitlist'),
    bulkSendInvoice: () => bulkSendInvoice(false),
    bulkEmailInvoice: () => bulkSendInvoice(true),
  };
};
