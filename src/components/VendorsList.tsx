import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Building2, Calendar } from "lucide-react";

interface VendorWithEvents {
  id: string;
  business_name: string;
  avatar_url: string | null;
  user_id: string;
  events: {
    id: string;
    title: string;
    date: string;
  }[];
  sharedEvents: number;
}

export const VendorsList = () => {
  const [vendors, setVendors] = useState<VendorWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendors = async () => {
      if (!user) return;

      try {
        // Get current user's events
        const { data: myApplications } = await supabase
          .from('vendor_applications')
          .select('event_id')
          .eq('user_id', user.id)
          .eq('application_status', 'approved');

        const myEventIds = myApplications?.map(app => app.event_id) || [];

        // Get all vendors
        const { data: vendorsData } = await supabase
          .from('vendors')
          .select('id, business_name, avatar_url, user_id')
          .neq('user_id', user.id);

        if (!vendorsData) {
          setLoading(false);
          return;
        }

        // For each vendor, get their events
        const vendorsWithEvents = await Promise.all(
          vendorsData.map(async (vendor) => {
            const { data: applications } = await supabase
              .from('vendor_applications')
              .select('event_id')
              .eq('user_id', vendor.user_id)
              .eq('application_status', 'approved');

            const vendorEventIds = applications?.map(app => app.event_id) || [];
            
            // Find shared events
            const sharedEventIds = vendorEventIds.filter(id => myEventIds.includes(id));
            
            // Get event details for shared events
            const { data: events } = await supabase
              .from('events')
              .select('id, title, date')
              .in('id', sharedEventIds)
              .order('date', { ascending: false });

            return {
              ...vendor,
              events: events || [],
              sharedEvents: sharedEventIds.length
            };
          })
        );

        // Sort by number of shared events
        vendorsWithEvents.sort((a, b) => b.sharedEvents - a.sharedEvents);
        setVendors(vendorsWithEvents);
      } catch (error) {
        console.error('Error fetching vendors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [user]);

  if (loading) {
    return <div className="text-center py-8">Loading vendors...</div>;
  }

  if (vendors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No other vendors found yet. As you attend more events, you'll see vendors you've worked with here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Vendor Network</h2>
        <p className="text-muted-foreground">Connect with other vendors you've met at events</p>
      </div>
      
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vendors.map((vendor) => (
          <Card 
            key={vendor.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/vendors?id=${vendor.user_id}`)}
          >
            <CardHeader>
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={vendor.avatar_url || undefined} />
                  <AvatarFallback>
                    <Building2 className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{vendor.business_name}</CardTitle>
                  {vendor.sharedEvents > 0 && (
                    <Badge variant="secondary" className="mt-1">
                      {vendor.sharedEvents} shared event{vendor.sharedEvents !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {vendor.events.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Events together:
                  </p>
                  <div className="space-y-1">
                    {vendor.events.slice(0, 3).map((event) => (
                      <div key={event.id} className="text-sm text-foreground truncate">
                        • {event.title}
                      </div>
                    ))}
                    {vendor.events.length > 3 && (
                      <div className="text-sm text-muted-foreground">
                        +{vendor.events.length - 3} more
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
