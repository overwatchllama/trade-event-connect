import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Star, Heart, Ban, List, Save } from "lucide-react";

interface OrganizerVendorNotesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  onUpdate?: () => void;
}

interface VendorNote {
  id?: string;
  private_rating: number | null;
  private_notes: string | null;
  is_favorite: boolean;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  custom_list: string | null;
}

export const OrganizerVendorNotes = ({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  onUpdate,
}: OrganizerVendorNotesProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<VendorNote>({
    private_rating: null,
    private_notes: null,
    is_favorite: false,
    is_blacklisted: false,
    blacklist_reason: null,
    custom_list: null,
  });

  useEffect(() => {
    if (open && user && vendorId) {
      fetchNote();
    }
  }, [open, user, vendorId]);

  const fetchNote = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("organizer_vendor_notes")
        .select("*")
        .eq("organizer_id", user.id)
        .eq("vendor_id", vendorId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setNote({
          id: data.id,
          private_rating: data.private_rating,
          private_notes: data.private_notes,
          is_favorite: data.is_favorite || false,
          is_blacklisted: data.is_blacklisted || false,
          blacklist_reason: data.blacklist_reason,
          custom_list: data.custom_list,
        });
      } else {
        setNote({
          private_rating: null,
          private_notes: null,
          is_favorite: false,
          is_blacklisted: false,
          blacklist_reason: null,
          custom_list: null,
        });
      }
    } catch (error) {
      console.error("Error fetching vendor note:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const noteData = {
        organizer_id: user.id,
        vendor_id: vendorId,
        private_rating: note.private_rating,
        private_notes: note.private_notes,
        is_favorite: note.is_favorite,
        is_blacklisted: note.is_blacklisted,
        blacklist_reason: note.is_blacklisted ? note.blacklist_reason : null,
        custom_list: note.custom_list,
        updated_at: new Date().toISOString(),
      };

      if (note.id) {
        // Update existing
        const { error } = await supabase
          .from("organizer_vendor_notes")
          .update(noteData)
          .eq("id", note.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("organizer_vendor_notes")
          .insert(noteData);

        if (error) throw error;
      }

      toast.success("Vendor notes saved");
      onUpdate?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving vendor note:", error);
      toast.error("Failed to save vendor notes");
    } finally {
      setSaving(false);
    }
  };

  const handleRatingClick = (rating: number) => {
    setNote((prev) => ({
      ...prev,
      private_rating: prev.private_rating === rating ? null : rating,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Vendor: {vendorName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Rating */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Private Rating
              </Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleRatingClick(rating)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        note.private_rating && rating <= note.private_rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Only visible to you
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={note.is_favorite ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setNote((prev) => ({ ...prev, is_favorite: !prev.is_favorite }))
                }
                className={note.is_favorite ? "bg-pink-500 hover:bg-pink-600" : ""}
              >
                <Heart
                  className={`w-4 h-4 mr-2 ${note.is_favorite ? "fill-white" : ""}`}
                />
                {note.is_favorite ? "Favorited" : "Favorite"}
              </Button>
              <Button
                variant={note.is_blacklisted ? "destructive" : "outline"}
                size="sm"
                onClick={() =>
                  setNote((prev) => ({
                    ...prev,
                    is_blacklisted: !prev.is_blacklisted,
                  }))
                }
              >
                <Ban className="w-4 h-4 mr-2" />
                {note.is_blacklisted ? "Blacklisted" : "Blacklist"}
              </Button>
            </div>

            {/* Blacklist Reason */}
            {note.is_blacklisted && (
              <div className="space-y-2">
                <Label>Blacklist Reason</Label>
                <Textarea
                  placeholder="Why are you blacklisting this vendor?"
                  value={note.blacklist_reason || ""}
                  onChange={(e) =>
                    setNote((prev) => ({
                      ...prev,
                      blacklist_reason: e.target.value,
                    }))
                  }
                  rows={2}
                />
              </div>
            )}

            {/* Custom List */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Custom List / Tag
              </Label>
              <Input
                placeholder="e.g., VIP, Reliable, New, etc."
                value={note.custom_list || ""}
                onChange={(e) =>
                  setNote((prev) => ({ ...prev, custom_list: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Organize vendors into custom categories
              </p>
            </div>

            {/* Private Notes */}
            <div className="space-y-2">
              <Label>Private Notes</Label>
              <Textarea
                placeholder="Add private notes about this vendor..."
                value={note.private_notes || ""}
                onChange={(e) =>
                  setNote((prev) => ({ ...prev, private_notes: e.target.value }))
                }
                rows={3}
              />
            </div>

            {/* Status Summary */}
            <div className="flex gap-2 flex-wrap">
              {note.is_favorite && (
                <Badge className="bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200">
                  <Heart className="w-3 h-3 mr-1 fill-current" />
                  Favorite
                </Badge>
              )}
              {note.is_blacklisted && (
                <Badge variant="destructive">
                  <Ban className="w-3 h-3 mr-1" />
                  Blacklisted
                </Badge>
              )}
              {note.private_rating && (
                <Badge variant="secondary">
                  <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                  {note.private_rating}/5
                </Badge>
              )}
              {note.custom_list && (
                <Badge variant="outline">
                  <List className="w-3 h-3 mr-1" />
                  {note.custom_list}
                </Badge>
              )}
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};