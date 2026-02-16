import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface CreatePersonalEventDialogProps {
  onCreated: () => void;
}

const CreatePersonalEventDialog = ({ onCreated }: CreatePersonalEventDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: "",
    venue: "",
    address: "",
    city: "",
    state: "",
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title || !form.date) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("vendor_personal_events").insert({
        user_id: user.id,
        title: form.title,
        date: form.date,
        venue: form.venue || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        notes: form.notes || null,
      });

      if (error) throw error;

      toast({ title: "Event added", description: "Your personal event has been added to the calendar." });
      setForm({ title: "", date: "", venue: "", address: "", city: "", state: "", notes: "" });
      setOpen(false);
      onCreated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create event";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Unlisted Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Unlisted Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pe-title">Event Name *</Label>
            <Input
              id="pe-title"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Saturday Card Show"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pe-date">Date *</Label>
            <Input
              id="pe-date"
              type="date"
              value={form.date}
              onChange={(e) => handleChange("date", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pe-venue">Venue</Label>
            <Input
              id="pe-venue"
              value={form.venue}
              onChange={(e) => handleChange("venue", e.target.value)}
              placeholder="Convention Center"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pe-address">Address</Label>
            <Input
              id="pe-address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pe-city">City</Label>
              <Input
                id="pe-city"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Austin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-state">State</Label>
              <Input
                id="pe-state"
                value={form.state}
                onChange={(e) => handleChange("state", e.target.value)}
                placeholder="TX"
                maxLength={2}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pe-notes">Notes</Label>
            <Textarea
              id="pe-notes"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Any details you want to remember..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.title || !form.date}>
              {saving ? "Saving..." : "Add Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePersonalEventDialog;
