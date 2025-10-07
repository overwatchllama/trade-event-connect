import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { Switch } from '@/components/ui/switch';
import { Calendar, MapPin, DollarSign, Upload, X, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onEventUpdated?: () => void;
}

const EditEventDialog = ({ open, onOpenChange, eventId, onEventUpdated }: EditEventDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCardTypes, setSelectedCardTypes] = useState<string[]>([]);

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
    vendorTablePrice: '',
    totalTables: '',
    contactEmail: '',
    contactPhone: '',
    preferredContactMethod: '',
    socialInstagram: '',
    socialX: '',
    socialTiktok: '',
    socialLinktree: '',
    socialFacebook: ''
  });

  const [isMultiDay, setIsMultiDay] = useState(false);
  const [eventDays, setEventDays] = useState([
    { date: '', startTime: '', endTime: '', dayNumber: 1 }
  ]);
  const [sponsorTiers, setSponsorTiers] = useState([
    { tier: '', cost: '' }
  ]);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);

  useEffect(() => {
    if (open && eventId) {
      fetchEventData();
    }
  }, [open, eventId]);

  const fetchEventData = async () => {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      setFormData({
        title: event.title || '',
        description: event.description || '',
        date: event.date || '',
        venue: event.venue || '',
        address: event.address || '',
        city: event.city || '',
        state: event.state || '',
        zipCode: event.zip_code || '',
        eventType: event.event_type || '',
        maxAttendees: event.max_attendees?.toString() || '',
        entryFee: event.entry_fee?.toString() || '',
        vendorTablePrice: event.vendor_table_price?.toString() || '',
        totalTables: event.total_tables?.toString() || '',
        contactEmail: event.contact_email || '',
        contactPhone: event.contact_phone || '',
        preferredContactMethod: event.preferred_contact_method || '',
        socialInstagram: event.social_instagram || '',
        socialX: event.social_x || '',
        socialTiktok: event.social_tiktok || '',
        socialLinktree: event.social_linktree || '',
        socialFacebook: event.social_facebook || ''
      });

      setSelectedCardTypes(event.card_types || []);
      setIsMultiDay(event.is_multi_day || false);
      setFlyerPreview(event.flyer_url || null);

      // Parse sponsor tiers from JSON
      if (event.sponsor_tiers) {
        try {
          const tiers = typeof event.sponsor_tiers === 'string' 
            ? JSON.parse(event.sponsor_tiers) 
            : event.sponsor_tiers;
          setSponsorTiers(tiers.length > 0 ? tiers : [{ tier: '', cost: '' }]);
        } catch (e) {
          setSponsorTiers([{ tier: '', cost: '' }]);
        }
      } else {
        setSponsorTiers([{ tier: '', cost: '' }]);
      }

      // Fetch event days
      const { data: days, error: daysError } = await supabase
        .from('event_days')
        .select('*')
        .eq('event_id', eventId)
        .order('day_number');

      if (!daysError && days && days.length > 0) {
        setEventDays(days.map(day => ({
          date: day.day_date,
          startTime: day.start_time,
          endTime: day.end_time,
          dayNumber: day.day_number
        })));
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event data');
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

  const addEventDay = () => {
    setEventDays(prev => [...prev, { 
      date: '', 
      startTime: '', 
      endTime: '', 
      dayNumber: prev.length + 1 
    }]);
  };

  const removeEventDay = (index: number) => {
    if (eventDays.length > 1) {
      setEventDays(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateEventDay = (index: number, field: string, value: string) => {
    setEventDays(prev => prev.map((day, i) => 
      i === index ? { ...day, [field]: value } : day
    ));
  };

  const addSponsorTier = () => {
    setSponsorTiers(prev => [...prev, { tier: '', cost: '' }]);
  };

  const removeSponsorTier = (index: number) => {
    if (sponsorTiers.length > 1) {
      setSponsorTiers(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSponsorTier = (index: number, field: string, value: string) => {
    setSponsorTiers(prev => prev.map((tier, i) => 
      i === index ? { ...tier, [field]: value } : tier
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to update event');
      return;
    }

    setLoading(true);
    try {
      let flyerUrl = flyerPreview;
      
      // Upload new flyer if provided
      if (flyerFile) {
        const fileExt = flyerFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-flyers')
          .upload(filePath, flyerFile);

        if (uploadError) {
          console.error('Error uploading flyer:', uploadError);
          toast.error('Failed to upload flyer');
          return;
        }

        const { data: urlData } = supabase.storage
          .from('event-flyers')
          .getPublicUrl(filePath);
        
        flyerUrl = urlData.publicUrl;
      }

      // Update event in database
      const { error } = await supabase
        .from('events')
        .update({
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
          vendor_table_price: formData.vendorTablePrice ? parseFloat(formData.vendorTablePrice) : null,
          total_tables: formData.totalTables ? parseInt(formData.totalTables) : null,
          is_multi_day: isMultiDay,
          flyer_url: flyerUrl,
          sponsor_tiers: sponsorTiers.some(t => t.tier && t.cost) 
            ? JSON.stringify(sponsorTiers.filter(t => t.tier && t.cost)) 
            : null,
          contact_email: formData.contactEmail || null,
          contact_phone: formData.contactPhone || null,
          preferred_contact_method: formData.preferredContactMethod || null,
          social_instagram: formData.socialInstagram || null,
          social_x: formData.socialX || null,
          social_tiktok: formData.socialTiktok || null,
          social_linktree: formData.socialLinktree || null,
          social_facebook: formData.socialFacebook || null
        })
        .eq('id', eventId);

      if (error) throw error;

      // Delete existing event days and insert new ones
      await supabase
        .from('event_days')
        .delete()
        .eq('event_id', eventId);

      const eventDaysData = eventDays.map((day, index) => ({
        event_id: eventId,
        day_number: index + 1,
        day_date: day.date,
        start_time: day.startTime,
        end_time: day.endTime
      }));

      const { error: daysError } = await supabase
        .from('event_days')
        .insert(eventDaysData);

      if (daysError) {
        console.error('Error updating event days:', daysError);
      }
      
      toast.success('Event updated successfully!');
      onOpenChange(false);
      
      if (onEventUpdated) {
        onEventUpdated();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Edit Event
          </DialogTitle>
          <DialogDescription>
            Update your event details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
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

            {/* Multi-day toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="multi-day"
                checked={isMultiDay}
                onCheckedChange={setIsMultiDay}
              />
              <Label htmlFor="multi-day">Multi-day event</Label>
            </div>

            {/* Event Days */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Event Schedule</Label>
                {isMultiDay && (
                  <Button type="button" variant="outline" size="sm" onClick={addEventDay}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Day
                  </Button>
                )}
              </div>
              
              {eventDays.map((day, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      {isMultiDay ? `Day ${index + 1}` : 'Event Day'}
                    </h4>
                    {isMultiDay && eventDays.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEventDay(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={day.date}
                        onChange={(e) => updateEventDay(index, 'date', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={day.startTime}
                        onChange={(e) => updateEventDay(index, 'startTime', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={day.endTime}
                        onChange={(e) => updateEventDay(index, 'endTime', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Flyer Upload */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Event Flyer (Optional)</Label>
              {flyerPreview ? (
                <div className="relative">
                  <img 
                    src={flyerPreview} 
                    alt="Flyer preview" 
                    className="w-full max-h-64 object-contain border rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeFlyerPreview}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground mb-2">
                    Upload a flyer for your event
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFlyerUpload}
                    className="max-w-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="venue">Venue Name</Label>
              <Input
                id="venue"
                placeholder="e.g., Convention Center"
                value={formData.venue}
                onChange={(e) => handleInputChange('venue', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Los Angeles"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="CA"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  placeholder="90210"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Event Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Select value={formData.eventType} onValueChange={(value) => handleInputChange('eventType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="play">Play Event (Tournament/Gameplay)</SelectItem>
                    <SelectItem value="show">Show Event (Trade Show/Exhibition)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardTypes">Card Types</Label>
                <MultiSelect
                  options={cardTypeOptions}
                  selected={selectedCardTypes}
                  onChange={setSelectedCardTypes}
                  placeholder="Select card types..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxAttendees">Max Tickets to Sell Online (Optional)</Label>
                <Input
                  id="maxAttendees"
                  type="number"
                  placeholder="100"
                  value={formData.maxAttendees}
                  onChange={(e) => handleInputChange('maxAttendees', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entryFee">Entry Fee ($)</Label>
                <Input
                  id="entryFee"
                  type="number"
                  placeholder="25"
                  value={formData.entryFee}
                  onChange={(e) => handleInputChange('entryFee', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalTables">Total Vendor Tables</Label>
                <Input
                  id="totalTables"
                  type="number"
                  placeholder="20"
                  value={formData.totalTables}
                  onChange={(e) => handleInputChange('totalTables', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendorTablePrice">Vendor Table Price ($)</Label>
                <Input
                  id="vendorTablePrice"
                  type="number"
                  placeholder="50"
                  value={formData.vendorTablePrice}
                  onChange={(e) => handleInputChange('vendorTablePrice', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sponsorTiers">Sponsor Tiers (Optional)</Label>
              <div className="space-y-3">
                {sponsorTiers.map((tier, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Tier Name</Label>
                      <Input
                        placeholder="e.g., Platinum"
                        value={tier.tier}
                        onChange={(e) => updateSponsorTier(index, 'tier', e.target.value)}
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label className="text-xs">Cost ($)</Label>
                      <Input
                        type="number"
                        placeholder="5000"
                        value={tier.cost}
                        onChange={(e) => updateSponsorTier(index, 'cost', e.target.value)}
                      />
                    </div>
                    {sponsorTiers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSponsorTier(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSponsorTier}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Sponsor Tier
                </Button>
              </div>
            </div>
          </div>

          {/* Contact & Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact & Social Media</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="event@example.com"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
              <Select value={formData.preferredContactMethod} onValueChange={(value) => handleInputChange('preferredContactMethod', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select preferred contact method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="any">Any Method</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="socialInstagram">Instagram</Label>
                <Input
                  id="socialInstagram"
                  placeholder="@eventname"
                  value={formData.socialInstagram}
                  onChange={(e) => handleInputChange('socialInstagram', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="socialX">X (Twitter)</Label>
                <Input
                  id="socialX"
                  placeholder="@eventname"
                  value={formData.socialX}
                  onChange={(e) => handleInputChange('socialX', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="socialTiktok">TikTok</Label>
                <Input
                  id="socialTiktok"
                  placeholder="@eventname"
                  value={formData.socialTiktok}
                  onChange={(e) => handleInputChange('socialTiktok', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="socialFacebook">Facebook</Label>
                <Input
                  id="socialFacebook"
                  placeholder="eventname"
                  value={formData.socialFacebook}
                  onChange={(e) => handleInputChange('socialFacebook', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="socialLinktree">Linktree</Label>
                <Input
                  id="socialLinktree"
                  placeholder="linktr.ee/eventname"
                  value={formData.socialLinktree}
                  onChange={(e) => handleInputChange('socialLinktree', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating Event...' : 'Update Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventDialog;
