import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

interface EventSponsorsProps {
  eventId: string;
}

export const EventSponsors = ({ eventId }: EventSponsorsProps) => {
  const [eventSponsors, setEventSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventSponsors();
  }, [eventId]);

  const fetchEventSponsors = async () => {
    try {
      const { data, error } = await supabase
        .from("event_sponsors")
        .select(`
          *,
          sponsors:sponsor_id (*)
        `)
        .eq("event_id", eventId)
        .order("created_at");

      if (error) throw error;

      setEventSponsors(data || []);
    } catch (error) {
      console.error("Error fetching event sponsors:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "platinum":
        return "default";
      case "gold":
        return "secondary";
      case "silver":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading || eventSponsors.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Event Sponsors</h3>
      <Card>
        <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {eventSponsors.map((eventSponsor) => (
            <div
              key={eventSponsor.id}
              className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              {eventSponsor.sponsors.logo_url ? (
                <img
                  src={eventSponsor.sponsors.logo_url}
                  alt={eventSponsor.sponsors.company_name}
                  className="h-16 w-16 object-contain rounded"
                />
              ) : (
                <div className="h-16 w-16 bg-muted rounded flex items-center justify-center text-2xl font-bold text-muted-foreground">
                  {eventSponsor.sponsors.company_name.charAt(0)}
                </div>
              )}
              <div className="text-center">
                <p className="font-semibold text-sm">
                  {eventSponsor.sponsors.company_name}
                </p>
                <Badge
                  variant={getLevelColor(eventSponsor.sponsorship_level)}
                  className="mt-1 text-xs"
                >
                  {eventSponsor.sponsorship_level}
                </Badge>
              </div>
              {eventSponsor.sponsors.website_url && (
                <a
                  href={eventSponsor.sponsors.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  Visit
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
