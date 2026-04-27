import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Vendor {
  id: string;
  business_name: string;
  rating: number;
  total_reviews: number;
  specialties: string[];
  vendor_types: string[];
  avatar_url: string | null;
  verified: boolean;
}

interface EventVendorsProps {
  eventId: string;
  maxDisplay?: number;
}

const EventVendors = ({ eventId, maxDisplay = 3 }: EventVendorsProps) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEventVendors = async () => {
      try {
        // Get vendor applications for this event
        const { data: applications, error: appError } = await supabase
          .from('public_vendor_applications')
          .select(`
            vendor_id,
            vendors!inner (
              id,
              business_name,
              rating,
              total_reviews,
              specialties,
              vendor_types,
              avatar_url,
              verified
            )
          `)
          .eq('event_id', eventId);

        if (appError) throw appError;

        const vendorData = applications?.map(app => app.vendors).filter(Boolean) || [];
        setVendors(vendorData.slice(0, maxDisplay));
      } catch (error) {
        console.error('Error fetching event vendors:', error);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventVendors();
    }
  }, [eventId, maxDisplay]);

  const handleVendorClick = (vendorId: string) => {
    navigate(`/vendor/${vendorId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Store className="w-4 h-4" />
        <span>Loading vendors...</span>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Store className="w-4 h-4" />
        <span>No vendors registered yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Store className="w-4 h-4" />
        <span>Vendors ({vendors.length})</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
      {vendors.map((vendor) => (
          <div
            key={vendor.id}
            onClick={() => handleVendorClick(vendor.id)}
            className="flex items-center gap-2 p-2 bg-card border rounded-lg hover:bg-accent/50 hover:border-primary/20 cursor-pointer transition-all duration-200 group"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={vendor.avatar_url || '/placeholder.svg'} />
              <AvatarFallback className="text-xs">
                {vendor.business_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-card-foreground truncate group-hover:text-primary transition-colors">
                  {vendor.business_name}
                </span>
                {vendor.verified && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    ✓
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>{vendor.rating.toFixed(1)}</span>
                <span>({vendor.total_reviews})</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventVendors;