import { useState, useEffect } from "react";
import { VenueCard } from "./VenueCard";
import { CreateVenueDialog } from "./CreateVenueDialog";
import { VenueCalendar } from "./VenueCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Search, MapPin, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Venue {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  owner_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  capacity: number | null;
  amenities: string[] | null;
  image_url: string | null;
  verified: boolean;
  created_at: string;
}

export const VenuesList = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const { data, error } = await supabase
        .from('public_venues' as any)
        .select('*')
        .order('name');

      if (error) throw error;
      setVenues((data || []) as unknown as Venue[]);
    } catch (error) {
      console.error('Error fetching venues:', error);
      toast.error('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  const handleVenueClick = (venue: Venue) => {
    setSelectedVenue(venue);
    setShowCalendar(true);
  };

  const filteredVenues = venues.filter((venue) => {
    const matchesSearch = searchQuery === "" || 
      venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesState = selectedState === "all" || venue.state === selectedState;
    
    return matchesSearch && matchesState;
  });

  // Get unique states for filter
  const states = [...new Set(venues.map(venue => venue.state))].sort();

  const canCreateOrClaim = user && (profile?.role === 'organizer' || profile?.role === 'vendor');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Event Venues
          </h2>
          <p className="text-muted-foreground mt-1">
            Discover venues hosting card events or claim ownership of your venue
          </p>
        </div>
        
        {canCreateOrClaim && (
          <CreateVenueDialog onVenueCreated={fetchVenues} />
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search venues by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedState} onValueChange={setSelectedState}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {states.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Venues Grid */}
      {loading ? (
        <div className="text-center py-8">Loading venues...</div>
      ) : filteredVenues.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No venues found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || selectedState !== "all" 
              ? "No venues match your current filters." 
              : "Be the first to add a venue to our platform!"}
          </p>
          {canCreateOrClaim && (
            <CreateVenueDialog onVenueCreated={fetchVenues} />
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVenues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              canClaim={canCreateOrClaim}
              onVenueClick={handleVenueClick}
            />
          ))}
        </div>
      )}

      {/* Venue Calendar Dialog */}
      {selectedVenue && (
        <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedVenue.name}
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {selectedVenue.address}, {selectedVenue.city}, {selectedVenue.state}
              </div>
            </DialogHeader>
            
            <VenueCalendar 
              venueId={selectedVenue.id} 
              venueName={selectedVenue.name}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};