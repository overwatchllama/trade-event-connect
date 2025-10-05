import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { Switch } from '@/components/ui/switch';
import { Calendar, MapPin, Users, DollarSign, Clock, Upload, X, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateEventDialog = ({ open, onOpenChange }: CreateEventDialogProps) => {
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
    totalTables: ''
  });

  const [isMultiDay, setIsMultiDay] = useState(false);
  const [eventDays, setEventDays] = useState([
    { date: '', startTime: '', endTime: '', dayNumber: 1 }
  ]);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to create an event');
      return;
    }

    setLoading(true);
    try {
      // Get user profile for organizer name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const organizer_name = profile?.full_name || user.email || 'Unknown Organizer';

      let flyerUrl = null;
      
      // Upload flyer if provided
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

      // Save event to database
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
          vendor_table_price: formData.vendorTablePrice ? parseFloat(formData.vendorTablePrice) : null,
          total_tables: formData.totalTables ? parseInt(formData.totalTables) : null,
          tables_available: formData.totalTables ? parseInt(formData.totalTables) : null,
          organizer_id: user.id,
          organizer_name: organizer_name,
          is_multi_day: isMultiDay,
          flyer_url: flyerUrl
        })
        .select()
        .single();

      if (error) throw error;

      // Save event days if multi-day or single day with times
      if (eventData) {
        const eventDaysData = eventDays.map((day, index) => ({
          event_id: eventData.id,
          day_number: index + 1,
          day_date: day.date,
          start_time: day.startTime,
          end_time: day.endTime
        }));

        const { error: daysError } = await supabase
          .from('event_days')
          .insert(eventDaysData);

        if (daysError) {
          console.error('Error saving event days:', daysError);
          // Event is created but days failed - notify user but don't fail completely
          toast.warning('Event created but failed to save day details');
        }
      }
      
      toast.success('Event created successfully!');
      onOpenChange(false);
      
      // Reset form
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
        vendorTablePrice: '',
        totalTables: ''
      });
      setSelectedCardTypes([]);
      setIsMultiDay(false);
      setEventDays([{ date: '', startTime: '', endTime: '', dayNumber: 1 }]);
      setFlyerFile(null);
      setFlyerPreview(null);

      // Refresh the page to show the new event
      window.location.reload();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event. Please try again.');
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
            Create New Event
          </DialogTitle>
          <DialogDescription>
            List your trading card event and connect with collectors and vendors.
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
                <Label htmlFor="maxAttendees">Max Attendees</Label>
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
              {loading ? 'Creating Event...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;