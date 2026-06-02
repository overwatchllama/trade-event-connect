import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVendorProfile } from "@/hooks/useVendorProfile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FeatureAtEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemIds: string[];
  itemLabel?: string;
}

interface EventRow {
  id: string;
  title: string;
  date: string;
  city: string | null;
  state: string | null;
}

export function FeatureAtEventDialog({ open, onOpenChange, itemIds, itemLabel }: FeatureAtEventDialogProps) {
  const { user } = useAuth();
  const { vendorProfile } = useVendorProfile();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [existing, setExisting] = useState<Map<string, Set<string>>>(new Map()); // eventId -> set of itemIds already featured
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !vendorProfile?.id) return;
    (async () => {
      setLoading(true);
      // Fetch approved+paid events for this vendor
      const { data: apps } = await supabase
        .from("vendor_applications")
        .select("event_id, events!inner(id, title, date, city, state)")
        .eq("vendor_id", vendorProfile.id)
        .eq("application_status", "approved")
        .eq("payment_status", "paid");

      const evs: EventRow[] = (apps ?? [])
        .map((a: any) => a.events)
        .filter(Boolean);
      setEvents(evs);

      // Fetch existing picks for these items + events
      if (itemIds.length > 0 && evs.length > 0) {
        const { data: picks } = await supabase
          .from("vendor_event_inventory")
          .select("event_id, item_id")
          .eq("vendor_id", vendorProfile.id)
          .in("item_id", itemIds);
        const map = new Map<string, Set<string>>();
        const sel = new Set<string>();
        for (const p of picks ?? []) {
          if (!map.has(p.event_id)) map.set(p.event_id, new Set());
          map.get(p.event_id)!.add(p.item_id);
          // If all items are already featured at this event, pre-select it
          if (map.get(p.event_id)!.size === itemIds.length) sel.add(p.event_id);
        }
        setExisting(map);
        setSelectedEvents(sel);
      } else {
        setExisting(new Map());
        setSelectedEvents(new Set());
      }
      setLoading(false);
    })();
  }, [open, vendorProfile?.id, itemIds.join(",")]);

  const toggle = (eventId: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const save = async () => {
    if (!user || !vendorProfile?.id) return;
    setSaving(true);

    const toAdd: { vendor_id: string; event_id: string; item_id: string; user_id: string }[] = [];
    const toRemove: { event_id: string; item_id: string }[] = [];

    for (const ev of events) {
      const isSelected = selectedEvents.has(ev.id);
      const featured = existing.get(ev.id) ?? new Set();
      for (const itemId of itemIds) {
        const has = featured.has(itemId);
        if (isSelected && !has) {
          toAdd.push({ vendor_id: vendorProfile.id, event_id: ev.id, item_id: itemId, user_id: user.id });
        } else if (!isSelected && has) {
          toRemove.push({ event_id: ev.id, item_id: itemId });
        }
      }
    }

    try {
      if (toAdd.length > 0) {
        const { error } = await supabase.from("vendor_event_inventory").upsert(toAdd, {
          onConflict: "event_id,item_id",
        });
        if (error) throw error;
      }
      for (const r of toRemove) {
        await supabase
          .from("vendor_event_inventory")
          .delete()
          .eq("event_id", r.event_id)
          .eq("item_id", r.item_id);
      }
      toast({ title: "Saved", description: `Updated featured items across ${events.length} event(s).` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Feature at events</DialogTitle>
          <DialogDescription>
            {itemLabel
              ? `Choose events where "${itemLabel}" should appear in your inventory showcase.`
              : `Choose events where ${itemIds.length} selected item(s) should appear.`}
          </DialogDescription>
        </DialogHeader>

        {!vendorProfile ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            You need a vendor profile to feature inventory at events.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading events…
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No approved & paid events yet. Once you're confirmed for an event, you can feature inventory here.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1">
            {events.map((ev) => {
              const featuredCount = existing.get(ev.id)?.size ?? 0;
              return (
                <label
                  key={ev.id}
                  className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedEvents.has(ev.id)}
                    onCheckedChange={() => toggle(ev.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {ev.date}
                      {ev.city && ` · ${ev.city}${ev.state ? `, ${ev.state}` : ""}`}
                    </p>
                    {featuredCount > 0 && featuredCount < itemIds.length && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                        {featuredCount} of {itemIds.length} already featured
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || loading || events.length === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
