import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Star,
  Heart,
  Ban,
  List,
  StickyNote,
  Search,
  Store,
} from "lucide-react";
import { toast } from "sonner";

interface VendorEntry {
  vendor_id: string;
  user_id: string;
  business_name: string;
  business_email: string | null;
  events: { id: string; title: string; date: string; status: string }[];
  private_notes: string | null;
  private_rating: number | null;
  is_favorite: boolean;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  custom_list: string | null;
}

export const VendorRateReview = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<VendorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterList, setFilterList] = useState("all");
  const [editVendor, setEditVendor] = useState<VendorEntry | null>(null);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(0);
  const [banReason, setBanReason] = useState("");
  const [showBanDialog, setShowBanDialog] = useState<VendorEntry | null>(null);

  useEffect(() => {
    if (user) fetchVendors();
  }, [user]);

  const fetchVendors = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get organizer's events
      const { data: myEvents } = await supabase
        .from("events")
        .select("id, title, date")
        .eq("organizer_id", user.id);

      if (!myEvents?.length) {
        setVendors([]);
        setLoading(false);
        return;
      }

      const eventIds = myEvents.map((e) => e.id);
      const eventsMap = new Map(myEvents.map((e) => [e.id, e]));

      // Get vendor applications (approved or paid)
      const { data: apps } = await supabase
        .from("vendor_applications")
        .select("vendor_id, user_id, event_id, application_status, payment_status")
        .in("event_id", eventIds);

      if (!apps?.length) {
        setVendors([]);
        setLoading(false);
        return;
      }

      // Unique vendor ids
      const vendorIds = [...new Set(apps.map((a) => a.vendor_id))];

      // Get vendor details
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("id, user_id, business_name, business_email")
        .in("id", vendorIds);

      // Get organizer notes
      const { data: notesData } = await supabase
        .from("organizer_vendor_notes")
        .select("*")
        .eq("organizer_id", user.id)
        .in("vendor_id", vendorIds);

      const notesMap = new Map(notesData?.map((n) => [n.vendor_id, n]) || []);
      const vendorMap = new Map(vendorData?.map((v) => [v.id, v]) || []);

      // Group by vendor
      const grouped = new Map<string, VendorEntry>();
      apps.forEach((app) => {
        const vendor = vendorMap.get(app.vendor_id);
        if (!vendor) return;

        const evt = eventsMap.get(app.event_id);
        if (!evt) return;

        const status =
          app.application_status === "approved" && app.payment_status === "paid"
            ? "confirmed"
            : app.application_status;

        if (!grouped.has(vendor.id)) {
          const note = notesMap.get(vendor.id);
          grouped.set(vendor.id, {
            vendor_id: vendor.id,
            user_id: vendor.user_id,
            business_name: vendor.business_name,
            business_email: vendor.business_email,
            events: [],
            private_notes: note?.private_notes || null,
            private_rating: note?.private_rating || null,
            is_favorite: note?.is_favorite || false,
            is_blacklisted: note?.is_blacklisted || false,
            blacklist_reason: note?.blacklist_reason || null,
            custom_list: note?.custom_list || null,
          });
        }
        grouped.get(vendor.id)!.events.push({
          id: evt.id,
          title: evt.title,
          date: evt.date,
          status,
        });
      });

      setVendors(Array.from(grouped.values()));
    } catch (err) {
      console.error("Error fetching vendors for review:", err);
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const upsertNote = async (
    vendorId: string,
    data: Record<string, unknown>
  ) => {
    if (!user) return;
    const { error } = await supabase
      .from("organizer_vendor_notes")
      .upsert(
        { organizer_id: user.id, vendor_id: vendorId, ...data },
        { onConflict: "organizer_id,vendor_id" }
      );
    if (error) throw error;
  };

  const handleSaveNotes = async () => {
    if (!editVendor) return;
    try {
      await upsertNote(editVendor.vendor_id, {
        private_notes: notes,
        private_rating: rating > 0 ? rating : null,
      });
      toast.success("Notes saved");
      setEditVendor(null);
      fetchVendors();
    } catch {
      toast.error("Failed to save notes");
    }
  };

  const toggleFavorite = async (v: VendorEntry) => {
    try {
      await upsertNote(v.vendor_id, { is_favorite: !v.is_favorite });
      toast.success(v.is_favorite ? "Removed from favorites" : "Added to favorites");
      fetchVendors();
    } catch {
      toast.error("Failed to update");
    }
  };

  const toggleShortlist = async (v: VendorEntry) => {
    const newList = v.custom_list === "shortlist" ? null : "shortlist";
    try {
      await upsertNote(v.vendor_id, { custom_list: newList });
      toast.success(newList ? "Added to shortlist" : "Removed from shortlist");
      fetchVendors();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleBan = async () => {
    if (!showBanDialog) return;
    try {
      await upsertNote(showBanDialog.vendor_id, {
        is_blacklisted: true,
        blacklist_reason: banReason || null,
      });
      toast.success("Vendor banned");
      setShowBanDialog(null);
      setBanReason("");
      fetchVendors();
    } catch {
      toast.error("Failed to ban vendor");
    }
  };

  const handleUnban = async (v: VendorEntry) => {
    try {
      await upsertNote(v.vendor_id, {
        is_blacklisted: false,
        blacklist_reason: null,
      });
      toast.success("Vendor unbanned");
      fetchVendors();
    } catch {
      toast.error("Failed to unban vendor");
    }
  };

  const filtered = vendors.filter((v) => {
    if (search && !v.business_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterList === "favorites" && !v.is_favorite) return false;
    if (filterList === "shortlist" && v.custom_list !== "shortlist") return false;
    if (filterList === "banned" && !v.is_blacklisted) return false;
    return true;
  });

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading vendors...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <Star className="h-8 w-8 text-primary mx-auto mb-1" />
        <h3 className="text-xl font-semibold text-foreground">Rate & Review Vendors</h3>
        <p className="text-muted-foreground text-sm">
          Manage your private notes, ratings, and lists for vendors across all your events.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterList} onValueChange={setFilterList}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            <SelectItem value="favorites">Favorites</SelectItem>
            <SelectItem value="shortlist">Shortlist</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {vendors.length === 0
            ? "No vendors have applied to your events yet."
            : "No vendors match your filter."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <Card
              key={v.vendor_id}
              className={`${v.is_blacklisted ? "border-destructive/40 opacity-75" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-foreground truncate">
                        {v.business_name}
                      </span>
                      {v.is_favorite && (
                        <Heart className="h-4 w-4 fill-red-500 text-red-500 shrink-0" />
                      )}
                      {v.custom_list === "shortlist" && (
                        <Badge variant="secondary" className="text-xs">Shortlist</Badge>
                      )}
                      {v.is_blacklisted && (
                        <Badge variant="destructive" className="text-xs">Banned</Badge>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= (v.private_rating || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                      {!v.private_rating && (
                        <span className="text-xs text-muted-foreground ml-1">Not rated</span>
                      )}
                    </div>

                    {/* Events */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {v.events.map((evt) => (
                        <Badge key={`${v.vendor_id}-${evt.id}`} variant="outline" className="text-xs">
                          {evt.title}
                        </Badge>
                      ))}
                    </div>

                    {v.private_notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        📝 {v.private_notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setEditVendor(v);
                        setNotes(v.private_notes || "");
                        setRating(v.private_rating || 0);
                      }}
                    >
                      <StickyNote className="h-4 w-4" />
                      <span className="hidden sm:inline">Notes</span>
                    </Button>
                    <Button
                      variant={v.is_favorite ? "default" : "outline"}
                      size="sm"
                      className="gap-1"
                      onClick={() => toggleFavorite(v)}
                    >
                      <Heart className={`h-4 w-4 ${v.is_favorite ? "fill-current" : ""}`} />
                      <span className="hidden sm:inline">
                        {v.is_favorite ? "Favorited" : "Favorite"}
                      </span>
                    </Button>
                    <Button
                      variant={v.custom_list === "shortlist" ? "default" : "outline"}
                      size="sm"
                      className="gap-1"
                      onClick={() => toggleShortlist(v)}
                    >
                      <List className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {v.custom_list === "shortlist" ? "Shortlisted" : "Shortlist"}
                      </span>
                    </Button>
                    {v.is_blacklisted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleUnban(v)}
                      >
                        <Ban className="h-4 w-4" />
                        <span className="hidden sm:inline">Unban</span>
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          setShowBanDialog(v);
                          setBanReason("");
                        }}
                      >
                        <Ban className="h-4 w-4" />
                        <span className="hidden sm:inline">Ban</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Notes/Rating Dialog */}
      <Dialog open={!!editVendor} onOpenChange={(o) => !o && setEditVendor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes – {editVendor?.business_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Private Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        s <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Private Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your private notes about this vendor..."
                rows={5}
              />
            </div>
            <Button onClick={handleSaveNotes} className="w-full">
              Save Notes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={!!showBanDialog} onOpenChange={(o) => !o && setShowBanDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {showBanDialog?.business_name}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Banning a vendor marks them in your private records. They won't be notified.
            </p>
            <div>
              <label className="text-sm font-medium mb-2 block">Reason (optional)</label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Why are you banning this vendor?"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowBanDialog(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleBan}
              >
                Confirm Ban
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
