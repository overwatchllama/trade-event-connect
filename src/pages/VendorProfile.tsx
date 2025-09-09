import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Edit, 
  Camera, 
  Star,
  MessageCircle,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

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

const VendorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);

  useEffect(() => {
    if (id) {
      fetchVendorProfile();
    }
  }, [id]);

  const fetchVendorProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setVendor(data);
    } catch (error) {
      console.error('Error fetching vendor:', error);
      toast.error('Failed to load vendor profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'avatar' | 'banner') => {
    if (!vendor) return;

    setUploading(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendor.id}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `vendor-${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-flyers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-flyers')
        .getPublicUrl(filePath);

      const updateField = type === 'avatar' ? 'avatar_url' : 'banner_url';
      const { error: updateError } = await supabase
        .from('vendors')
        .update({ [updateField]: publicUrl })
        .eq('id', vendor.id);

      if (updateError) throw updateError;

      setVendor(prev => prev ? { ...prev, [updateField]: publicUrl } : null);
      toast.success(`${type === 'avatar' ? 'Profile picture' : 'Banner'} updated successfully`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading(null);
    }
  };

  const isOwner = user?.id === vendor?.user_id;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </main>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4">Vendor Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The vendor profile you're looking for doesn't exist.
            </p>
            <Link to="/vendors">
              <Button>Back to Vendors</Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Banner Section */}
        <div className="relative mb-6">
          <div className="h-64 bg-gradient-primary rounded-lg overflow-hidden relative group">
            {vendor.banner_url ? (
              <img 
                src={vendor.banner_url} 
                alt="Vendor banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                <Camera className="w-16 h-16 text-primary-foreground opacity-50" />
              </div>
            )}
            
            {isOwner && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'banner')}
                    className="hidden"
                  />
                  <Button variant="secondary" disabled={uploading === 'banner'}>
                    {uploading === 'banner' ? <Upload className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    Update Banner
                  </Button>
                </label>
              </div>
            )}
          </div>
          
          {/* Profile Picture */}
          <div className="absolute -bottom-12 left-8">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-background">
                <AvatarImage src={vendor.avatar_url || ''} />
                <AvatarFallback className="bg-vendor text-vendor-foreground text-2xl">
                  {getInitials(vendor.business_name)}
                </AvatarFallback>
              </Avatar>
              
              {isOwner && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'avatar')}
                      className="hidden"
                    />
                    <Camera className="w-6 h-6 text-white" />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="pt-16 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">{vendor.business_name}</h1>
                  {vendor.verified && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Verified
                    </Badge>
                  )}
                </div>
                
                {vendor.rating && vendor.total_reviews ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    {vendor.rating} ({vendor.total_reviews} reviews)
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="w-4 h-4 text-muted-foreground" />
                    Not yet reviewed
                  </div>
                )}
              </div>
              
              {isOwner && (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {vendor.business_description || 'No description available.'}
                </p>
              </CardContent>
            </Card>

            {/* Specialties */}
            {vendor.specialties && vendor.specialties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Specialties</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {vendor.specialties.map((specialty, index) => (
                      <Badge key={index} variant="outline">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Actions */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <Button 
                  className="w-full"
                  onClick={() => setContactOpen(true)}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Vendor
                </Button>
                
                {vendor.website_url && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={vendor.website_url} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4 mr-2" />
                      Visit Website
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vendor.business_address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                    <span className="text-sm">{vendor.business_address}</span>
                  </div>
                )}
                
                {vendor.business_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${vendor.business_phone}`} className="text-sm hover:text-primary">
                      {vendor.business_phone}
                    </a>
                  </div>
                )}
                
                {vendor.business_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${vendor.business_email}`} className="text-sm hover:text-primary">
                      {vendor.business_email}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Media */}
            {(vendor.social_instagram || vendor.social_twitter || vendor.social_facebook || vendor.social_linkedin) && (
              <Card>
                <CardHeader>
                  <CardTitle>Follow Us</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {vendor.social_instagram && (
                      <a href={vendor.social_instagram} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Instagram className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    
                    {vendor.social_twitter && (
                      <a href={vendor.social_twitter} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Twitter className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    
                    {vendor.social_facebook && (
                      <a href={vendor.social_facebook} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Facebook className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    
                    {vendor.social_linkedin && (
                      <a href={vendor.social_linkedin} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Linkedin className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact {vendor.business_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Your name" />
            <Input placeholder="Your email" type="email" />
            <Input placeholder="Subject" />
            <Textarea placeholder="Your message" rows={4} />
            <Button className="w-full" onClick={() => {
              toast.success('Message sent successfully!');
              setContactOpen(false);
            }}>
              Send Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorProfile;