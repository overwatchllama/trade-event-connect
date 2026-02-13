import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  CheckCircle,
  XCircle,
  Users,
  Store,
  Loader2,
  Camera,
  User,
  Ticket,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface EventCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

interface VendorApp {
  id: string;
  vendor_id: string;
  checked_in: boolean | null;
  checked_in_at: string | null;
  table_number: string | null;
  vendor: { business_name: string } | null;
}

const EventCheckInDialog = ({ open, onOpenChange, eventId, eventTitle }: EventCheckInDialogProps) => {
  const { user } = useAuth();

  // Visitor state
  const [ticketCode, setTicketCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [ticketResult, setTicketResult] = useState<any>(null);
  const [ticketStatus, setTicketStatus] = useState<"success" | "already" | "error" | null>(null);
  const [checkingInTicket, setCheckingInTicket] = useState(false);

  // Vendor state
  const [vendors, setVendors] = useState<VendorApp[]>([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [loadingVendors, setLoadingVendors] = useState(false);

  useEffect(() => {
    if (open) {
      fetchVendors();
    } else {
      resetVisitor();
    }
  }, [open, eventId]);

  const resetVisitor = () => {
    setTicketCode("");
    setTicketResult(null);
    setTicketStatus(null);
  };

  // --- Visitor check-in ---
  const lookupTicket = async () => {
    if (!ticketCode.trim()) return;
    setSearching(true);
    setTicketResult(null);
    setTicketStatus(null);

    try {
      let code = ticketCode.trim();
      try {
        const parsed = JSON.parse(code);
        code = parsed.ticketCode || code;
      } catch {}

      const { data: ticket, error } = await supabase
        .from("order_items")
        .select("id, ticket_code, ticket_type, checked_in, checked_in_at, user_id, event:events(id, title, date)")
        .eq("ticket_code", code)
        .eq("event_id", eventId)
        .single();

      if (error || !ticket) {
        setTicketStatus("error");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", ticket.user_id)
        .single();

      const data = {
        ...ticket,
        event: Array.isArray(ticket.event) ? ticket.event[0] : ticket.event,
        profile,
      };
      setTicketResult(data);
      setTicketStatus(ticket.checked_in ? "already" : "success");
    } catch {
      setTicketStatus("error");
    } finally {
      setSearching(false);
    }
  };

  const checkInVisitor = async () => {
    if (!ticketResult || !user) return;
    setCheckingInTicket(true);
    try {
      const { error } = await supabase
        .from("order_items")
        .update({ checked_in: true, checked_in_at: new Date().toISOString(), checked_in_by: user.id })
        .eq("id", ticketResult.id);
      if (error) throw error;
      toast.success("Guest checked in!");
      setTicketResult({ ...ticketResult, checked_in: true, checked_in_at: new Date().toISOString() });
      setTicketStatus("already");
    } catch {
      toast.error("Failed to check in guest");
    } finally {
      setCheckingInTicket(false);
    }
  };

  // --- Vendor check-in ---
  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      const { data, error } = await supabase
        .from("vendor_applications")
        .select("id, vendor_id, checked_in, checked_in_at, table_number, vendor:vendors(business_name)")
        .eq("event_id", eventId)
        .eq("application_status", "approved")
        .eq("payment_status", "paid")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setVendors(
        (data || []).map((d: any) => ({
          ...d,
          vendor: Array.isArray(d.vendor) ? d.vendor[0] : d.vendor,
        }))
      );
    } catch {
      console.error("Error fetching vendors");
    } finally {
      setLoadingVendors(false);
    }
  };

  const toggleVendorCheckIn = async (app: VendorApp) => {
    const newChecked = !app.checked_in;
    setVendors((prev) =>
      prev.map((v) =>
        v.id === app.id
          ? { ...v, checked_in: newChecked, checked_in_at: newChecked ? new Date().toISOString() : null }
          : v
      )
    );

    const { error } = await supabase
      .from("vendor_applications")
      .update({
        checked_in: newChecked,
        checked_in_at: newChecked ? new Date().toISOString() : null,
      })
      .eq("id", app.id);

    if (error) {
      toast.error("Failed to update vendor check-in");
      fetchVendors();
    } else {
      toast.success(newChecked ? "Vendor checked in!" : "Vendor check-in removed");
    }
  };

  const filteredVendors = vendors.filter((v) =>
    !vendorSearch || v.vendor?.business_name?.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const checkedInVendors = vendors.filter((v) => v.checked_in).length;
  const checkedInInfo = `${checkedInVendors}/${vendors.length} checked in`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Check-ins — {eventTitle}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="visitors" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visitors" className="text-sm">
              <Users className="h-4 w-4 mr-1" />
              Visitors
            </TabsTrigger>
            <TabsTrigger value="vendors" className="text-sm">
              <Store className="h-4 w-4 mr-1" />
              Vendors
              <Badge variant="secondary" className="ml-2 text-xs">{checkedInInfo}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Visitors Tab */}
          <TabsContent value="visitors" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter ticket code..."
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupTicket()}
              />
              <Button onClick={lookupTicket} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {ticketResult && (
              <Card
                className={`p-4 ${
                  ticketStatus === "success"
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : ticketStatus === "already"
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
                    : "border-red-500 bg-red-50 dark:bg-red-950"
                }`}
              >
                <div className="flex items-start gap-3">
                  {ticketStatus === "success" ? (
                    <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-yellow-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {ticketStatus === "success" ? "Valid Ticket" : "Already Checked In"}
                      </span>
                      <Badge variant="outline">{ticketResult.ticket_type}</Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{ticketResult.profile?.full_name || ticketResult.profile?.email || "Guest"}</span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">Code: {ticketResult.ticket_code}</p>
                    </div>
                    {ticketStatus === "success" && (
                      <Button className="w-full mt-2" onClick={checkInVisitor} disabled={checkingInTicket}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {checkingInTicket ? "Checking in..." : "Check In Guest"}
                      </Button>
                    )}
                    {ticketStatus === "already" && ticketResult.checked_in_at && (
                      <p className="text-xs text-muted-foreground">
                        Checked in at: {new Date(ticketResult.checked_in_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {ticketStatus === "error" && !ticketResult && (
              <Card className="p-4 border-red-500 bg-red-50 dark:bg-red-950">
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="font-semibold">Ticket Not Found</p>
                    <p className="text-sm text-muted-foreground">Not valid for this event.</p>
                  </div>
                </div>
              </Card>
            )}

            {ticketResult && (
              <Button variant="outline" className="w-full" onClick={resetVisitor}>
                Scan Another Ticket
              </Button>
            )}
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-4">
            <Input
              placeholder="Search vendors..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
            />

            {loadingVendors ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredVendors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {vendors.length === 0 ? "No approved & paid vendors for this event." : "No vendors match your search."}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredVendors.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={!!v.checked_in}
                      onCheckedChange={() => toggleVendorCheckIn(v)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${v.checked_in ? "line-through text-muted-foreground" : ""}`}>
                        {v.vendor?.business_name || "Unknown Vendor"}
                      </p>
                      {v.table_number && (
                        <p className="text-xs text-muted-foreground">Table: {v.table_number}</p>
                      )}
                    </div>
                    {v.checked_in && (
                      <Badge variant="secondary" className="text-xs shrink-0">Checked In</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EventCheckInDialog;
