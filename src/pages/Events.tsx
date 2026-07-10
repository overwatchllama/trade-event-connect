import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import Header from "@/components/Header";
import EventCard from "@/components/EventCard";
import SimplifiedEventCard from "@/components/SimplifiedEventCard";
import EventsCalendar from "@/components/EventsCalendar";
import CreateEventDialog from "@/components/CreateEventDialog";
import { VenuesList } from "@/components/VenuesList";
import { EventSponsors } from "@/components/EventSponsors";
import { VendorsList } from "@/components/VendorsList";
import { SponsorsList } from "@/components/SponsorsList";
import { VendorApplicationsList } from "@/components/VendorApplicationsList";
import { VenueApplicationsList } from "@/components/VenueApplicationsList";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Filter, MapPin, Calendar, Plus, Edit, Settings, LayoutGrid, List, CalendarRange, X, Copy, ClipboardList } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import AdvancedSearch from "@/components/AdvancedSearch";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

const Events = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCardTypes, setSelectedCardTypes] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedEventType, setSelectedEventType] = useState("both");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [copyFromEventId, setCopyFromEventId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [eventTimeFilter, setEventTimeFilter] = useState<"upcoming" | "past">("upcoming");
  const [sortBy, setSortBy] = useState<"date" | "location" | "popularity" | "distance">("date");
  const [minTables, setMinTables] = useState("");
  const [thisWeekOnly, setThisWeekOnly] = useState(false);
  const [thisMonthOnly, setThisMonthOnly] = useState(false);
  const [showMyEventsOnly, setShowMyEventsOnly] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [vendingEvents, setVendingEvents] = useState<any[]>([]);
  const [sponsoringEvents, setSponsoringEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationsDialog, setShowApplicationsDialog] = useState(false);
  const [showVenueApplicationsDialog, setShowVenueApplicationsDialog] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { hasRole, isOrganizer, isVendor, isSponsor, isVenue } = useUserRoles();
  const { subscription_tier, subscribed } = useSubscription();

  const isEventUser = subscribed && (subscription_tier === "event_pro" || subscription_tier === "Event Pro");
  const canManageEvents = isOrganizer || isEventUser;
  const canCreateEvents = isOrganizer || isEventUser;

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
        console.log('Fetching events...');
        // Fetch all events with vendor business names
        const { data: eventsData, error } = await supabase
          .from('public_events' as any)
          .select('*')
          .order('created_at', { ascending: false });

        console.log('Events data:', eventsData);
        console.log('Events error:', error);

        if (error) throw error;

        // Fetch vendor info for organizers
        const organizerIds = eventsData?.map(e => e.organizer_id).filter(Boolean) || [];
        const { data: vendorsData } = await supabase
          .from('vendors')
          .select('user_id, business_name')
          .in('user_id', organizerIds);

        const vendorMap = new Map(vendorsData?.map(v => [v.user_id, v.business_name]) || []);

        // Get event days for multi-day events
        const eventIds = eventsData?.map(e => e.id) || [];
        const { data: eventDaysData } = await supabase
          .from('event_days')
          .select('event_id, day_date, start_time, end_time, day_number')
          .in('event_id', eventIds)
          .order('day_number', { ascending: true });

        const eventDaysMap = new Map<string, any[]>();
        eventDaysData?.forEach(day => {
          const days = eventDaysMap.get(day.event_id) || [];
          days.push(day);
          eventDaysMap.set(day.event_id, days);
        });

        // Transform database events to match expected format
        const transformedEvents = eventsData?.map(event => {
          const organizerName = vendorMap.get(event.organizer_id) || event.organizer_name || 'Unknown Organizer';
          
          let dateStr = event.date;
          let timeStr = 'Single day';
          
          if (event.is_multi_day) {
            const days = eventDaysMap.get(event.id) || [];
            if (days.length > 0) {
              const firstDay = days[0];
              const lastDay = days[days.length - 1];
              dateStr = `${new Date(firstDay.day_date).toLocaleDateString()} - ${new Date(lastDay.day_date).toLocaleDateString()}`;
              timeStr = `${firstDay.start_time} - ${lastDay.end_time}`;
            } else {
              dateStr = event.date;
              timeStr = 'Multi-day';
            }
          } else {
            const days = eventDaysMap.get(event.id) || [];
            if (days.length > 0) {
              dateStr = new Date(days[0].day_date).toLocaleDateString();
              timeStr = `${days[0].start_time} - ${days[0].end_time}`;
            }
          }
          
          return {
            id: event.id,
            title: event.title,
            date: dateStr,
            time: timeStr,
            location: event.venue,
            city: event.city,
            state: event.state,
            organizer: organizerName,
            organizer_id: event.organizer_id,
            rating: 4.5,
            attendees: 0,
            maxAttendees: event.max_attendees || 100,
            tablesAvailable: event.tables_available || 0,
            totalTables: event.total_tables || 0,
            cardTypes: event.card_types || [],
            event_type: event.event_type,
            price: event.entry_fee || 0,
            flyerUrl: event.flyer_url,
            isMultiDay: event.is_multi_day
          };
        }) || [];

        console.log('Transformed events:', transformedEvents);
        console.log('User:', user);
        console.log('Profile:', profile);

        setAllEvents(transformedEvents);

        // Filter events by user roles
        if (user) {
          // My events (organizing)
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

    const fetchVendingEvents = async () => {
      if (!user) return;
      
      try {
        const { data: applications } = await supabase
          .from('vendor_applications')
          .select('event_id')
          .eq('user_id', user.id)
          .eq('application_status', 'approved');

        if (!applications || applications.length === 0) return;

        const eventIds = applications.map(app => app.event_id);
        const { data } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds);

        if (data) {
          // Fetch vendor info for organizers
          const organizerIds = data.map(e => e.organizer_id).filter(Boolean);
          const { data: vendorsData } = await supabase
            .from('vendors')
            .select('user_id, business_name')
            .in('user_id', organizerIds);

          const vendorMap = new Map(vendorsData?.map(v => [v.user_id, v.business_name]) || []);

          // Get event days
          const eventIds = data.map(e => e.id);
          const { data: eventDaysData } = await supabase
            .from('event_days')
            .select('event_id, day_date, start_time, end_time, day_number')
            .in('event_id', eventIds)
            .order('day_number', { ascending: true });

          const eventDaysMap = new Map<string, any[]>();
          eventDaysData?.forEach(day => {
            const days = eventDaysMap.get(day.event_id) || [];
            days.push(day);
            eventDaysMap.set(day.event_id, days);
          });

          const events = data.map(event => {
            const organizerName = vendorMap.get(event.organizer_id) || event.organizer_name || 'Unknown Organizer';
            
            let dateStr = event.date;
            let timeStr = 'Single day';
            
            if (event.is_multi_day) {
              const days = eventDaysMap.get(event.id) || [];
              if (days.length > 0) {
                const firstDay = days[0];
                const lastDay = days[days.length - 1];
                dateStr = `${new Date(firstDay.day_date).toLocaleDateString()} - ${new Date(lastDay.day_date).toLocaleDateString()}`;
                timeStr = `${firstDay.start_time} - ${lastDay.end_time}`;
              } else {
                dateStr = event.date;
                timeStr = 'Multi-day';
              }
            } else {
              const days = eventDaysMap.get(event.id) || [];
              if (days.length > 0) {
                dateStr = new Date(days[0].day_date).toLocaleDateString();
                timeStr = `${days[0].start_time} - ${days[0].end_time}`;
              }
            }
            
            return {
              id: event.id,
              title: event.title,
              date: dateStr,
              time: timeStr,
              location: event.venue,
              city: event.city,
              state: event.state,
              organizer: organizerName,
              organizer_id: event.organizer_id,
              rating: 4.5,
              attendees: 0,
              maxAttendees: event.max_attendees || 100,
              tablesAvailable: event.tables_available || 0,
              totalTables: event.total_tables || 0,
              cardTypes: event.card_types || [],
              event_type: event.event_type,
              price: event.entry_fee || 0,
              flyerUrl: event.flyer_url,
              isMultiDay: event.is_multi_day
            };
          });
          setVendingEvents(events);
        }
      } catch (error) {
        console.error('Error fetching vending events:', error);
      }
    };

    const fetchSponsoringEvents = async () => {
      if (!user) return;
      
      try {
        const { data: sponsorData } = await supabase
          .from('sponsors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!sponsorData) return;

        const { data: sponsorships } = await supabase
          .from('event_sponsors')
          .select('event_id')
          .eq('sponsor_id', sponsorData.id);

        if (!sponsorships || sponsorships.length === 0) return;

        const eventIds = sponsorships.map(s => s.event_id);
        const { data } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds);

        if (data) {
          // Fetch vendor info for organizers
          const organizerIds = data.map(e => e.organizer_id).filter(Boolean);
          const { data: vendorsData } = await supabase
            .from('vendors')
            .select('user_id, business_name')
            .in('user_id', organizerIds);

          const vendorMap = new Map(vendorsData?.map(v => [v.user_id, v.business_name]) || []);

          // Get event days
          const eventIds = data.map(e => e.id);
          const { data: eventDaysData } = await supabase
            .from('event_days')
            .select('event_id, day_date, start_time, end_time, day_number')
            .in('event_id', eventIds)
            .order('day_number', { ascending: true });

          const eventDaysMap = new Map<string, any[]>();
          eventDaysData?.forEach(day => {
            const days = eventDaysMap.get(day.event_id) || [];
            days.push(day);
            eventDaysMap.set(day.event_id, days);
          });

          const events = data.map(event => {
            const organizerName = vendorMap.get(event.organizer_id) || event.organizer_name || 'Unknown Organizer';
            
            let dateStr = event.date;
            let timeStr = 'Single day';
            
            if (event.is_multi_day) {
              const days = eventDaysMap.get(event.id) || [];
              if (days.length > 0) {
                const firstDay = days[0];
                const lastDay = days[days.length - 1];
                dateStr = `${new Date(firstDay.day_date).toLocaleDateString()} - ${new Date(lastDay.day_date).toLocaleDateString()}`;
                timeStr = `${firstDay.start_time} - ${lastDay.end_time}`;
              } else {
                dateStr = event.date;
                timeStr = 'Multi-day';
              }
            } else {
              const days = eventDaysMap.get(event.id) || [];
              if (days.length > 0) {
                dateStr = new Date(days[0].day_date).toLocaleDateString();
                timeStr = `${days[0].start_time} - ${days[0].end_time}`;
              }
            }
            
            return {
              id: event.id,
              title: event.title,
              date: dateStr,
              time: timeStr,
              location: event.venue,
              city: event.city,
              state: event.state,
              organizer: organizerName,
              organizer_id: event.organizer_id,
              rating: 4.5,
              attendees: 0,
              maxAttendees: event.max_attendees || 100,
              tablesAvailable: event.tables_available || 0,
              totalTables: event.total_tables || 0,
              cardTypes: event.card_types || [],
              event_type: event.event_type,
              price: event.entry_fee || 0,
              flyerUrl: event.flyer_url,
              isMultiDay: event.is_multi_day
            };
          });
          setSponsoringEvents(events);
        }
      } catch (error) {
        console.error('Error fetching sponsoring events:', error);
      }
    };

    fetchEvents();
    if (user) {
      fetchVendingEvents();
      fetchSponsoringEvents();
    }
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
    const ticket = urlParams.get('ticket');
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
    } else if (ticket === 'success' && eventId) {
      toast.success('Ticket purchase successful! Payment processed.');
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [location.state]);

  // Card type options for multi-select
  const cardTypeOptions: Option[] = [
    { label: "Pokemon", value: "pokemon" },
    { label: "MTG", value: "mtg" },
    { label: "Sports", value: "sports" },
    { label: "One Piece", value: "onepiece" },
    { label: "Yu-Gi-Oh", value: "yugioh" },
    { label: "Lorcana", value: "lorcana" },
  ];

  const eventTypes = ["both", "play", "show"];

  // Helper to check if event is in the past
  const isEventPast = (event: any): boolean => {
    const dateStr = event.date;
    // Handle date ranges like "12/15/2024 - 12/17/2024"
    const dateParts = dateStr.split(' - ');
    const lastDateStr = dateParts[dateParts.length - 1];
    
    // Try to parse the date
    const eventDate = new Date(lastDateStr);
    if (isNaN(eventDate.getTime())) {
      // If parsing fails, try alternative formats
      return false;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(23, 59, 59, 999);
    
    return eventDate < today;
  };

  // Check if event is within this week (next 7 days)
  const isEventThisWeek = (event: any): boolean => {
    const dateStr = event.date;
    const dateParts = dateStr.split(' - ');
    const firstDateStr = dateParts[0];
    const eventDate = new Date(firstDateStr);
    if (isNaN(eventDate.getTime())) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    weekFromNow.setHours(23, 59, 59, 999);
    
    return eventDate >= today && eventDate <= weekFromNow;
  };

  const isEventThisMonth = (event: any): boolean => {
    const dateStr = event.date;
    const dateParts = dateStr.split(' - ');
    const firstDateStr = dateParts[0];
    const eventDate = new Date(firstDateStr);
    if (isNaN(eventDate.getTime())) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthFromNow = new Date(today);
    monthFromNow.setDate(monthFromNow.getDate() + 30);
    monthFromNow.setHours(23, 59, 59, 999);
    
    return eventDate >= today && eventDate <= monthFromNow;
  };

  // Check if event falls within date range
  const isEventInDateRange = (event: any): boolean => {
    if (!dateRange.from && !dateRange.to) return true;
    
    const dateStr = event.date;
    const dateParts = dateStr.split(' - ');
    const firstDateStr = dateParts[0];
    const eventDate = new Date(firstDateStr);
    if (isNaN(eventDate.getTime())) return true;
    
    eventDate.setHours(0, 0, 0, 0);
    
    if (dateRange.from && dateRange.to) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      return eventDate >= from && eventDate <= to;
    } else if (dateRange.from) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      return eventDate >= from;
    } else if (dateRange.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      return eventDate <= to;
    }
    return true;
  };

  // Filter events based on selected filters
  const getFilteredEvents = (eventsToFilter: any[]) => {
    return eventsToFilter.filter((event) => {
      const matchesSearch = searchQuery === "" || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.city.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCardType = selectedCardTypes.length === 0 || 
        event.cardTypes.some((type: string) => 
          selectedCardTypes.some(selected => type.toLowerCase().includes(selected.toLowerCase()))
        );
      
      const matchesStates = selectedStates.length === 0 || 
        selectedStates.includes(event.state);
      
      const matchesEventType = selectedEventType === "both" || event.event_type === selectedEventType;

      const matchesTables = !minTables || (event.tablesAvailable >= parseInt(minTables));
      
      // Filter by upcoming/past (only if no date range is set)
      const isPast = isEventPast(event);
      const hasDateRange = dateRange.from || dateRange.to;
      const matchesTimeFilter = hasDateRange ? true : (eventTimeFilter === "past" ? isPast : !isPast);
      
      // Filter by this week/month if enabled (disabled when date range is set)
      const matchesThisWeek = hasDateRange ? true : (!thisWeekOnly || isEventThisWeek(event));
      const matchesThisMonth = hasDateRange ? true : (!thisMonthOnly || isEventThisMonth(event));
      
      // Filter by date range
      const matchesDateRange = isEventInDateRange(event);
      
      return matchesSearch && matchesCardType && matchesStates && matchesEventType && matchesTables && matchesTimeFilter && matchesThisWeek && matchesThisMonth && matchesDateRange;
    });
  };

  // Simple proximity score: 0 = same city+state, 1 = same state, 2 = other
  const getProximity = (event: any) => {
    const userCity = (profile?.location_city || '').toLowerCase().trim();
    const userState = (profile?.location_state || '').toLowerCase().trim();
    if (!userCity && !userState) return 2;
    const eCity = (event.city || '').toLowerCase().trim();
    const eState = (event.state || '').toLowerCase().trim();
    if (eState === userState && eCity === userCity) return 0;
    if (eState === userState) return 1;
    return 2;
  };

  // Sort events based on selected sort option
  const sortEvents = (eventsToSort: any[]) => {
    return [...eventsToSort].sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.date.split(' - ')[0]);
        const dateB = new Date(b.date.split(' - ')[0]);
        return eventTimeFilter === "upcoming" 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      } else if (sortBy === "location") {
        const locA = `${a.state}, ${a.city}`.toLowerCase();
        const locB = `${b.state}, ${b.city}`.toLowerCase();
        return locA.localeCompare(locB);
      } else if (sortBy === "popularity") {
        const popA = (a.max_attendees || 0);
        const popB = (b.max_attendees || 0);
        return popB - popA;
      } else if (sortBy === "distance") {
        return getProximity(a) - getProximity(b);
      }
      return 0;
    });
  };

  const filteredAllEvents = sortEvents(getFilteredEvents(showMyEventsOnly ? myEvents : allEvents));
  const filteredMyEvents = sortEvents(getFilteredEvents(myEvents));

  // Calculate event counts for badges (without thisWeekOnly filter to show accurate counts)
  const getBaseFilteredEvents = (eventsToFilter: any[]) => {
    return eventsToFilter.filter((event) => {
      const matchesSearch = searchQuery === "" || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCardType = selectedCardTypes.length === 0 || 
        event.cardTypes.some((type: string) => 
          selectedCardTypes.some(selected => type.toLowerCase().includes(selected.toLowerCase()))
        );
      const matchesStates = selectedStates.length === 0 || selectedStates.includes(event.state);
      const matchesEventType = selectedEventType === "both" || event.event_type === selectedEventType;
      return matchesSearch && matchesCardType && matchesStates && matchesEventType;
    });
  };

  const baseFilteredEvents = getBaseFilteredEvents(allEvents);
  const upcomingCount = baseFilteredEvents.filter(e => !isEventPast(e)).length;
  const pastCount = baseFilteredEvents.filter(e => isEventPast(e)).length;
  const thisWeekCount = baseFilteredEvents.filter(e => !isEventPast(e) && isEventThisWeek(e)).length;
  const thisMonthCount = baseFilteredEvents.filter(e => !isEventPast(e) && isEventThisMonth(e)).length;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Trading Card Events Near You | Collector Companion</title>
        <meta name="description" content="Browse upcoming trading card shows, tournaments, and conventions. Filter by state, date, and TCG to find your next event." />
        <link rel="canonical" href="https://www.collectorcompanion.com/events" />
        <meta property="og:title" content="Trading Card Events Near You | Collector Companion" />
        <meta property="og:description" content="Browse upcoming trading card shows, tournaments, and conventions. Filter by state, date, and TCG to find your next event." />
        <meta property="og:url" content="https://www.collectorcompanion.com/events" />
      </Helmet>
      <Header />
      
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-1 md:mb-2">
                Events
              </h1>
              <p className="text-sm md:text-lg text-muted-foreground">
                Find trading card events near you.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canCreateEvents && (
                <Button
                  onClick={() => setShowCreateEvent(true)}
                  variant="default"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Event
                </Button>
              )}
              {myEvents.length > 0 && (
                <Button
                  variant={showMyEventsOnly ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowMyEventsOnly(!showMyEventsOnly)}
                >
                  <Settings className="w-4 h-4" />
                  {showMyEventsOnly ? "All Events" : "Manage"}
                </Button>
              )}
              {isVendor && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowApplicationsDialog(true)}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span className="hidden sm:inline">My Applications</span>
                  <span className="sm:hidden">Apps</span>
                </Button>
              )}
              {isVenue && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowVenueApplicationsDialog(true)}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span className="hidden sm:inline">Venue Applications</span>
                  <span className="sm:hidden">Venue Apps</span>
                </Button>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
            {/* Main Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-muted-foreground" />
              <Input
                placeholder="Search for Events"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 md:pl-12 h-10 md:h-12 text-sm md:text-lg"
              />
            </div>

            {/* Quick Filters and View Toggle */}
            <div className="flex flex-col gap-2 md:gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {/* Upcoming/Past Tabs */}
                <div className="flex gap-1 border rounded-md p-1 overflow-x-auto scrollbar-hide">
                  <Button
                    variant={eventTimeFilter === "upcoming" && !thisWeekOnly && !thisMonthOnly && !dateRange.from && !dateRange.to ? "default" : "ghost"}
                    size="sm"
                    onClick={() => { setEventTimeFilter("upcoming"); setThisWeekOnly(false); setThisMonthOnly(false); setDateRange({ from: undefined, to: undefined }); }}
                    className="gap-1.5"
                  >
                    Upcoming
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{upcomingCount}</Badge>
                  </Button>
                  <Button
                    variant={eventTimeFilter === "past" && !dateRange.from && !dateRange.to ? "default" : "ghost"}
                    size="sm"
                    onClick={() => { setEventTimeFilter("past"); setThisWeekOnly(false); setThisMonthOnly(false); setDateRange({ from: undefined, to: undefined }); }}
                    className="gap-1.5"
                  >
                    Past
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{pastCount}</Badge>
                  </Button>
                  <Button
                    variant={thisWeekOnly && !dateRange.from && !dateRange.to ? "default" : "ghost"}
                    size="sm"
                    onClick={() => { setThisWeekOnly(!thisWeekOnly); setThisMonthOnly(false); setEventTimeFilter("upcoming"); setDateRange({ from: undefined, to: undefined }); }}
                    className="gap-1.5"
                  >
                    This Week
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{thisWeekCount}</Badge>
                  </Button>
                  <Button
                    variant={thisMonthOnly && !dateRange.from && !dateRange.to ? "default" : "ghost"}
                    size="sm"
                    onClick={() => { setThisMonthOnly(!thisMonthOnly); setThisWeekOnly(false); setEventTimeFilter("upcoming"); setDateRange({ from: undefined, to: undefined }); }}
                    className="gap-1.5"
                  >
                    This Month
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{thisMonthCount}</Badge>
                  </Button>
                </div>

                <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type === "both" ? "Both" : type === "play" ? "Play" : "Show"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="w-full sm:w-48">
                  <MultiSelect
                    options={stateOptions}
                    selected={selectedStates}
                    onChange={setSelectedStates}
                    placeholder="All States"
                    className="w-full"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <MultiSelect
                    options={cardTypeOptions}
                    selected={selectedCardTypes}
                    onChange={setSelectedCardTypes}
                    placeholder="Card Type"
                    className="w-full"
                  />
                </div>

                <Input
                  type="number"
                  min={0}
                  placeholder="Min Tables"
                  value={minTables}
                  onChange={(e) => setMinTables(e.target.value)}
                  className="w-full sm:w-28 h-9"
                />

                <Select value={sortBy} onValueChange={(value: "date" | "location" | "popularity" | "distance") => setSortBy(value)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="location">Sort by Location</SelectItem>
                    <SelectItem value="popularity">Sort by Popularity</SelectItem>
                    <SelectItem value="distance">Sort by Distance</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Range Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={dateRange.from || dateRange.to ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "gap-2 h-9",
                        !(dateRange.from || dateRange.to) && "text-muted-foreground"
                      )}
                    >
                      <CalendarRange className="w-4 h-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        "Date Range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                    {(dateRange.from || dateRange.to) && (
                      <div className="p-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => setDateRange({ from: undefined, to: undefined })}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear Date Range
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="gap-1"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="gap-1"
                >
                  <List className="w-4 h-4" />
                  List
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedEventType !== "both" || selectedCardTypes.length > 0 || selectedStates.length > 0 || dateRange.from || dateRange.to || searchQuery || thisWeekOnly || thisMonthOnly || showMyEventsOnly || minTables) && (
            <div className="flex gap-2 mb-6 flex-wrap items-center">
              {showMyEventsOnly && (
                <Badge variant="default" className="gap-2 cursor-pointer" onClick={() => setShowMyEventsOnly(false)}>
                  <Settings className="w-3 h-3" />
                  My Events Only
                  <X className="w-3 h-3" />
                </Badge>
              )}
              {selectedEventType !== "both" && (
                <Badge variant="secondary" className="gap-2">
                  <Filter className="w-3 h-3" />
                  {selectedEventType === "play" ? "Play Events" : "Show Events"}
                </Badge>
              )}
              {selectedCardTypes.length > 0 && (
                selectedCardTypes.map((cardType) => (
                  <Badge key={cardType} variant="secondary" className="gap-2">
                    <Calendar className="w-3 h-3" />
                    {cardTypeOptions.find(option => option.value === cardType)?.label || cardType}
                  </Badge>
                ))
              )}
              {selectedStates.length > 0 && (
                selectedStates.map((state) => (
                  <Badge key={state} variant="secondary" className="gap-2">
                    <MapPin className="w-3 h-3" />
                    {stateOptions.find(option => option.value === state)?.label || state}
                  </Badge>
                ))
              )}
              {(dateRange.from || dateRange.to) && (
                <Badge variant="secondary" className="gap-2 cursor-pointer" onClick={() => setDateRange({ from: undefined, to: undefined })}>
                  <CalendarRange className="w-3 h-3" />
                  {dateRange.from && dateRange.to 
                    ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`
                    : dateRange.from 
                      ? `From ${format(dateRange.from, "MMM d")}`
                      : `Until ${format(dateRange.to!, "MMM d")}`
                  }
                  <X className="w-3 h-3" />
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-2">
                  <Search className="w-3 h-3" />
                  "{searchQuery}"
                </Badge>
              )}
              {thisWeekOnly && (
                <Badge variant="secondary" className="gap-2">
                  <Calendar className="w-3 h-3" />
                  This Week
                </Badge>
              )}
              {thisMonthOnly && (
                <Badge variant="secondary" className="gap-2">
                  <Calendar className="w-3 h-3" />
                  This Month
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-1"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCardTypes([]);
                  setSelectedStates([]);
                  setSelectedEventType("both");
                  setThisWeekOnly(false);
                  setThisMonthOnly(false);
                  setShowMyEventsOnly(false);
                  setDateRange({ from: undefined, to: undefined });
                  setMinTables("");
                  setEventTimeFilter("upcoming");
                }}
              >
                <X className="w-3 h-3" />
                Clear All
              </Button>
            </div>
          )}
        </div>

        {/* Role-based tabs */}
        {user && (isOrganizer || isVendor || isSponsor) ? (
          <Tabs defaultValue="events" className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${
              (isOrganizer && myEvents.length > 0 ? 1 : 0) +
              (isVendor && vendingEvents.length > 0 ? 1 : 0) +
              (isSponsor && sponsoringEvents.length > 0 ? 1 : 0) +
              (isOrganizer ? 2 : 0) + // Vendor List and Sponsor List tabs for organizers
              1
            }, minmax(0, 1fr))` }}>
              <TabsTrigger value="events">Events</TabsTrigger>
              {isOrganizer && myEvents.length > 0 && (
                <TabsTrigger value="manage-events">Manage Events</TabsTrigger>
              )}
              {isVendor && vendingEvents.length > 0 && (
                <TabsTrigger value="vending">Vending</TabsTrigger>
              )}
              {isSponsor && sponsoringEvents.length > 0 && (
                <TabsTrigger value="sponsorships">Manage Sponsorships</TabsTrigger>
              )}
              {isOrganizer && (
                <>
                  <TabsTrigger value="vendor-list">Vendor List</TabsTrigger>
                  <TabsTrigger value="sponsor-list">Sponsor List</TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Events Tab - Browse all events */}
            <TabsContent value="events" className="mt-6">
              <div className={viewMode === "grid" ? "grid md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
                {loading ? (
                  <div className="col-span-full text-center py-8">Loading events...</div>
                ) : filteredAllEvents.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No events found matching your filters.
                  </div>
                ) : (
                  filteredAllEvents.map((event) => 
                    viewMode === "grid" ? (
                      <SimplifiedEventCard key={event.id} event={event} />
                    ) : (
                      <EventCard key={event.id} event={event} userType="collector" isMyEvent={false} />
                    )
                  )
                )}
              </div>
            </TabsContent>

            {/* Manage Events Tab - For organizers */}
            {isOrganizer && myEvents.length > 0 && (
              <TabsContent value="manage-events" className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-foreground">My Events</h2>
                  <div className="flex gap-2">
                    {myEvents.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            <Copy className="w-4 h-4" />
                            Copy Event
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                          <DropdownMenuLabel>Select event to copy</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {myEvents.map((event) => (
                            <DropdownMenuItem
                              key={event.id}
                              onClick={() => {
                                setCopyFromEventId(event.id);
                                setShowCreateEvent(true);
                              }}
                              className="flex flex-col items-start gap-1"
                            >
                              <span className="font-medium truncate w-full">{event.title}</span>
                              <span className="text-xs text-muted-foreground">{event.date}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button variant="default" className="gap-2" onClick={() => setShowCreateEvent(true)}>
                      <Plus className="w-4 h-4" />
                      Create Event
                    </Button>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredMyEvents.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      No events found. Create your first event!
                    </div>
                  ) : (
                    filteredMyEvents.map((event) => (
                      <div key={`my-${event.id}`} className="relative">
                        <EventCard 
                          event={event} 
                          userType="organizer" 
                          isMyEvent={true} 
                          onCopyEvent={(eventId) => {
                            setCopyFromEventId(eventId);
                            setShowCreateEvent(true);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 gap-1"
                          onClick={() => navigate(`/event/${event.id}/manage`)}
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            )}

            {/* Vending Tab - For vendors */}
            {isVendor && vendingEvents.length > 0 && (
              <TabsContent value="vending" className="mt-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground mb-2">My Vending Events</h2>
                  <p className="text-muted-foreground">Events where you have approved vendor tables</p>
                </div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {vendingEvents.map((event) => (
                    <EventCard key={`vending-${event.id}`} event={event} userType="vendor" isMyEvent={false} />
                  ))}
                </div>
              </TabsContent>
            )}

            {/* Sponsorships Tab - For sponsors */}
            {isSponsor && sponsoringEvents.length > 0 && (
              <TabsContent value="sponsorships" className="mt-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground mb-2">My Sponsorships</h2>
                  <p className="text-muted-foreground">Events you are sponsoring</p>
                </div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {sponsoringEvents.map((event) => (
                    <EventCard key={`sponsor-${event.id}`} event={event} userType="organizer" isMyEvent={false} />
                  ))}
                </div>
              </TabsContent>
            )}

            {/* Vendor List Tab - For organizers */}
            {isOrganizer && (
              <TabsContent value="vendor-list" className="mt-6">
                <VendorsList />
              </TabsContent>
            )}

            {/* Sponsor List Tab - For organizers */}
            {isOrganizer && (
              <TabsContent value="sponsor-list" className="mt-6">
                <SponsorsList />
              </TabsContent>
            )}
          </Tabs>
        ) : (
          /* No role tabs - show all events */
          <div className={viewMode === "grid" ? "grid md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
            {loading ? (
              <div className="col-span-full text-center py-8">Loading events...</div>
            ) : filteredAllEvents.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No events found matching your filters.
              </div>
            ) : (
              filteredAllEvents.map((event) => 
                viewMode === "grid" ? (
                  <SimplifiedEventCard key={event.id} event={event} />
                ) : (
                  <EventCard key={event.id} event={event} userType="collector" isMyEvent={false} />
                )
              )
            )}
          </div>
        )}
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
        onOpenChange={(open) => {
          setShowCreateEvent(open);
          if (!open) setCopyFromEventId(undefined);
        }}
        copyFromEventId={copyFromEventId}
      />

      {/* Vendor Applications Dialog */}
      <Dialog open={showApplicationsDialog} onOpenChange={setShowApplicationsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>My Vendor Applications</DialogTitle>
          </DialogHeader>
          <VendorApplicationsList />
        </DialogContent>
      </Dialog>

      {/* Venue Applications Dialog */}
      <Dialog open={showVenueApplicationsDialog} onOpenChange={setShowVenueApplicationsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Venue Event Applications</DialogTitle>
          </DialogHeader>
          <VenueApplicationsList />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Events;