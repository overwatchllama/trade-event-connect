import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import EventCard from "@/components/EventCard";
import CreateEventDialog from "@/components/CreateEventDialog";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, MapPin, Calendar, Plus, Edit } from "lucide-react";
import AdvancedSearch from "@/components/AdvancedSearch";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Events = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCardType, setSelectedCardType] = useState("all");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedEventType, setSelectedEventType] = useState("all");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { profile } = useProfile();

  // US States options for multi-select
  const stateOptions: Option[] = [
    { label: "Alabama", value: "AL" },
    { label: "Alaska", value: "AK" },
    { label: "Arizona", value: "AZ" },
    { label: "Arkansas", value: "AR" },
    { label: "California", value: "CA" },
    { label: "Colorado", value: "CO" },
    { label: "Connecticut", value: "CT" },
    { label: "Delaware", value: "DE" },
    { label: "Florida", value: "FL" },
    { label: "Georgia", value: "GA" },
    { label: "Hawaii", value: "HI" },
    { label: "Idaho", value: "ID" },
    { label: "Illinois", value: "IL" },
    { label: "Indiana", value: "IN" },
    { label: "Iowa", value: "IA" },
    { label: "Kansas", value: "KS" },
    { label: "Kentucky", value: "KY" },
    { label: "Louisiana", value: "LA" },
    { label: "Maine", value: "ME" },
    { label: "Maryland", value: "MD" },
    { label: "Massachusetts", value: "MA" },
    { label: "Michigan", value: "MI" },
    { label: "Minnesota", value: "MN" },
    { label: "Mississippi", value: "MS" },
    { label: "Missouri", value: "MO" },
    { label: "Montana", value: "MT" },
    { label: "Nebraska", value: "NE" },
    { label: "Nevada", value: "NV" },
    { label: "New Hampshire", value: "NH" },
    { label: "New Jersey", value: "NJ" },
    { label: "New Mexico", value: "NM" },
    { label: "New York", value: "NY" },
    { label: "North Carolina", value: "NC" },
    { label: "North Dakota", value: "ND" },
    { label: "Ohio", value: "OH" },
    { label: "Oklahoma", value: "OK" },
    { label: "Oregon", value: "OR" },
    { label: "Pennsylvania", value: "PA" },
    { label: "Rhode Island", value: "RI" },
    { label: "South Carolina", value: "SC" },
    { label: "South Dakota", value: "SD" },
    { label: "Tennessee", value: "TN" },
    { label: "Texas", value: "TX" },
    { label: "Utah", value: "UT" },
    { label: "Vermont", value: "VT" },
    { label: "Virginia", value: "VA" },
    { label: "Washington", value: "WA" },
    { label: "West Virginia", value: "WV" },
    { label: "Wisconsin", value: "WI" },
    { label: "Wyoming", value: "WY" }
  ];

  // Fetch events from database
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        // Fetch all events
        const { data: eventsData, error } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform database events to match expected format
        const transformedEvents = eventsData?.map(event => ({
          id: event.id,
          title: event.title,
          date: event.date,
          time: event.is_multi_day ? 'Multi-day event' : 'Single day',
          location: event.venue,
          city: event.city,
          state: event.state,
          organizer: event.organizer_name || 'Unknown Organizer',
          rating: 4.5, // Default rating since we don't have ratings yet
          attendees: 0, // Default attendees since we don't have this data yet
          maxAttendees: event.max_attendees || 100,
          tablesAvailable: event.tables_available || 0,
          totalTables: event.total_tables || 0,
          cardTypes: event.card_types || [],
          eventType: event.event_type,
          price: event.entry_fee || 0,
          flyerUrl: event.flyer_url,
          isMultiDay: event.is_multi_day
        })) || [];

        setAllEvents(transformedEvents);

        // Filter my events if user is an organizer
        if (user && profile?.role === 'organizer') {
          const userEvents = transformedEvents.filter(event => 
            eventsData?.find(dbEvent => dbEvent.id === event.id)?.organizer_id === user.id
          );
          setMyEvents(userEvents);
        }

      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user, profile]);

  // Handle navigation state from Hero buttons
  useEffect(() => {
    if (location.state?.showCreateEvent) {
      setShowCreateEvent(true);
    }
    
    if (location.state?.latitude && location.state?.longitude) {
      // You could implement reverse geocoding here to set the location filter
      toast.success("Found your location! Showing nearby events.");
    }

    // Handle payment return URLs
    const urlParams = new URLSearchParams(window.location.search);
    const registration = urlParams.get('registration');
    const eventId = urlParams.get('event');
    
    if (registration === 'success' && eventId) {
      toast.success('Table registration successful! Payment processed.');
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (registration === 'cancelled' && eventId) {
      toast.error('Table registration cancelled. You can try again anytime.');
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [location.state]);

  const cardTypes = ["all", "Pokemon", "MTG", "Sports", "One Piece", "Yu-Gi-Oh"];
  const eventTypes = ["all", "play", "collect"];

  // Filter events based on selected filters
  const getFilteredEvents = (eventsToFilter: any[]) => {
    return eventsToFilter.filter((event) => {
      const matchesSearch = searchQuery === "" || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.city.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCardType = selectedCardType === "all" || 
        event.cardTypes.some((type: string) => type.toLowerCase().includes(selectedCardType.toLowerCase()));
      
      const matchesStates = selectedStates.length === 0 || 
        selectedStates.includes(event.state);
      
      const matchesEventType = selectedEventType === "all" || event.eventType === selectedEventType;
      
      return matchesSearch && matchesCardType && matchesStates && matchesEventType;
    });
  };

  const filteredAllEvents = getFilteredEvents(allEvents);
  const filteredMyEvents = getFilteredEvents(myEvents);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Events
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Find Pokemon, MTG, sports cards, and other trading card events near you.
          </p>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events by name, location, or organizer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === "all" ? "All Events" : type === "play" ? "Play Events" : "Collect Events"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCardType} onValueChange={setSelectedCardType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Card Type" />
              </SelectTrigger>
              <SelectContent>
                {cardTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === "all" ? "All Card Types" : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <div className="flex-1">
                <MultiSelect
                  options={stateOptions}
                  selected={selectedStates}
                  onChange={setSelectedStates}
                  placeholder="Select states..."
                  className="w-full"
                />
              </div>
              <Button variant="outline" onClick={() => setShowAdvancedSearch(true)}>
                Advanced
              </Button>
            </div>

            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Active Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {selectedEventType !== "all" && (
              <Badge variant="secondary" className="gap-2">
                <Filter className="w-3 h-3" />
                {selectedEventType === "play" ? "Play Events" : "Collect Events"}
              </Badge>
            )}
            {selectedCardType !== "all" && (
              <Badge variant="secondary" className="gap-2">
                <Calendar className="w-3 h-3" />
                {selectedCardType}
              </Badge>
            )}
            {selectedStates.length > 0 && (
              selectedStates.map((state) => (
                <Badge key={state} variant="secondary" className="gap-2">
                  <MapPin className="w-3 h-3" />
                  {stateOptions.find(option => option.value === state)?.label || state}
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Role-based content */}
        {profile?.role === 'organizer' ? (
          <Tabs defaultValue="my-events" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-events">My Events</TabsTrigger>
              <TabsTrigger value="all-events">All Events</TabsTrigger>
            </TabsList>
            
            <TabsContent value="my-events" className="mt-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">My Events</h2>
                <Button variant="default" className="gap-2" onClick={() => setShowCreateEvent(true)}>
                  <Plus className="w-4 h-4" />
                  Create Event
                </Button>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                  <div className="col-span-full text-center py-8">Loading your events...</div>
                ) : filteredMyEvents.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No events found. Create your first event!
                  </div>
                ) : (
                  filteredMyEvents.map((event) => (
                    <div key={`my-${event.id}`} className="relative">
                      <EventCard event={event} userType="organizer" isMyEvent={true} />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="all-events" className="mt-6">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                  <div className="col-span-full text-center py-8">Loading events...</div>
                ) : filteredAllEvents.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No events found matching your filters.
                  </div>
                ) : (
                  filteredAllEvents.map((event) => (
                    <EventCard key={event.id} event={event} userType="organizer" isMyEvent={false} />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : profile?.role === 'vendor' ? (
          <Tabs defaultValue="tickets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tickets">Buy Tickets</TabsTrigger>
              <TabsTrigger value="tables">Book Tables</TabsTrigger>
            </TabsList>
            <TabsContent value="tickets" className="mt-6">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                  <div className="col-span-full text-center py-8">Loading events...</div>
                ) : filteredAllEvents.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No events found matching your filters.
                  </div>
                ) : (
                  filteredAllEvents.map((event) => (
                    <EventCard key={event.id} event={event} userType="collector" />
                  ))
                )}
              </div>
            </TabsContent>
            <TabsContent value="tables" className="mt-6">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                  <div className="col-span-full text-center py-8">Loading events...</div>
                ) : filteredAllEvents.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No events found matching your filters.
                  </div>
                ) : (
                  filteredAllEvents.map((event) => (
                    <EventCard key={event.id} event={event} userType="vendor" />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-8">Loading events...</div>
            ) : filteredAllEvents.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No events found matching your filters.
              </div>
            ) : (
              filteredAllEvents.map((event) => (
                <EventCard key={event.id} event={event} userType={profile?.role || "user"} />
              ))
            )}
          </div>
        )}

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Load More Events
          </Button>
        </div>
      </div>

      {/* Advanced Search Modal */}
      <AdvancedSearch 
        isOpen={showAdvancedSearch} 
        onClose={() => setShowAdvancedSearch(false)}
        events={allEvents}
      />

      {/* Create Event Dialog */}
      <CreateEventDialog 
        open={showCreateEvent} 
        onOpenChange={setShowCreateEvent}
      />
    </div>
  );
};

export default Events;