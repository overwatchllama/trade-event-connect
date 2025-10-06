import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Building2, Calendar, DollarSign } from "lucide-react";

interface SponsorWithEvents {
  id: string;
  company_name: string;
  logo_url: string | null;
  website_url: string | null;
  user_id: string;
  events: {
    id: string;
    title: string;
    date: string;
    sponsorship_level: string;
  }[];
  sharedEvents: number;
}

export const SponsorsList = () => {
  const [sponsors, setSponsors] = useState<SponsorWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSponsors = async () => {
      if (!user) return;

      try {
        // Get current user's events (as vendor)
        const { data: myApplications } = await supabase
          .from('vendor_applications')
          .select('event_id')
          .eq('user_id', user.id)
          .eq('application_status', 'approved');

        const myEventIds = myApplications?.map(app => app.event_id) || [];

        // Get all sponsors
        const { data: sponsorsData } = await supabase
          .from('sponsors')
          .select('id, company_name, logo_url, website_url, user_id');

        if (!sponsorsData) {
          setLoading(false);
          return;
        }

        // For each sponsor, get their sponsored events
        const sponsorsWithEvents = await Promise.all(
          sponsorsData.map(async (sponsor) => {
            const { data: sponsorships } = await supabase
              .from('event_sponsors')
              .select('event_id, sponsorship_level')
              .eq('sponsor_id', sponsor.id);

            const sponsorEventIds = sponsorships?.map(s => s.event_id) || [];
            
            // Find shared events
            const sharedEventIds = sponsorEventIds.filter(id => myEventIds.includes(id));
            
            // Get event details for shared events
            const { data: events } = await supabase
              .from('events')
              .select('id, title, date')
              .in('id', sharedEventIds)
              .order('date', { ascending: false });

            const eventsWithLevels = events?.map(event => ({
              ...event,
              sponsorship_level: sponsorships?.find(s => s.event_id === event.id)?.sponsorship_level || 'standard'
            })) || [];

            return {
              ...sponsor,
              events: eventsWithLevels,
              sharedEvents: sharedEventIds.length
            };
          })
        );

        // Sort by number of shared events
        sponsorsWithEvents.sort((a, b) => b.sharedEvents - a.sharedEvents);
        setSponsors(sponsorsWithEvents);
      } catch (error) {
        console.error('Error fetching sponsors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSponsors();
  }, [user]);

  if (loading) {
    return <div className="text-center py-8">Loading sponsors...</div>;
  }

  if (sponsors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No sponsors found yet. As you attend more events, you'll see sponsors supporting those events here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Sponsor Network</h2>
        <p className="text-muted-foreground">View sponsors supporting events you've attended</p>
      </div>
      
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sponsors.map((sponsor) => (
          <Card key={sponsor.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={sponsor.logo_url || undefined} />
                  <AvatarFallback>
                    <Building2 className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{sponsor.company_name}</CardTitle>
                  {sponsor.sharedEvents > 0 && (
                    <Badge variant="secondary" className="mt-1">
                      {sponsor.sharedEvents} shared event{sponsor.sharedEvents !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sponsor.website_url && (
                <a 
                  href={sponsor.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline mb-3 block"
                  onClick={(e) => e.stopPropagation()}
                >
                  Visit Website →
                </a>
              )}
              {sponsor.events.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Events together:
                  </p>
                  <div className="space-y-1">
                    {sponsor.events.slice(0, 3).map((event) => (
                      <div key={event.id} className="text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-foreground truncate">• {event.title}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {event.sponsorship_level}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {sponsor.events.length > 3 && (
                      <div className="text-sm text-muted-foreground">
                        +{sponsor.events.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
