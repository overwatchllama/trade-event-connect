import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { Calendar, MapPin, Users, DollarSign, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
    time: '',
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to create an event');
      return;
    }

    setLoading(true);
    try {
      // Here you would typically save to your database
      // For now, we'll just simulate the creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Event created successfully!');
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
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
    } catch (error) {
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  required
                />
              </div>
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
                    <SelectItem value="tournament">Tournament</SelectItem>
                    <SelectItem value="draft">Draft Event</SelectItem>
                    <SelectItem value="trade">Trade Show</SelectItem>
                    <SelectItem value="casual">Casual Play</SelectItem>
                    <SelectItem value="release">Release Event</SelectItem>
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