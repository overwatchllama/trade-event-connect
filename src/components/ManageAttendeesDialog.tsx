import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManageAttendeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const ManageAttendeesDialog = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
}: ManageAttendeesDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [entryFee, setEntryFee] = useState<number>(0);
  const [maxAttendees, setMaxAttendees] = useState<number>(0);
  const [vendorTablePrice, setVendorTablePrice] = useState<number>(0);
  const [totalTables, setTotalTables] = useState<number>(0);

  useEffect(() => {
    if (open) {
      fetchEventDetails();
    }
  }, [open, eventId]);

  const fetchEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('entry_fee, max_attendees, vendor_table_price, total_tables')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      if (data) {
        setEntryFee(data.entry_fee || 0);
        setMaxAttendees(data.max_attendees || 0);
        setVendorTablePrice(data.vendor_table_price || 0);
        setTotalTables(data.total_tables || 0);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast.error('Failed to load event details');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          entry_fee: entryFee,
          max_attendees: maxAttendees,
          vendor_table_price: vendorTablePrice,
          total_tables: totalTables,
        })
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Event details updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Attendees & Tables - {eventTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="entryFee">Ticket Price ($)</Label>
            <Input
              id="entryFee"
              type="number"
              min="0"
              step="0.01"
              value={entryFee}
              onChange={(e) => setEntryFee(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAttendees">Maximum Attendees</Label>
            <Input
              id="maxAttendees"
              type="number"
              min="0"
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendorTablePrice">Vendor Table Price ($)</Label>
            <Input
              id="vendorTablePrice"
              type="number"
              min="0"
              step="0.01"
              value={vendorTablePrice}
              onChange={(e) => setVendorTablePrice(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalTables">Total Vendor Tables</Label>
            <Input
              id="totalTables"
              type="number"
              min="0"
              value={totalTables}
              onChange={(e) => setTotalTables(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageAttendeesDialog;
