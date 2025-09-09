import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';

interface VendorProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_description: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  website_url: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
  social_facebook: string | null;
  social_linkedin: string | null;
  specialties: string[] | null;
  rating: number | null;
  total_reviews: number | null;
  verified: boolean | null;
  created_at: string;
}

interface EditVendorProfileProps {
  vendor: VendorProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (vendor: VendorProfile) => void;
}

const EditVendorProfile = ({ vendor, open, onOpenChange, onUpdate }: EditVendorProfileProps) => {
  const [formData, setFormData] = useState<VendorProfile>(vendor);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData(vendor);
  }, [vendor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          business_name: formData.business_name,
          business_description: formData.business_description,
          business_address: formData.business_address,
          business_phone: formData.business_phone,
          business_email: formData.business_email,
          website_url: formData.website_url,
          social_instagram: formData.social_instagram,
          social_twitter: formData.social_twitter,
          social_facebook: formData.social_facebook,
          social_linkedin: formData.social_linkedin,
          specialties: formData.specialties,
        })
        .eq('id', vendor.id);

      if (error) throw error;

      onUpdate(formData);
      toast.success('Profile updated successfully!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties?.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...(prev.specialties || []), newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialtyToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties?.filter(s => s !== specialtyToRemove) || []
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vendor Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Business Information</h3>
            
            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="business_description">Description</Label>
              <Textarea
                id="business_description"
                value={formData.business_description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, business_description: e.target.value }))}
                rows={3}
                placeholder="Tell customers about your business..."
              />
            </div>

            <div>
              <Label htmlFor="business_address">Address</Label>
              <Input
                id="business_address"
                value={formData.business_address || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, business_address: e.target.value }))}
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            
            <div>
              <Label htmlFor="business_phone">Phone</Label>
              <Input
                id="business_phone"
                type="tel"
                value={formData.business_phone || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, business_phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="business_email">Business Email</Label>
              <Input
                id="business_email"
                type="email"
                value={formData.business_email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, business_email: e.target.value }))}
                placeholder="contact@yourbusiness.com"
              />
            </div>

            <div>
              <Label htmlFor="website_url">Website</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://yourbusiness.com"
              />
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Social Media</h3>
            
            <div>
              <Label htmlFor="social_instagram">Instagram URL</Label>
              <Input
                id="social_instagram"
                value={formData.social_instagram || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, social_instagram: e.target.value }))}
                placeholder="https://instagram.com/yourbusiness"
              />
            </div>

            <div>
              <Label htmlFor="social_twitter">Twitter URL</Label>
              <Input
                id="social_twitter"
                value={formData.social_twitter || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, social_twitter: e.target.value }))}
                placeholder="https://twitter.com/yourbusiness"
              />
            </div>

            <div>
              <Label htmlFor="social_facebook">Facebook URL</Label>
              <Input
                id="social_facebook"
                value={formData.social_facebook || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, social_facebook: e.target.value }))}
                placeholder="https://facebook.com/yourbusiness"
              />
            </div>

            <div>
              <Label htmlFor="social_linkedin">LinkedIn URL</Label>
              <Input
                id="social_linkedin"
                value={formData.social_linkedin || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, social_linkedin: e.target.value }))}
                placeholder="https://linkedin.com/company/yourbusiness"
              />
            </div>
          </div>

          {/* Specialties */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Specialties</h3>
            
            <div className="flex gap-2">
              <Input
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder="Add a specialty..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
              />
              <Button type="button" onClick={addSpecialty} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {formData.specialties && formData.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.specialties.map((specialty, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    {specialty}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(specialty)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditVendorProfile;