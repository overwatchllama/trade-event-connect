import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
}

interface ClaimVenueDialogProps {
  venue: Venue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClaimVenueDialog = ({ venue, open, onOpenChange }: ClaimVenueDialogProps) => {
  const { user } = useAuth();
  const [claimType, setClaimType] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !claimType) {
      toast.error("Please select a claim type");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('venue_claims')
        .insert({
          venue_id: venue.id,
          claimer_id: user.id,
          claim_type: claimType,
          reason: reason.trim() || null
        });

      if (error) throw error;

      toast.success("Venue claim submitted successfully! It will be reviewed by the venue owner or administrators.");
      onOpenChange(false);
      setClaimType("");
      setReason("");
    } catch (error) {
      console.error("Error submitting venue claim:", error);
      toast.error("Failed to submit venue claim");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Claim Venue</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">{venue.name}</h3>
            <p className="text-sm text-muted-foreground">
              {venue.address}, {venue.city}, {venue.state}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="claimType">Claim Type</Label>
              <Select value={claimType} onValueChange={setClaimType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your relationship to this venue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner - I own this venue</SelectItem>
                  <SelectItem value="manager">Manager - I manage this venue</SelectItem>
                  <SelectItem value="editor">Editor - I help maintain venue information</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide additional details about your claim..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!claimType || isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Claim"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};