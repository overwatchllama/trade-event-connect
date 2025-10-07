import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";
import { Loader2, Store } from "lucide-react";

interface VendorApplicationDialogProps {
  eventId: string;
  eventTitle: string;
  vendorTablePrice?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VendorApplicationDialog = ({
  eventId,
  eventTitle,
  vendorTablePrice = 0,
  open,
  onOpenChange,
}: VendorApplicationDialogProps) => {
  const { user } = useAuth();
  const { hasRole } = useUserRoles();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [requestedTables, setRequestedTables] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingVendor, setCheckingVendor] = useState(false);

  const checkVendorProfile = async () => {
    if (!user) return null;

    setCheckingVendor(true);
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error checking vendor profile:", error);
      return null;
    } finally {
      setCheckingVendor(false);
    }
  };

  const handleApply = async () => {
    console.log("=== VENDOR APPLICATION START ===");
    console.log("User:", user?.id);
    console.log("Event ID:", eventId);
    console.log("Vendor Table Price:", vendorTablePrice);

    if (!user) {
      console.log("No user found - redirecting to auth");
      toast.error("Please sign in to apply");
      navigate("/auth");
      return;
    }

    // Check if user has vendor role
    const isVendor = hasRole('vendor');
    console.log("Has vendor role:", isVendor);
    
    if (!isVendor) {
      console.log("User does not have vendor role - redirecting to profile");
      toast.error("You need the vendor role to apply. Please request it from your profile.");
      navigate("/profile");
      return;
    }

    setLoading(true);

    try {
      // Check if user has a vendor profile
      console.log("Checking vendor profile...");
      const vendorProfile = await checkVendorProfile();
      console.log("Vendor profile:", vendorProfile);

      if (!vendorProfile) {
        console.log("No vendor profile found - redirecting to create profile");
        toast.error("You need a vendor profile to apply. Please create one first.");
        navigate("/my-vendor-profile");
        onOpenChange(false);
        return;
      }

      // Check if already applied
      console.log("Checking for existing application...");
      const { data: existingApplication, error: checkError } = await supabase
        .from("vendor_applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_id", eventId)
        .maybeSingle();

      console.log("Existing application check:", { existingApplication, checkError });

      if (checkError) throw checkError;

      if (existingApplication) {
        console.log("User has already applied to this event");
        toast.error("You have already applied to this event");
        onOpenChange(false);
        return;
      }

      // Create application directly (no payment on application)
      console.log("Creating application without immediate payment...");
      await createApplication(vendorProfile.id);
    } catch (error: any) {
      console.error("ERROR in handleApply:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setLoading(false);
      console.log("=== VENDOR APPLICATION END ===");
    }
  };

  const createApplication = async (vendorId: string) => {
    console.log("=== CREATE APPLICATION ===");
    console.log("Creating application with data:", {
      vendor_id: vendorId,
      user_id: user!.id,
      event_id: eventId,
      notes: notes || null,
      application_status: "pending",
      payment_status: vendorTablePrice > 0 ? "unpaid" : "paid",
    });

    const { data, error } = await supabase.from("vendor_applications").insert({
      vendor_id: vendorId,
      user_id: user!.id,
      event_id: eventId,
      notes: notes || null,
      requested_tables: requestedTables,
      application_status: "pending",
      payment_status: vendorTablePrice > 0 ? "unpaid" : "paid",
    }).select();

    console.log("Insert result:", { data, error });

    if (error) {
      console.error("Insert error:", error);
      throw error;
    }

    console.log("Application created successfully!");
    toast.success("Application submitted successfully!");
    onOpenChange(false);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <DialogTitle>Apply as Vendor</DialogTitle>
          </div>
          <DialogDescription>
            Submit your application to be a vendor at {eventTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tables">Number of Tables Requested</Label>
            <Input
              id="tables"
              type="number"
              min={1}
              max={50}
              value={requestedTables}
              onChange={(e) => setRequestedTables(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How many vendor tables do you need? (Min: 1, Max: 50)
            </p>
          </div>

          {vendorTablePrice > 0 && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm font-medium">Vendor Table Fee</p>
              <p className="text-2xl font-bold">${vendorTablePrice} per table</p>
              <p className="text-lg font-semibold text-primary mt-1">
                Total for {requestedTables} table{requestedTables > 1 ? 's' : ''}: ${vendorTablePrice * requestedTables}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                No payment is collected now. If accepted, you'll receive a payment request.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Tell the organizer about your business, products, or any special requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={loading || checkingVendor}>
            {loading || checkingVendor ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
