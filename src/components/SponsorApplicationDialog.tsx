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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

interface SponsorApplicationDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SponsorApplicationDialog = ({
  eventId,
  eventTitle,
  open,
  onOpenChange,
}: SponsorApplicationDialogProps) => {
  const { user } = useAuth();
  const { hasRole } = useUserRoles();
  const navigate = useNavigate();
  const [sponsorshipLevel, setSponsorshipLevel] = useState("standard");
  const [amount, setAmount] = useState("");
  const [benefits, setBenefits] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSponsor, setCheckingSponsor] = useState(false);

  const checkSponsorProfile = async () => {
    if (!user) return null;

    setCheckingSponsor(true);
    try {
      const { data, error } = await supabase
        .from("sponsors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error checking sponsor profile:", error);
      return null;
    } finally {
      setCheckingSponsor(false);
    }
  };

  const handleApply = async () => {
    if (!user) {
      toast.error("Please sign in to apply");
      navigate("/auth");
      return;
    }

    // Check if user has sponsor role
    if (!hasRole('sponsor')) {
      toast.error("You need the sponsor role to apply. Please request it from your profile.");
      navigate("/profile");
      return;
    }

    setLoading(true);

    try {
      // Check if user has a sponsor profile
      const sponsorProfile = await checkSponsorProfile();

      if (!sponsorProfile) {
        toast.error("You need a sponsor profile to apply. Please create one first.");
        navigate("/my-sponsor-profile");
        onOpenChange(false);
        return;
      }

      // Check if already a sponsor for this event
      const { data: existingSponsorship, error: checkError } = await supabase
        .from("event_sponsors")
        .select("id")
        .eq("sponsor_id", sponsorProfile.id)
        .eq("event_id", eventId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingSponsorship) {
        toast.error("You are already sponsoring this event");
        onOpenChange(false);
        return;
      }

      // Create sponsorship
      const { error } = await supabase.from("event_sponsors").insert({
        sponsor_id: sponsorProfile.id,
        event_id: eventId,
        sponsorship_level: sponsorshipLevel,
        amount: amount ? parseFloat(amount) : null,
        benefits: benefits || null,
      });

      if (error) throw error;

      toast.success("Sponsorship application submitted successfully!");
      onOpenChange(false);
      setSponsorshipLevel("standard");
      setAmount("");
      setBenefits("");
    } catch (error: unknown) {
      console.error("Error applying:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit sponsorship application";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Become a Sponsor</DialogTitle>
          </div>
          <DialogDescription>
            Submit your sponsorship application for {eventTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="level">Sponsorship Level</Label>
            <Select value={sponsorshipLevel} onValueChange={setSponsorshipLevel}>
              <SelectTrigger id="level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platinum">Platinum</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Sponsorship Amount (Optional)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefits">Requested Benefits (Optional)</Label>
            <Textarea
              id="benefits"
              placeholder="Describe what benefits you're looking for (booth space, logo placement, etc.)..."
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={loading || checkingSponsor}>
            {loading || checkingSponsor ? (
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
