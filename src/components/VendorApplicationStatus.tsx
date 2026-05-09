import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { DollarSign, XCircle, RotateCcw, Clock, AlertTriangle, CheckCircle, CreditCard, Eye, EyeOff } from "lucide-react";

interface VendorApplication {
  id: string;
  event_id: string;
  vendor_id: string;
  application_status: "pending" | "approved" | "rejected" | "waitlist";
  payment_status: "unpaid" | "paid" | "refunded";
  application_date: string;
  requested_tables: number;
  approved_tables: number | null;
  table_number: string | null;
  notes: string | null;
  vendor_request: string | null;
  vendor_request_at: string | null;
  vendor_request_reason: string | null;
  hide_from_calendar: boolean | null;
}

interface VendorApplicationStatusProps {
  eventId: string;
  eventTitle: string;
  vendorTablePrice?: number | null;
}

export const VendorApplicationStatus = ({ eventId, eventTitle, vendorTablePrice }: VendorApplicationStatusProps) => {
  const { user } = useAuth();
  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionReason, setActionReason] = useState("");
  const [actionType, setActionType] = useState<"withdraw" | "cancel" | "refund" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [user, eventId]);

  const fetchApplication = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // First get the vendor profile
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!vendorData) {
        setApplication(null);
        setLoading(false);
        return;
      }

      // Get the application for this event
      const { data, error } = await supabase
        .from("vendor_applications")
        .select(`
          id,
          event_id,
          vendor_id,
          application_status,
          payment_status,
          application_date,
          requested_tables,
          approved_tables,
          table_number,
          notes,
          vendor_request,
          vendor_request_at,
          vendor_request_reason,
          hide_from_calendar
        `)
        .eq("vendor_id", vendorData.id)
        .eq("event_id", eventId)
        .maybeSingle();

      if (error) throw error;
      setApplication(data);
    } catch (error) {
      console.error("Error fetching application:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!application || !actionType) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("vendor_applications")
        .update({
          vendor_request: actionType === "withdraw" ? "withdrawn" : actionType === "cancel" ? "cancellation_requested" : "refund_requested",
          vendor_request_at: new Date().toISOString(),
          vendor_request_reason: actionReason || null,
        })
        .eq("id", application.id);

      if (error) throw error;

      const actionLabels = {
        withdraw: "withdrawn",
        cancel: "cancellation request submitted",
        refund: "refund request submitted",
      };

      toast.success(`Application ${actionLabels[actionType]}`);
      fetchApplication();
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to process your request");
    } finally {
      setProcessing(false);
      setActionType(null);
      setActionReason("");
    }
  };

  const toggleCalendarVisibility = async () => {
    if (!application) return;

    setProcessing(true);
    try {
      const newValue = !application.hide_from_calendar;
      const { error } = await supabase
        .from("vendor_applications")
        .update({ hide_from_calendar: newValue })
        .eq("id", application.id);

      if (error) throw error;

      toast.success(newValue ? "Event hidden from your calendar" : "Event visible on your calendar");
      fetchApplication();
    } catch (error) {
      console.error("Error toggling calendar visibility:", error);
      toast.error("Failed to update calendar visibility");
    } finally {
      setProcessing(false);
    }
  };

  const canCancelPaid = () => {
    return (
      application &&
      !application.vendor_request &&
      application.application_status === "approved" &&
      application.payment_status === "paid"
    );
  };

  const handlePayInvoice = async () => {
    if (!application) return;

    setPaymentProcessing(true);
    try {
      // SECURITY: fee + table count are derived server-side from the application/event.
      const { data, error } = await supabase.functions.invoke('vendor-registration-payment', {
        body: {
          eventId: eventId,
          eventTitle: eventTitle,
          applicationId: application.id,
        }
      });

      if (error) throw error;

      if (data.isPro) {
        toast.success('Table booked successfully! Pro subscription waives the fee.');
        fetchApplication();
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const getStatusBadge = () => {
    if (!application) return null;

    if (application.vendor_request === "withdrawn") {
      return <Badge variant="outline" className="bg-muted">Withdrawn</Badge>;
    }
    if (application.vendor_request === "cancellation_requested") {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Cancellation Requested</Badge>;
    }
    if (application.vendor_request === "refund_requested") {
      return <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Refund Requested</Badge>;
    }

    switch (application.application_status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "waitlist":
        return <Badge variant="secondary">Waitlist</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getPaymentBadge = () => {
    if (!application) return null;

    switch (application.payment_status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><DollarSign className="w-3 h-3 mr-1" />Paid</Badge>;
      case "refunded":
        return <Badge variant="outline"><RotateCcw className="w-3 h-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Unpaid</Badge>;
    }
  };

  const canWithdraw = () => {
    return (
      application &&
      !application.vendor_request &&
      (application.application_status === "pending" || application.application_status === "waitlist")
    );
  };

  const canRequestCancellation = () => {
    return (
      application &&
      !application.vendor_request &&
      application.application_status === "approved" &&
      application.payment_status === "unpaid"
    );
  };

  const canRequestRefund = () => {
    return (
      application &&
      !application.vendor_request &&
      application.application_status === "approved" &&
      application.payment_status === "paid"
    );
  };

  const canPayInvoice = () => {
    return (
      application &&
      !application.vendor_request &&
      application.application_status === "approved" &&
      application.payment_status === "unpaid"
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Application</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!application) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Your Vendor Application
          <div className="flex gap-2">
            {getStatusBadge()}
            {application.application_status === "approved" && getPaymentBadge()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Tables Requested:</span>
            <span className="ml-2 font-medium">{application.requested_tables}</span>
          </div>
          {application.approved_tables && (
            <div>
              <span className="text-muted-foreground">Tables Approved:</span>
              <span className="ml-2 font-medium">{application.approved_tables}</span>
            </div>
          )}
          {application.table_number && (
            <div>
              <span className="text-muted-foreground">Table #:</span>
              <span className="ml-2 font-medium">{application.table_number}</span>
            </div>
          )}
          {vendorTablePrice && (
            <div>
              <span className="text-muted-foreground">Price per Table:</span>
              <span className="ml-2 font-medium">${vendorTablePrice}</span>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Applied: {format(new Date(application.application_date), "MMM d, yyyy")}
        </div>

        {application.notes && (
          <div className="p-3 bg-muted rounded-md text-sm">
            <strong>Organizer Notes:</strong> {application.notes}
          </div>
        )}

        {application.vendor_request_reason && (
          <div className="p-3 bg-muted rounded-md text-sm">
            <strong>Your Reason:</strong> {application.vendor_request_reason}
          </div>
        )}

        {/* Payment Button */}
        {canPayInvoice() && (() => {
          const tableCount = application.approved_tables || application.requested_tables;
          const tableFee = (vendorTablePrice || 0) * tableCount;
          const platformFee = 5;
          const total = tableFee + platformFee;
          
          return (
            <div className="space-y-2">
              <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor Table Fee ({tableCount} table{tableCount > 1 ? 's' : ''}):</span>
                  <span className="font-medium">${tableFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Service Fee:</span>
                  <span className="font-medium">${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">${total.toFixed(2)}</span>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={handlePayInvoice}
                disabled={paymentProcessing}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {paymentProcessing ? "Processing..." : `Pay Invoice ($${total.toFixed(2)})`}
              </Button>
            </div>
          );
        })()}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {canWithdraw() && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionType("withdraw")}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will withdraw your vendor application for "{eventTitle}". You can reapply later if spots are available.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Reason for withdrawal (optional)"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="mt-2"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => {
                    setActionType(null);
                    setActionReason("");
                  }}>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleAction}
                    disabled={processing}
                  >
                    {processing ? "Processing..." : "Withdraw Application"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canRequestCancellation() && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionType("cancel")}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Request Cancellation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Request Cancellation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send a cancellation request to the event organizer. They will review and respond to your request.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Reason for cancellation (recommended)"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="mt-2"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => {
                    setActionType(null);
                    setActionReason("");
                  }}>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleAction}
                    disabled={processing}
                  >
                    {processing ? "Processing..." : "Submit Request"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canRequestRefund() && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionType("refund")}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Request Refund
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Request Refund?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send a refund request to the event organizer. Refunds are subject to the organizer's refund policy.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Reason for refund (recommended)"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="mt-2"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => {
                    setActionType(null);
                    setActionReason("");
                  }}>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleAction}
                    disabled={processing}
                  >
                    {processing ? "Processing..." : "Submit Request"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Paid Vendor Actions */}
          {canCancelPaid() && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActionType("cancel")}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Attendance
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Your Attendance?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will notify the event organizer that you wish to cancel. Your payment will remain until you request a refund separately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Reason for cancellation (recommended)"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="mt-2"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {
                      setActionType(null);
                      setActionReason("");
                    }}>Keep Attending</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleAction}
                      disabled={processing}
                    >
                      {processing ? "Processing..." : "Cancel Attendance"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleCalendarVisibility}
                disabled={processing}
              >
                {application?.hide_from_calendar ? (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show on Calendar
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide from Calendar
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
