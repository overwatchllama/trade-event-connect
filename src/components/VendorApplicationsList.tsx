import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Calendar, MapPin, DollarSign, XCircle, RotateCcw, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  event: {
    id: string;
    title: string;
    date: string;
    venue: string;
    city: string;
    state: string;
    vendor_table_price: number | null;
  };
}

export const VendorApplicationsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionReason, setActionReason] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<VendorApplication | null>(null);
  const [actionType, setActionType] = useState<"withdraw" | "cancel" | "refund" | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;

    try {
      // First get the vendor profile
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!vendorData) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // Get all applications for this vendor
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
          vendor_request_reason
        `)
        .eq("vendor_id", vendorData.id)
        .order("application_date", { ascending: false });

      if (error) throw error;

      // Fetch event details for each application
      const eventIds = data?.map((app) => app.event_id) || [];
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, title, date, venue, city, state, vendor_table_price")
        .in("id", eventIds);

      if (eventsError) throw eventsError;

      // Merge event data with applications
      const applicationsWithEvents = data?.map((app) => ({
        ...app,
        event: eventsData?.find((e) => e.id === app.event_id) || {
          id: app.event_id,
          title: "Unknown Event",
          date: "",
          venue: "",
          city: "",
          state: "",
          vendor_table_price: null,
        },
      })) as VendorApplication[];

      setApplications(applicationsWithEvents || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to load your applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedApplication || !actionType) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("vendor_applications")
        .update({
          vendor_request: actionType === "withdraw" ? "withdrawn" : actionType === "cancel" ? "cancellation_requested" : "refund_requested",
          vendor_request_at: new Date().toISOString(),
          vendor_request_reason: actionReason || null,
        })
        .eq("id", selectedApplication.id);

      if (error) throw error;

      const actionLabels = {
        withdraw: "withdrawn",
        cancel: "cancellation request submitted",
        refund: "refund request submitted",
      };

      toast({
        title: "Success",
        description: `Application ${actionLabels[actionType]}`,
      });

      // Refresh the list
      fetchApplications();
    } catch (error) {
      console.error("Error updating application:", error);
      toast({
        title: "Error",
        description: "Failed to process your request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setSelectedApplication(null);
      setActionType(null);
      setActionReason("");
    }
  };

  const getStatusBadge = (app: VendorApplication) => {
    // Check if there's a pending vendor request
    if (app.vendor_request === "withdrawn") {
      return <Badge variant="outline" className="bg-muted">Withdrawn</Badge>;
    }
    if (app.vendor_request === "cancellation_requested") {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Cancellation Requested</Badge>;
    }
    if (app.vendor_request === "refund_requested") {
      return <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Refund Requested</Badge>;
    }

    // Regular status badges
    switch (app.application_status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "waitlist":
        return <Badge variant="secondary">Waitlist</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getPaymentBadge = (app: VendorApplication) => {
    switch (app.payment_status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><DollarSign className="w-3 h-3 mr-1" />Paid</Badge>;
      case "refunded":
        return <Badge variant="outline"><RotateCcw className="w-3 h-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Unpaid</Badge>;
    }
  };

  const canWithdraw = (app: VendorApplication) => {
    return (
      !app.vendor_request &&
      (app.application_status === "pending" || app.application_status === "waitlist")
    );
  };

  const canRequestCancellation = (app: VendorApplication) => {
    return (
      !app.vendor_request &&
      app.application_status === "approved" &&
      app.payment_status === "unpaid"
    );
  };

  const canRequestRefund = (app: VendorApplication) => {
    return (
      !app.vendor_request &&
      app.application_status === "approved" &&
      app.payment_status === "paid"
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Vendor Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Vendor Applications</CardTitle>
          <CardDescription>Track and manage your event vendor applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>You haven't applied to any events yet.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate("/events")}
            >
              Browse Events
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>My Vendor Applications</CardTitle>
          <CardDescription>
            Track and manage your event vendor applications ({applications.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id} className="border">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 
                        className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/event/${app.event_id}`)}
                      >
                        {app.event.title}
                      </h3>
                      <div className="flex gap-2 flex-shrink-0">
                        {getStatusBadge(app)}
                        {app.application_status === "approved" && getPaymentBadge(app)}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {app.event.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {app.event.venue}, {app.event.city}, {app.event.state}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <span>
                        <strong>Tables Requested:</strong> {app.requested_tables}
                      </span>
                      {app.approved_tables && (
                        <span>
                          <strong>Tables Approved:</strong> {app.approved_tables}
                        </span>
                      )}
                      {app.table_number && (
                        <span>
                          <strong>Table #:</strong> {app.table_number}
                        </span>
                      )}
                      {app.event.vendor_table_price && (
                        <span>
                          <strong>Price per Table:</strong> ${app.event.vendor_table_price}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Applied: {format(new Date(app.application_date), "MMM d, yyyy")}
                    </div>

                    {app.vendor_request_reason && (
                      <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                        <strong>Your reason:</strong> {app.vendor_request_reason}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[160px]">
                    {canWithdraw(app) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(app);
                              setActionType("withdraw");
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Withdraw
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will withdraw your vendor application for "{app.event.title}". You can reapply later if spots are available.
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
                              setSelectedApplication(null);
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

                    {canRequestCancellation(app) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(app);
                              setActionType("cancel");
                            }}
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Request Cancellation
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Request Cancellation?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will send a cancellation request to the event organizer for "{app.event.title}". They will review and respond to your request.
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
                              setSelectedApplication(null);
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

                    {canRequestRefund(app) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(app);
                              setActionType("refund");
                            }}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Request Refund
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Request Refund?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will send a refund request to the event organizer for "{app.event.title}". Refunds are subject to the organizer's refund policy.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <Textarea
                            placeholder="Reason for refund request (required)"
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            className="mt-2"
                          />
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => {
                              setSelectedApplication(null);
                              setActionType(null);
                              setActionReason("");
                            }}>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleAction}
                              disabled={processing || !actionReason.trim()}
                            >
                              {processing ? "Processing..." : "Submit Refund Request"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {app.vendor_request && (
                      <div className="text-xs text-muted-foreground text-center">
                        {app.vendor_request === "withdrawn" && (
                          <span className="flex items-center gap-1 justify-center">
                            <CheckCircle className="w-3 h-3" /> Withdrawn
                          </span>
                        )}
                        {app.vendor_request === "cancellation_requested" && (
                          <span className="flex items-center gap-1 justify-center">
                            <Clock className="w-3 h-3" /> Awaiting Response
                          </span>
                        )}
                        {app.vendor_request === "refund_requested" && (
                          <span className="flex items-center gap-1 justify-center">
                            <Clock className="w-3 h-3" /> Awaiting Response
                          </span>
                        )}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/event/${app.event_id}`)}
                    >
                      View Event
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </>
  );
};
