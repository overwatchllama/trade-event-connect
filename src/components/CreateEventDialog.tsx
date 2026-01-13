import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, MapPin, Users, DollarSign, Clock, Upload, X, Plus, ChevronDown, ChevronRight, Copy, Save, Trash2 } from 'lucide-react';
import DraggableEventDays from './DraggableEventDays';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copyFromEventId?: string;
}

interface SavedLocation {
  id: string;
  name: string;
  venue: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

const CreateEventDialog = ({ open, onOpenChange, copyFromEventId }: CreateEventDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCardTypes, setSelectedCardTypes] = useState<string[]>([]);
  
  // Collapsible section states
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [locationOpen, setLocationOpen] = useState(true);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);
  
  // Location management
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [showSaveLocationDialog, setShowSaveLocationDialog] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  const cardTypeOptions: Option[] = [
    { label: 'Pokemon', value: 'pokemon' },
    { label: 'Magic: The Gathering', value: 'mtg' },
    { label: 'Yu-Gi-Oh!', value: 'yugioh' },
    { label: 'Dragon Ball Super', value: 'dragonball' },
    { label: 'One Piece', value: 'onepiece' },
    { label: 'Digimon', value: 'digimon' },
    { label: 'Sports Cards', value: 'sports' },
    { label: 'Marvel', value: 'marvel' },
    { label: 'DC Comics', value: 'dc' },
    { label: 'Final Fantasy', value: 'finalfantasy' },
    { label: 'Weiss Schwarz', value: 'weiss' },
    { label: 'Flesh and Blood', value: 'fab' },
    { label: 'Lorcana', value: 'lorcana' },
    { label: 'Star Wars', value: 'starwars' }
  ];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    venue: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    eventType: '',
    maxAttendees: '',
    entryFee: '',
    agePricingInfo: '',
    vendorTablePrice: '',
    totalTables: '',
    contactEmail: '',
    contactPhone: '',
    preferredContactMethod: '',
    vendorStartTime: '',
    vendorNotes: ''
  });

  const [isMultiDay, setIsMultiDay] = useState(false);
  const [noOnlineTicketSales, setNoOnlineTicketSales] = useState(true); // Default ON
  const [noOnlineTableSales, setNoOnlineTableSales] = useState(false);
  const [eventDays, setEventDays] = useState([
    { date: '', startTime: '', endTime: '', dayNumber: 1, ticketCost: '' }
  ]);
  const [sponsorTiers, setSponsorTiers] = useState([
    { tier: '', cost: '', slots: '', unlimitedSlots: false, description: '' }
  ]);
  const [noSponsors, setNoSponsors] = useState(false);
  const [socialMediaLinks, setSocialMediaLinks] = useState([
    { platform: '', url: '' }
  ]);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);
  const [floorPlanPreview, setFloorPlanPreview] = useState<string | null>(null);

  // Load saved locations and venues
  useEffect(() => {
    if (open && user) {
      loadSavedLocations();
      loadVenues();
    }
  }, [open, user]);

  // Copy event data if copyFromEventId is provided
  useEffect(() => {
    if (open && copyFromEventId) {
      loadEventToCopy(copyFromEventId);
    }
  }, [open, copyFromEventId]);

  const loadSavedLocations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('organizer_saved_locations')
      .select('*')
      .eq('organizer_id', user.id)
      .order('name');
    if (data) setSavedLocations(data);
  };

  const loadVenues = async () => {
    const { data } = await supabase
      .from('venues')
      .select('id, name, address, city, state, zip_code')
      .order('name');
    if (data) setVenues(data);
  };

  const loadEventToCopy = async (eventId: string) => {
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (event) {
      setFormData({
        title: event.title + ' (Copy)',
        description: event.description || '',
        date: '',
        venue: event.venue,
        address: event.address,
        city: event.city,
        state: event.state,
        zipCode: event.zip_code,
        eventType: event.event_type,
        maxAttendees: event.max_attendees?.toString() || '',
        entryFee: event.entry_fee?.toString() || '',
        agePricingInfo: event.age_pricing_info || '',
        vendorTablePrice: event.vendor_table_price?.toString() || '',
        totalTables: event.total_tables?.toString() || '',
        contactEmail: event.contact_email || '',
        contactPhone: event.contact_phone || '',
        preferredContactMethod: event.preferred_contact_method || '',
        vendorStartTime: (event as any).vendor_start_time || '',
        vendorNotes: event.vendor_notes || ''
      });
      setSelectedCardTypes(event.card_types || []);
      setIsMultiDay(event.is_multi_day);
      setNoOnlineTicketSales(event.no_online_ticket_sales || true);
      setNoOnlineTableSales(event.no_online_table_sales || false);
      setNoSponsors(event.no_sponsors || false);

      // Load sponsor tiers
      if (event.sponsor_tiers) {
        try {
          const tiers = typeof event.sponsor_tiers === 'string' 
            ? JSON.parse(event.sponsor_tiers) 
            : event.sponsor_tiers;
          if (Array.isArray(tiers) && tiers.length > 0) {
            setSponsorTiers(tiers.map((t: any) => ({
              tier: t.tier || '',
              cost: t.cost?.toString() || '',
              slots: t.slots?.toString() || '',
              unlimitedSlots: t.slots === null,
              description: t.description || ''
            })));
          }
        } catch (e) {
          console.error('Error parsing sponsor tiers:', e);
        }
      }

      toast.success('Event data copied! Update the dates and submit.');
    }
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId);
    
    if (locationId.startsWith('saved-')) {
      const savedId = locationId.replace('saved-', '');
      const location = savedLocations.find(l => l.id === savedId);
      if (location) {
        setFormData(prev => ({
          ...prev,
          venue: location.venue,
          address: location.address,
          city: location.city,
          state: location.state,
          zipCode: location.zip_code
        }));
      }
    } else if (locationId.startsWith('venue-')) {
      const venueId = locationId.replace('venue-', '');
      const venue = venues.find(v => v.id === venueId);
      if (venue) {
        setFormData(prev => ({
          ...prev,
          venue: venue.name,
          address: venue.address,
          city: venue.city,
          state: venue.state,
          zipCode: venue.zip_code
        }));
      }
    } else if (locationId === 'manual') {
      // Clear for manual entry
      setFormData(prev => ({
        ...prev,
        venue: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
      }));
    }
  };

  const saveCurrentLocation = async () => {
    if (!user || !newLocationName.trim()) return;
    
    const { error } = await supabase
      .from('organizer_saved_locations')
      .insert({
        organizer_id: user.id,
        name: newLocationName.trim(),
        venue: formData.venue,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode
      });

    if (error) {
      toast.error('Failed to save location');
    } else {
      toast.success('Location saved!');
      setShowSaveLocationDialog(false);
      setNewLocationName('');
      loadSavedLocations();
    }
  };

  const deleteSavedLocation = async (locationId: string) => {
    const { error } = await supabase
      .from('organizer_saved_locations')
      .delete()
      .eq('id', locationId);

    if (error) {
      toast.error('Failed to delete location');
    } else {
      toast.success('Location deleted');
      loadSavedLocations();
      if (selectedLocationId === `saved-${locationId}`) {
        setSelectedLocationId('');
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFlyerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFlyerFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setFlyerPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeFlyerPreview = () => {
    setFlyerFile(null);
    setFlyerPreview(null);
  };

  const handleFloorPlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFloorPlanFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setFloorPlanPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeFloorPlanPreview = () => {
    setFloorPlanFile(null);
    setFloorPlanPreview(null);
  };

  // Event day functions moved to DraggableEventDays component

  const addSponsorTier = () => {
    setSponsorTiers(prev => [...prev, { tier: '', cost: '', slots: '', unlimitedSlots: false, description: '' }]);
  };

  const removeSponsorTier = (index: number) => {
    if (sponsorTiers.length > 1) {
      setSponsorTiers(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSponsorTier = (index: number, field: string, value: string | boolean) => {
    setSponsorTiers(prev => prev.map((tier, i) => 
      i === index ? { ...tier, [field]: value } : tier
    ));
  };

  const addSocialMediaLink = () => {
    setSocialMediaLinks(prev => [...prev, { platform: '', url: '' }]);
  };

  const removeSocialMediaLink = (index: number) => {
    if (socialMediaLinks.length > 1) {
      setSocialMediaLinks(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSocialMediaLink = (index: number, field: string, value: string) => {
    setSocialMediaLinks(prev => prev.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to create an event');
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const organizer_name = profile?.full_name || user.email || 'Unknown Organizer';

      let flyerUrl = null;
      let floorPlanUrl = null;
      
      if (flyerFile) {
        const fileExt = flyerFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-flyers')
          .upload(filePath, flyerFile);

        if (uploadError) {
          toast.error('Failed to upload flyer');
          return;
        }

        const { data: urlData } = supabase.storage
          .from('event-flyers')
          .getPublicUrl(filePath);
        
        flyerUrl = urlData.publicUrl;
      }

      if (floorPlanFile) {
        const fileExt = floorPlanFile.name.split('.').pop();
        const fileName = `floor-plan-${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-flyers')
          .upload(filePath, floorPlanFile);

        if (uploadError) {
          toast.error('Failed to upload floor plan');
          return;
        }

        const { data: urlData } = supabase.storage
          .from('event-flyers')
          .getPublicUrl(filePath);
        
        floorPlanUrl = urlData.publicUrl;
      }

      const { data: eventData, error } = await supabase
        .from('events')
        .insert({
          title: formData.title,
          description: formData.description,
          date: isMultiDay ? 'Multi-day event' : eventDays[0].date,
          venue: formData.venue,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          event_type: formData.eventType,
          card_types: selectedCardTypes,
          max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
          entry_fee: formData.entryFee ? parseFloat(formData.entryFee) : null,
          age_pricing_info: formData.agePricingInfo || null,
          vendor_table_price: formData.vendorTablePrice ? parseFloat(formData.vendorTablePrice) : null,
          total_tables: formData.totalTables ? parseInt(formData.totalTables) : null,
          tables_available: formData.totalTables ? parseInt(formData.totalTables) : null,
          organizer_id: user.id,
          organizer_name: organizer_name,
          is_multi_day: isMultiDay,
          no_online_ticket_sales: noOnlineTicketSales,
          no_online_table_sales: noOnlineTableSales,
          no_sponsors: noSponsors,
          flyer_url: flyerUrl,
          floor_plan_url: floorPlanUrl,
          vendor_start_time: formData.vendorStartTime || null,
          vendor_notes: formData.vendorNotes || null,
          sponsor_tiers: sponsorTiers.some(t => t.tier && t.cost)
            ? JSON.stringify(sponsorTiers
                .filter(t => t.tier && t.cost)
                .map(t => ({
                  tier: t.tier,
                  cost: t.cost,
                  slots: t.unlimitedSlots ? null : (t.slots ? parseInt(t.slots) : null),
                  description: t.description || ''
                }))
              )
            : null,
          sponsor_tier_slots: null,
          contact_email: formData.contactEmail || null,
          contact_phone: formData.contactPhone || null,
          preferred_contact_method: formData.preferredContactMethod || null
        })
        .select()
        .single();

      if (error) throw error;

      if (eventData && socialMediaLinks.some(link => link.platform && link.url)) {
        const socialMediaData = socialMediaLinks
          .filter(link => link.platform && link.url)
          .map(link => ({
            event_id: eventData.id,
            platform: link.platform,
            url: link.url
          }));

        await supabase.from('event_social_media').insert(socialMediaData);
      }

      if (eventData) {
        const eventDaysData = eventDays.map((day, index) => ({
          event_id: eventData.id,
          day_number: index + 1,
          day_date: day.date,
          start_time: day.startTime,
          end_time: day.endTime,
          ticket_cost: day.ticketCost ? parseFloat(day.ticketCost) : null
        }));

        await supabase.from('event_days').insert(eventDaysData);
      }
      
      toast.success('Event created successfully!');
      onOpenChange(false);
      resetForm();
      window.location.reload();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      venue: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      eventType: '',
      maxAttendees: '',
      entryFee: '',
      agePricingInfo: '',
      vendorTablePrice: '',
      totalTables: '',
      contactEmail: '',
      contactPhone: '',
      preferredContactMethod: '',
      vendorStartTime: '',
      vendorNotes: ''
    });
    setSelectedCardTypes([]);
    setIsMultiDay(false);
    setNoOnlineTicketSales(true);
    setNoOnlineTableSales(false);
    setEventDays([{ date: '', startTime: '', endTime: '', dayNumber: 1, ticketCost: '' }]);
    setSponsorTiers([{ tier: '', cost: '', slots: '', unlimitedSlots: false, description: '' }]);
    setNoSponsors(false);
    setSocialMediaLinks([{ platform: '', url: '' }]);
    setFlyerFile(null);
    setFlyerPreview(null);
    setFloorPlanFile(null);
    setFloorPlanPreview(null);
    setSelectedLocationId('');
  };

  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    isOpen, 
    onToggle 
  }: { 
    title: string; 
    icon: any; 
    isOpen: boolean; 
    onToggle: () => void 
  }) => (
    <CollapsibleTrigger 
      onClick={onToggle}
      className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="font-semibold">{title}</span>
      </div>
      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </CollapsibleTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {copyFromEventId ? 'Copy Event' : 'Create New Event'}
          </DialogTitle>
          <DialogDescription>
            List your trading card event and connect with collectors and vendors.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <Collapsible open={basicInfoOpen} onOpenChange={setBasicInfoOpen}>
            <SectionHeader 
              title="Basic Information" 
              icon={Calendar} 
              isOpen={basicInfoOpen} 
              onToggle={() => setBasicInfoOpen(!basicInfoOpen)} 
            />
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Pokemon Regional Tournament"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your event, rules, prizes, etc."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="multi-day" checked={isMultiDay} onCheckedChange={setIsMultiDay} />
                <Label htmlFor="multi-day">Multi-day event</Label>
              </div>

              {/* Event Days - Draggable */}
              <DraggableEventDays 
                eventDays={eventDays} 
                setEventDays={setEventDays} 
                isMultiDay={isMultiDay} 
              />

              {/* Minimized File Uploads */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Event Flyer</Label>
                  {flyerPreview ? (
                    <div className="relative h-20 border rounded overflow-hidden">
                      <img src={flyerPreview} alt="Flyer" className="w-full h-full object-cover" />
                      <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={removeFlyerPreview}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded p-2 text-center">
                      <Input type="file" accept="image/*" onChange={handleFlyerUpload} className="text-xs" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Floor Plan</Label>
                  {floorPlanPreview ? (
                    <div className="relative h-20 border rounded overflow-hidden">
                      <img src={floorPlanPreview} alt="Floor Plan" className="w-full h-full object-cover" />
                      <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={removeFloorPlanPreview}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded p-2 text-center">
                      <Input type="file" accept="image/*" onChange={handleFloorPlanUpload} className="text-xs" />
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Location */}
          <Collapsible open={locationOpen} onOpenChange={setLocationOpen}>
            <SectionHeader 
              title="Location" 
              icon={MapPin} 
              isOpen={locationOpen} 
              onToggle={() => setLocationOpen(!locationOpen)} 
            />
            <CollapsibleContent className="pt-4 space-y-4">
              {/* Location Selector */}
              <div className="space-y-2">
                <Label>Select Location</Label>
                <Select value={selectedLocationId} onValueChange={handleLocationSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a saved location or enter manually" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Enter Manually</SelectItem>
                    {savedLocations.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">My Saved Locations</div>
                        {savedLocations.map(loc => (
                          <SelectItem key={`saved-${loc.id}`} value={`saved-${loc.id}`}>
                            {loc.name} - {loc.city}, {loc.state}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {venues.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Venues Database</div>
                        {venues.map(venue => (
                          <SelectItem key={`venue-${venue.id}`} value={`venue-${venue.id}`}>
                            {venue.name} - {venue.city}, {venue.state}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Manage saved locations */}
              {savedLocations.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {savedLocations.map(loc => (
                    <div key={loc.id} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                      <span>{loc.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-4 w-4" onClick={() => deleteSavedLocation(loc.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="venue">Venue Name</Label>
                <Input id="venue" placeholder="e.g., Convention Center" value={formData.venue} onChange={(e) => handleInputChange('venue', e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" placeholder="123 Main Street" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} required />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="city" className="text-xs">City</Label>
                  <Input id="city" placeholder="Los Angeles" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="state" className="text-xs">State</Label>
                  <Input id="state" placeholder="CA" value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="zipCode" className="text-xs">ZIP</Label>
                  <Input id="zipCode" placeholder="90210" value={formData.zipCode} onChange={(e) => handleInputChange('zipCode', e.target.value)} required />
                </div>
              </div>

              {/* Save location button */}
              {formData.venue && formData.address && formData.city && !showSaveLocationDialog && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowSaveLocationDialog(true)} className="gap-1">
                  <Save className="w-3 h-3" /> Save this location
                </Button>
              )}

              {showSaveLocationDialog && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Location Name</Label>
                    <Input placeholder="e.g., Downtown Convention Center" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} />
                  </div>
                  <Button type="button" size="sm" onClick={saveCurrentLocation}>Save</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowSaveLocationDialog(false)}>Cancel</Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Event Details */}
          <Collapsible open={eventDetailsOpen} onOpenChange={setEventDetailsOpen}>
            <SectionHeader 
              title="Event Details" 
              icon={Users} 
              isOpen={eventDetailsOpen} 
              onToggle={() => setEventDetailsOpen(!eventDetailsOpen)} 
            />
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="eventType" className="text-xs">Event Type</Label>
                  <Select value={formData.eventType} onValueChange={(value) => handleInputChange('eventType', value)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="play">Play Event</SelectItem>
                      <SelectItem value="show">Show Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cardTypes" className="text-xs">Card Types</Label>
                  <MultiSelect options={cardTypeOptions} selected={selectedCardTypes} onChange={setSelectedCardTypes} placeholder="Select card types..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Max Online Tickets</Label>
                  <Input type="number" placeholder="100" value={formData.maxAttendees} onChange={(e) => handleInputChange('maxAttendees', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entry Fee ($)</Label>
                  <Input type="number" placeholder="25" value={formData.entryFee} onChange={(e) => handleInputChange('entryFee', e.target.value)} />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="no-online-tickets" checked={noOnlineTicketSales} onCheckedChange={setNoOnlineTicketSales} />
                <Label htmlFor="no-online-tickets" className="text-sm">No online ticket sales</Label>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Age-Related Pricing (Optional)</Label>
                <Input placeholder="e.g., Free admission for kids under 12" value={formData.agePricingInfo} onChange={(e) => handleInputChange('agePricingInfo', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Total Vendor Tables</Label>
                  <Input type="number" placeholder="20" value={formData.totalTables} onChange={(e) => handleInputChange('totalTables', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vendor Table Price ($)</Label>
                  <Input type="number" placeholder="50" value={formData.vendorTablePrice} onChange={(e) => handleInputChange('vendorTablePrice', e.target.value)} />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="no-online-tables" checked={noOnlineTableSales} onCheckedChange={setNoOnlineTableSales} />
                <Label htmlFor="no-online-tables" className="text-sm">No online vendor table sales</Label>
              </div>

              {/* Vendor Start Time and Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Vendor Start Time</Label>
                  <Input type="time" value={formData.vendorStartTime} onChange={(e) => handleInputChange('vendorStartTime', e.target.value)} placeholder="When vendors can start setup" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vendor Notes</Label>
                <Textarea placeholder="Special instructions for vendors (e.g., loading dock location, setup rules)" value={formData.vendorNotes} onChange={(e) => handleInputChange('vendorNotes', e.target.value)} rows={2} />
              </div>

              {/* Sponsor Tiers */}
              <div className="space-y-2">
                <Label className="text-xs">Sponsor Tiers (Optional)</Label>
                <div className="space-y-2">
                  {sponsorTiers.map((tier, index) => (
                    <div key={index} className="border rounded p-2 space-y-2">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Tier Name</Label>
                          <Input placeholder="e.g., Platinum" value={tier.tier} onChange={(e) => updateSponsorTier(index, 'tier', e.target.value)} disabled={noSponsors} />
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">Cost ($)</Label>
                          <Input type="number" placeholder="5000" value={tier.cost} onChange={(e) => updateSponsorTier(index, 'cost', e.target.value)} disabled={noSponsors} />
                        </div>
                        {sponsorTiers.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeSponsorTier(index)} disabled={noSponsors}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Input placeholder="Benefits description" value={tier.description} onChange={(e) => updateSponsorTier(index, 'description', e.target.value)} disabled={noSponsors} />
                      <div className="flex items-center gap-3">
                        <Input type="number" placeholder="Slots" value={tier.slots} onChange={(e) => updateSponsorTier(index, 'slots', e.target.value)} disabled={tier.unlimitedSlots || noSponsors} className="w-24" />
                        <div className="flex items-center space-x-2">
                          <Switch id={`unlimited-${index}`} checked={tier.unlimitedSlots} onCheckedChange={(checked) => updateSponsorTier(index, 'unlimitedSlots', checked)} disabled={noSponsors} />
                          <Label htmlFor={`unlimited-${index}`} className="text-xs">Unlimited</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addSponsorTier} className="w-full" disabled={noSponsors}>
                    <Plus className="w-4 h-4 mr-1" /> Add Sponsor Tier
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="no-sponsors" checked={noSponsors} onCheckedChange={setNoSponsors} />
                <Label htmlFor="no-sponsors" className="text-sm">No sponsors</Label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Contact & Social Media */}
          <Collapsible open={contactOpen} onOpenChange={setContactOpen}>
            <SectionHeader 
              title="Contact & Social Media" 
              icon={Clock} 
              isOpen={contactOpen} 
              onToggle={() => setContactOpen(!contactOpen)} 
            />
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contact Email</Label>
                  <Input type="email" placeholder="event@example.com" value={formData.contactEmail} onChange={(e) => handleInputChange('contactEmail', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contact Phone</Label>
                  <Input type="tel" placeholder="(555) 123-4567" value={formData.contactPhone} onChange={(e) => handleInputChange('contactPhone', e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Preferred Contact Method</Label>
                <Select value={formData.preferredContactMethod} onValueChange={(value) => handleInputChange('preferredContactMethod', value)}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="any">Any Method</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Social Media Links</Label>
                {socialMediaLinks.map((link, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={link.platform} onValueChange={(value) => updateSocialMediaLink(index, 'platform', value)}>
                        <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="x">X (Twitter)</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="linktree">Linktree</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Input type="url" placeholder="https://..." value={link.url} onChange={(e) => updateSocialMediaLink(index, 'url', e.target.value)} />
                    </div>
                    {socialMediaLinks.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSocialMediaLink(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addSocialMediaLink} className="w-full">
                  <Plus className="w-4 h-4 mr-1" /> Add Social Link
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;
