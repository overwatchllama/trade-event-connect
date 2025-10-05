import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { User, Mail, ArrowLeft, Save, Building, MapPin, Users, Plus, Trash2, UserCog, Settings } from 'lucide-react';
import Header from '@/components/Header';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelfManageRoles } from '@/components/SelfManageRoles';
import { ManageVenue } from '@/components/ManageVenue';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  location_zip_code: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip_code: z.string().optional(),
  communications_enabled: z.boolean().default(true),
});

type SocialMediaLink = {
  id: string;
  platform: string;
  url: string;
};

type ProfileForm = z.infer<typeof profileSchema>;

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [roleRequests, setRoleRequests] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const { user, requestRole } = useAuth();
  const { subscription_tier, subscribed } = useSubscription();
  const navigate = useNavigate();

  const isEventUser = subscribed && (subscription_tier === "event_pro" || subscription_tier === "Event Pro");

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
      full_name: '', 
      email: '',
      location_city: '',
      location_state: '',
      location_zip_code: '',
      address_line1: '',
      address_line2: '',
      address_city: '',
      address_state: '',
      address_zip_code: '',
      communications_enabled: true,
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        form.setValue('full_name', data.full_name || '');
        form.setValue('email', data.email || user.email || '');
        form.setValue('location_city', data.location_city || '');
        form.setValue('location_state', data.location_state || '');
        form.setValue('location_zip_code', data.location_zip_code || '');
        form.setValue('address_line1', data.address_line1 || '');
        form.setValue('address_line2', data.address_line2 || '');
        form.setValue('address_city', data.address_city || '');
        form.setValue('address_state', data.address_state || '');
        form.setValue('address_zip_code', data.address_zip_code || '');
        form.setValue('communications_enabled', data.communications_enabled ?? true);
        
        // Load social media links
        const links: SocialMediaLink[] = [];
        if (data.social_instagram) links.push({ id: '1', platform: 'Instagram', url: data.social_instagram });
        if (data.social_twitter) links.push({ id: '2', platform: 'Twitter/X', url: data.social_twitter });
        if (data.social_facebook) links.push({ id: '3', platform: 'Facebook', url: data.social_facebook });
        if (data.social_linkedin) links.push({ id: '4', platform: 'LinkedIn', url: data.social_linkedin });
        setSocialLinks(links);
      }
    };

    const fetchRoleRequests = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('role_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setRoleRequests(data);
      }
    };

    const fetchUserRoles = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (data) {
        setUserRoles(data.map(r => r.role));
      }
    };

    fetchProfile();
    fetchRoleRequests();
    fetchUserRoles();
  }, [user, form]);

  const socialPlatforms = [
    'Instagram',
    'X (Twitter)', 
    'Facebook',
    'Discord',
    'Twitch',
    'LinkedIn',
    'TikTok',
    'YouTube'
  ];

  const addSocialLink = () => {
    const newLink: SocialMediaLink = {
      id: Date.now().toString(),
      platform: '',
      url: ''
    };
    setSocialLinks([...socialLinks, newLink]);
  };

  const removeSocialLink = (id: string) => {
    setSocialLinks(socialLinks.filter(link => link.id !== id));
  };

  const updateSocialLink = (id: string, field: 'platform' | 'url', value: string) => {
    setSocialLinks(socialLinks.map(link => 
      link.id === id ? { ...link, [field]: value } : link
    ));
  };

  const onSubmit = async (data: ProfileForm) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Convert social links back to individual fields for backward compatibility
      const socialData: any = {
        social_instagram: null,
        social_twitter: null,
        social_facebook: null,
        social_linkedin: null,
      };
      
      socialLinks.forEach(link => {
        const platform = link.platform.toLowerCase();
        if (platform.includes('instagram')) socialData.social_instagram = link.url;
        else if (platform.includes('twitter') || platform.includes('x')) socialData.social_twitter = link.url;
        else if (platform.includes('facebook')) socialData.social_facebook = link.url;
        else if (platform.includes('linkedin')) socialData.social_linkedin = link.url;
      });

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          email: data.email,
          location_city: data.location_city || null,
          location_state: data.location_state || null,
          location_zip_code: data.location_zip_code || null,
          address_line1: data.address_line1 || null,
          address_line2: data.address_line2 || null,
          address_city: data.address_city || null,
          address_state: data.address_state || null,
          address_zip_code: data.address_zip_code || null,
          communications_enabled: data.communications_enabled,
          ...socialData,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleRequest = async (role: 'vendor' | 'organizer') => {
    const { error } = await requestRole(role, '');
    
    if (error) {
      toast({
        title: 'Role Request Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Role Request Submitted',
        description: `Your request for ${role} role has been submitted for review.`,
      });
      // Refresh role requests
      const { data } = await supabase
        .from('role_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (data) setRoleRequests(data);
    }
  };

  const roles = [
    { id: 'vendor', title: 'Vendor', description: 'Sell trading cards and collectibles', icon: Building },
    { id: 'organizer', title: 'Event Organizer', description: 'Create and manage tournaments', icon: Building },
    { id: 'venue', title: 'Venue Owner', description: 'Host events at your location', icon: MapPin },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
                <p className="text-muted-foreground">
                  Manage your account information and preferences.
                </p>
              </div>
              {isEventUser && (
                <Button
                  onClick={() => navigate('/events')}
                  variant="default"
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Manage My Events
                </Button>
              )}
            </div>
          </div>

          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className={`grid w-full ${userRoles.includes('venue') ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              {userRoles.includes('venue') && (
                <TabsTrigger value="venue">My Venue</TabsTrigger>
              )}
              <TabsTrigger value="plans">Plans</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-6">
              <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" className="border-2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email" className="border-2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-base font-medium">Location</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <FormField
                          control={form.control}
                          name="location_city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your city" className="border-2" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="location_state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your state" className="border-2" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="location_zip_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Zip Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your zip code" className="border-2" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-base font-medium">Address</h3>
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="address_line1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 1</FormLabel>
                              <FormControl>
                                <Input placeholder="Street address" className="border-2" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="address_line2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 2 (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Apartment, suite, etc." className="border-2" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name="address_city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input placeholder="City" className="border-2" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="address_state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>State</FormLabel>
                                <FormControl>
                                  <Input placeholder="State" className="border-2" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="address_zip_code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Zip Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="Zip code" className="border-2" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-medium">Social Media</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addSocialLink}
                          className="border-2"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Link
                        </Button>
                      </div>
                      
                      {socialLinks.length > 0 ? (
                        <div className="border-2 rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-1/3">Platform</TableHead>
                                <TableHead>URL</TableHead>
                                <TableHead className="w-16"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {socialLinks.map((link) => (
                                <TableRow key={link.id}>
                                  <TableCell className="p-2">
                                    <Select
                                      value={link.platform}
                                      onValueChange={(value) => updateSocialLink(link.id, 'platform', value)}
                                    >
                                      <SelectTrigger className="h-8 border-2 bg-background">
                                        <SelectValue placeholder="Select platform" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-background border-2 z-50">
                                        {socialPlatforms.map((platform) => (
                                          <SelectItem key={platform} value={platform} className="cursor-pointer">
                                            {platform}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      placeholder="Profile URL"
                                      value={link.url}
                                      onChange={(e) => updateSocialLink(link.id, 'url', e.target.value)}
                                      className="h-8 border-2"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeSocialLink(link.id)}
                                      className="h-8 w-8 p-0 hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground border-2 border-dashed p-4 rounded-md text-center">
                          No social media links added yet. Click "Add Link" to get started.
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-base font-medium">Communications</h3>
                      <FormField
                        control={form.control}
                        name="communications_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border-2 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Marketing Communications
                              </FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Receive emails about new features, events, and promotions.
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {profile && (
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    Your account details and current role status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Account Created</Label>
                      <p className="font-medium">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Current Role</Label>
                      <p className="font-medium capitalize">
                        {profile.role || 'User'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            </TabsContent>

            <TabsContent value="roles" className="space-y-6">
              <SelfManageRoles />
            </TabsContent>

            {userRoles.includes('venue') && (
              <TabsContent value="venue" className="space-y-6">
                <ManageVenue />
              </TabsContent>
            )}

            <TabsContent value="plans" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Plans</CardTitle>
                  <CardDescription>
                    View and manage your subscription plan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/subscription')} className="w-full">
                    View All Plans
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Profile;