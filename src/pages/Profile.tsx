import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { User, Mail, ArrowLeft, Save, Building, Calendar, MapPin, Users } from 'lucide-react';
import Header from '@/components/Header';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Badge } from '@/components/ui/badge';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

type ProfileForm = z.infer<typeof profileSchema>;

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [roleRequests, setRoleRequests] = useState<any[]>([]);
  const { user, requestRole } = useAuth();
  const navigate = useNavigate();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
      full_name: '', 
      email: '' 
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

    fetchProfile();
    fetchRoleRequests();
  }, [user, form]);

  const onSubmit = async (data: ProfileForm) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          email: data.email,
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
    { id: 'organizer', title: 'Event Organizer', description: 'Create and manage tournaments', icon: Calendar },
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
            
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your account information and preferences.
            </p>
          </div>

          <div className="space-y-6">
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
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
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
                            <Input type="email" placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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

            {profile?.role === 'user' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={() => handleRoleRequest('vendor')} className="flex-1">
                      <Building className="h-4 w-4 mr-2" />
                      Request to be a Vendor
                    </Button>
                    <Button onClick={() => handleRoleRequest('organizer')} className="flex-1">
                      <Calendar className="h-4 w-4 mr-2" />
                      Request to be an Event Organizer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {roleRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Role Requests</CardTitle>
                  <CardDescription>
                    Your role request history and status.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {roleRequests.map((request) => {
                      const role = roles.find(r => r.id === request.requested_role);
                      const Icon = role?.icon || Users;
                      return (
                        <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{role?.title || request.requested_role}</p>
                              <p className="text-sm text-muted-foreground">
                                Requested {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Profile;