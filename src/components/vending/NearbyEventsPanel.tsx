import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface NearbyEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  city: string;
  state: string;
  address: string;
  organizer_id: string;
  organizer_name: string;
  event_type: string;
  entry_fee: number | null;
  vendor_table_price: number | null;
  tables_available: number | null;
}

interface NearbyEventsPanelProps {
  selectedDate: Date;
  vendorId: string;
  vendorCity: string;
  vendorState: string;
  /** IDs of events the vendor already applied to */
  appliedEventIds: Set<string>;
}

const NearbyEventsPanel = ({
  selectedDate,
  vendorId,
  vendorCity,
  vendorState,
  appliedEventIds,
}: NearbyEventsPanelProps) => {
  const navigate = useNavigate();
  const [allEvents, setAllEvents] = useState<NearbyEvent[]>([]);
  const [shortlistedOrgIds, setShortlistedOrgIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  // Fetch events for the selected date + shortlisted organizers
  useEffect(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setLoading(true);

    const fetchData = async () => {
      try {
        const [eventsRes, notesRes] = await Promise.all([
          supabase
            .from("events")
            .select(
              "id, title, date, venue, city, state, address, organizer_id, organizer_name, event_type, entry_fee, vendor_table_price, tables_available"
            )
            .eq("date", dateStr)
            .order("title"),
          supabase
            .from("vendor_organizer_notes")
            .select("organizer_id")
            .eq("vendor_id", vendorId)
            .eq("is_favorite", true),
        ]);

        setAllEvents(eventsRes.data || []);
        setShortlistedOrgIds(
          new Set((notesRes.data || []).map((n) => n.organizer_id))
        );
      } catch (err) {
        console.error("Error fetching nearby events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, vendorId]);

  // Simple proximity scoring: same city+state = 0 (best), same state = 1, else 2
  const scored = useMemo(() => {
    const vCity = vendorCity.toLowerCase().trim();
    const vState = vendorState.toLowerCase().trim();

    return allEvents
      .map((ev) => {
        const eCity = ev.city.toLowerCase().trim();
        const eState = ev.state.toLowerCase().trim();
        let proximity = 2;
        if (eState === vState && eCity === vCity) proximity = 0;
        else if (eState === vState) proximity = 1;
        return { ...ev, proximity };
      })
      .sort((a, b) => a.proximity - b.proximity);
  }, [allEvents, vendorCity, vendorState]);

  const shortlisted = useMemo(
    () => scored.filter((ev) => shortlistedOrgIds.has(ev.organizer_id)),
    [scored, shortlistedOrgIds]
  );

  const proximityLabel = (p: number) => {
    if (p === 0) return null; // same city — no badge needed
    if (p === 1)
      return (
        <Badge variant="secondary" className="text-xs py-0">
          Same state
        </Badge>
      );
    return (
      <Badge variant="outline" className="text-xs py-0">
        Out of state
      </Badge>
    );
  };

  const renderEventList = (list: NearbyEvent[]) => {
    if (loading) {
      return (
        <div className="animate-pulse space-y-3 py-2">
          <div className="h-14 bg-muted rounded" />
          <div className="h-14 bg-muted rounded" />
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-6 text-sm">
          No events found on this date
        </p>
      );
    }

    return (
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {list.map((ev) => {
          const alreadyApplied = appliedEventIds.has(ev.id);
          const isShortlisted = shortlistedOrgIds.has(ev.organizer_id);
          return (
            <div
              key={ev.id}
              className="border rounded-lg p-3 cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => navigate(`/event/${ev.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm leading-tight truncate">
                  {ev.title}
                </h4>
                <div className="flex items-center gap-1 shrink-0">
                  {isShortlisted && (
                    <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                  )}
                  {alreadyApplied && (
                    <Badge className="text-xs py-0">Applied</Badge>
                  )}
                  {(ev as any).proximity !== undefined &&
                    proximityLabel((ev as any).proximity)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {ev.venue} · {ev.city}, {ev.state}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="font-medium">{ev.organizer_name}</span>
                {ev.vendor_table_price != null && (
                  <span>· Table: ${ev.vendor_table_price}</span>
                )}
                {ev.tables_available != null && (
                  <span>· {ev.tables_available} avail</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarIcon className="h-5 w-5" />
          Events on {format(selectedDate, "MMM d")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-3">
            <TabsTrigger value="all" className="flex-1 text-xs">
              All ({scored.length})
            </TabsTrigger>
            <TabsTrigger value="shortlisted" className="flex-1 text-xs">
              <Heart className="h-3 w-3 mr-1" />
              Shortlisted ({shortlisted.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-0">
            {renderEventList(scored)}
          </TabsContent>
          <TabsContent value="shortlisted" className="mt-0">
            {renderEventList(shortlisted)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default NearbyEventsPanel;
