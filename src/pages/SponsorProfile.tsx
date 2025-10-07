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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import Header from '@/components/Header';
import { SubscriptionButton } from '@/components/SubscriptionButton';
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
  Upload,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface SponsorProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_description: string | null;
  company_address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  logo_url: string | null;
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

const SponsorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [sponsor, setSponsor] = useState<SponsorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    if (id) {
      fetchSponsorProfile();
    } else if (user) {
      fetchCurrentUserProfile();
    }
  }, [id, user]);

  const fetchSponsorProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setSponsor(data);
      setEditFormData(data);
    } catch (error) {
      console.error('Error fetching sponsor:', error);
      toast.error('Failed to load sponsor profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSponsor(data);
        setEditFormData(data);
      }
    } catch (error) {
      console.error('Error fetching sponsor:', error);
      toast.error('Failed to load sponsor profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'banner') => {
    if (!sponsor) return;

    setUploading(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${sponsor.id}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `sponsor-${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-flyers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-flyers')
        .getPublicUrl(filePath);

      const updateField = type === 'logo' ? 'logo_url' : 'banner_url';
      const { error: updateError } = await supabase
        .from('sponsors')
        .update({ [updateField]: publicUrl })
        .eq('id', sponsor.id);

      if (updateError) throw updateError;

      setSponsor(prev => prev ? { ...prev, [updateField]: publicUrl } : null);
      toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} updated successfully`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!sponsor) return;

    try {
      const { error } = await supabase
        .from('sponsors')
        .update(editFormData)
        .eq('id', sponsor.id);

      if (error) throw error;

      setSponsor(editFormData);
      setEditMode(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const isOwner = user?.id === sponsor?.user_id;

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

  if (!sponsor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4">Sponsor Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The sponsor profile you're looking for doesn't exist.
            </p>
            <Link to="/">
              <Button>Back to Home</Button>
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
            {sponsor.banner_url ? (
              <img 
                src={sponsor.banner_url} 
                alt="Sponsor banner"
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
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, 'banner');
                    }}
                    disabled={uploading === 'banner'}
                  />
                  <Button variant="secondary" disabled={uploading === 'banner'}>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading === 'banner' ? 'Uploading...' : 'Update Banner'}
                  </Button>
                </label>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="absolute -bottom-16 left-8">
            <div className="relative group">
              <Avatar className="w-32 h-32 border-4 border-background">
                <AvatarImage src={sponsor.logo_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {getInitials(sponsor.company_name)}
                </AvatarFallback>
              </Avatar>
              
              {isOwner && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'logo');
                      }}
                      disabled={uploading === 'logo'}
                    />
                    <Camera className="w-6 h-6 text-white" />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Header */}
        <div className="mt-20 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{sponsor.company_name}</h1>
              {sponsor.verified && (
                <Badge variant="default" className="bg-primary">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              {sponsor.rating !== null && sponsor.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current text-yellow-500" />
                  <span>{sponsor.rating.toFixed(1)}</span>
                  <span className="text-sm">({sponsor.total_reviews || 0} reviews)</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {!isOwner && (
              <Button onClick={() => setContactOpen(true)}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact
              </Button>
            )}
            {isOwner && (
              <Button onClick={() => setEditMode(!editMode)} variant="outline">
                {editMode ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </Button>
            )}
            <SubscriptionButton
              type="event"
              targetId={sponsor.id}
              variant="outline"
              size="default"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Company Description</Label>
                      <Textarea
                        value={editFormData.company_description || ''}
                        onChange={(e) => setEditFormData({...editFormData, company_description: e.target.value})}
                        rows={4}
                      />
                    </div>
                  </div>
                ) : (
                  sponsor.company_description && (
                    <p className="text-sm text-muted-foreground">{sponsor.company_description}</p>
                  )
                )}

                {sponsor.specialties && sponsor.specialties.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {sponsor.specialties.map((specialty, index) => (
                        <Badge key={index} variant="outline">{specialty}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Address</Label>
                      <Input
                        value={editFormData.company_address || ''}
                        onChange={(e) => setEditFormData({...editFormData, company_address: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={editFormData.contact_phone || ''}
                        onChange={(e) => setEditFormData({...editFormData, contact_phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={editFormData.contact_email || ''}
                        onChange={(e) => setEditFormData({...editFormData, contact_email: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input
                        value={editFormData.website_url || ''}
                        onChange={(e) => setEditFormData({...editFormData, website_url: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleSaveProfile} className="w-full">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <>
                    {sponsor.company_address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{sponsor.company_address}</span>
                      </div>
                    )}
                    {sponsor.contact_phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <a href={`tel:${sponsor.contact_phone}`} className="text-sm hover:underline">
                          {sponsor.contact_phone}
                        </a>
                      </div>
                    )}
                    {sponsor.contact_email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <a href={`mailto:${sponsor.contact_email}`} className="text-sm hover:underline">
                          {sponsor.contact_email}
                        </a>
                      </div>
                    )}
                    {sponsor.website_url && (
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <a 
                          href={sponsor.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm hover:underline"
                        >
                          {sponsor.website_url.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {(sponsor.social_instagram || sponsor.social_twitter || sponsor.social_facebook || sponsor.social_linkedin) && (
              <Card>
                <CardHeader>
                  <CardTitle>Social Media</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {sponsor.social_instagram && (
                      <a href={sponsor.social_instagram} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon">
                          <Instagram className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {sponsor.social_twitter && (
                      <a href={sponsor.social_twitter} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon">
                          <Twitter className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {sponsor.social_facebook && (
                      <a href={sponsor.social_facebook} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon">
                          <Facebook className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {sponsor.social_linkedin && (
                      <a href={sponsor.social_linkedin} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon">
                          <Linkedin className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="events">Sponsored Events</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>Sponsorship Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {sponsor.company_description || 'No description available.'}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="events">
                <Card>
                  <CardHeader>
                    <CardTitle>Sponsored Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Events sponsored by {sponsor.company_name} will appear here.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Contact Dialog */}
        <Dialog open={contactOpen} onOpenChange={setContactOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contact {sponsor.company_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {sponsor.contact_email && (
                <div>
                  <Label>Email</Label>
                  <a href={`mailto:${sponsor.contact_email}`} className="text-primary hover:underline block">
                    {sponsor.contact_email}
                  </a>
                </div>
              )}
              {sponsor.contact_phone && (
                <div>
                  <Label>Phone</Label>
                  <a href={`tel:${sponsor.contact_phone}`} className="text-primary hover:underline block">
                    {sponsor.contact_phone}
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default SponsorProfile;
