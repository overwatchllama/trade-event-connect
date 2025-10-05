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
    if (!user) {
      toast.error("Please sign in to apply");
      navigate("/auth");
      return;
    }

    // Check if user has vendor role
    if (!hasRole('vendor')) {
      toast.error("You need the vendor role to apply. Please request it from your profile.");
      navigate("/profile");
      return;
    }

    setLoading(true);

    try {
      // Check if user has a vendor profile
      const vendorProfile = await checkVendorProfile();

      if (!vendorProfile) {
        toast.error("You need a vendor profile to apply. Please create one first.");
        navigate("/my-vendor-profile");
        onOpenChange(false);
        return;
      }

      // Check if already applied
      const { data: existingApplication, error: checkError } = await supabase
        .from("vendor_applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_id", eventId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingApplication) {
        toast.error("You have already applied to this event");
        onOpenChange(false);
        return;
      }

      // If there's a fee, redirect to payment
      if (vendorTablePrice > 0) {
        const { data, error } = await supabase.functions.invoke("vendor-registration-payment", {
          body: {
            eventId,
            eventTitle,
          },
        });

        if (error) throw error;

        if (data.requiresPayment && data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else if (data.message) {
          // Pro user - create application directly
          await createApplication(vendorProfile.id);
        }
      } else {
        // Free event - create application directly
        await createApplication(vendorProfile.id);
      }
    } catch (error: any) {
      console.error("Error applying:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  const createApplication = async (vendorId: string) => {
    const { error } = await supabase.from("vendor_applications").insert({
      vendor_id: vendorId,
      user_id: user!.id,
      event_id: eventId,
      notes: notes || null,
      application_status: "pending",
      payment_status: vendorTablePrice > 0 ? "unpaid" : "paid",
    });

    if (error) throw error;

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
          {vendorTablePrice > 0 && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm font-medium">Vendor Table Fee</p>
              <p className="text-2xl font-bold">${vendorTablePrice}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Payment will be processed after submitting your application
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
