import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { VendorGridCard } from '@/components/VendorGridCard';
import EditVendorProfile from '@/components/EditVendorProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVendorProfile } from '@/hooks/useVendorProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Search, Store, Mail, MapPin, Star, Users, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type VendorRow = Database['public']['Tables']['vendors']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface VendorProfile extends VendorRow {
  profiles: Pick<ProfileRow, 'id' | 'full_name' | 'email' | 'avatar_url' | 'role' | 'location_state'>;
}

const Vendors = () => {
  const { user } = useAuth();
  const { hasVendorRole } = useVendorProfile();
  const { isVendor } = useUserRoles();
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [myVendorProfile, setMyVendorProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedVendorType, setSelectedVendorType] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addingRole, setAddingRole] = useState(false);

  // US States list
  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ];

  useEffect(() => {
    fetchVendors();
  }, [user, isVendor]);

  const fetchVendors = async () => {
    try {
      // First get vendors
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (vendorsError) throw vendorsError;

      // Then get profiles for the vendor users
      const userIds = vendorsData?.map(v => v.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, location_state')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const transformedData = vendorsData?.map(vendor => {
        const profile = profilesData?.find(p => p.id === vendor.user_id);
        return {
          ...vendor,
          profiles: profile
        };
      }).filter(vendor => vendor.profiles) || [];
      
      // Transform the data to ensure social_links is an array
      const transformedVendorsWithSocialLinks = transformedData.map(vendor => ({
        ...vendor,
        social_links: Array.isArray(vendor.social_links) ? vendor.social_links : []
      }));
      
      // Always include all vendors in the list; also surface "my" vendor profile if present
      const currentUserProfile = user?.id 
        ? transformedVendorsWithSocialLinks.find(vendor => vendor.user_id === user.id)
        : null;

      setMyVendorProfile(currentUserProfile || null);
      setVendors(transformedVendorsWithSocialLinks);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile: VendorProfile) => {
    setMyVendorProfile(updatedProfile);
    await fetchVendors(); // Refetch to update the list
    toast.success('Profile updated successfully!');
  };

  const handleBecomeVendor = async () => {
    if (!user) return;

    if (isVendor) {
      // If already a vendor, check if profile exists
      if (myVendorProfile) {
        setEditDialogOpen(true);
      } else {
        // Check if vendor profile exists in database
        setAddingRole(true);
        try {
          const { data: existingVendor, error: fetchError } = await supabase
            .from('vendors')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (fetchError) throw fetchError;

          if (existingVendor) {
            // Profile exists, just fetch the full data and open dialog
            await fetchVendors();
            setEditDialogOpen(true);
          } else {
            // Create new vendor profile
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', user.id)
              .single();

            const { error: insertError } = await supabase
              .from('vendors')
              .insert({
                user_id: user.id,
                business_name: profileData?.full_name || 'My Business',
                business_email: profileData?.email || user.email
              });

            if (insertError) throw insertError;

            toast.success('Vendor profile created!');
            await fetchVendors();
            setEditDialogOpen(true);
          }
        } catch (error) {
          console.error('Error with vendor profile:', error);
          toast.error('Failed to open vendor profile. Please try again.');
        } finally {
          setAddingRole(false);
        }
      }
      return;
    }

    // Add vendor role
    setAddingRole(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'vendor' });

      if (error) throw error;

      toast.success('Vendor role added! Refreshing...');
      window.location.reload();
    } catch (error) {
      console.error('Error adding vendor role:', error);
      toast.error('Failed to add vendor role. Please try again.');
    } finally {
      setAddingRole(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.profiles?.location_state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.business_address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesState = !selectedState || selectedState === 'all' || vendor.profiles?.location_state === selectedState;
    
    const matchesVendorType = !selectedVendorType || selectedVendorType === 'all' || 
      vendor.vendor_types?.includes(selectedVendorType);
    
    return matchesSearch && matchesState && matchesVendorType;
  });

  // Get unique vendor types for filter
  const availableVendorTypes = Array.from(new Set(
    vendors
      .flatMap(v => v.vendor_types || [])
      .filter(Boolean)
  )).sort();

  const formatVendorType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'V';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Trading Card Vendors
              </h1>
              <p className="text-lg text-muted-foreground">
                Connect with verified vendors offering trading cards, collectibles, and more.
              </p>
            </div>
            
            {/* Become/Edit Vendor Button */}
            {user && (
              <Button 
                variant="hero" 
                size="lg"
                onClick={handleBecomeVendor}
                disabled={addingRole}
              >
                {isVendor ? 'Edit Vendor Profile' : '+ Become a Vendor'}
              </Button>
            )}
          </div>

        {/* Conditional tabs for vendors vs search bar for non-vendors */}
        {user && hasVendorRole ? (
          <Tabs defaultValue="others" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">My Vendor Profile</TabsTrigger>
              <TabsTrigger value="others">Other Vendors</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              {/* My Vendor Profile Tab */}
              {loading ? (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ) : myVendorProfile ? (
                <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={myVendorProfile.avatar_url || myVendorProfile.profiles?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                            {getInitials(myVendorProfile.profiles?.full_name || myVendorProfile.business_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-2xl">
                            {myVendorProfile.business_name}
                          </CardTitle>
                          <div className="flex items-center text-sm text-muted-foreground mb-2">
                            <Mail className="h-3 w-3 mr-1" />
                            {myVendorProfile.profiles?.email}
                          </div>
                          {myVendorProfile.verified && (
                            <Badge variant="default" className="bg-primary text-primary-foreground">
                              ✓ Verified Vendor
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {myVendorProfile.business_description && (
                      <p className="text-muted-foreground">{myVendorProfile.business_description}</p>
                    )}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      {myVendorProfile.business_address || 'Available nationwide'}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Star className="w-4 h-4 text-muted-foreground mr-1" />
                        {myVendorProfile.rating && myVendorProfile.total_reviews ? (
                          <>Rating: {myVendorProfile.rating}/5 ({myVendorProfile.total_reviews} reviews)</>
                        ) : (
                          'Not yet reviewed'
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Member since {new Date(myVendorProfile.created_at).getFullYear()}
                      </div>
                    </div>
                    {myVendorProfile.specialties && myVendorProfile.specialties.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Specialties</h4>
                        <div className="flex flex-wrap gap-2">
                          {myVendorProfile.specialties.map((specialty, index) => (
                            <Badge key={index} variant="outline">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {myVendorProfile.vendor_types && myVendorProfile.vendor_types.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Vendor Types</h4>
                        <div className="flex flex-wrap gap-2">
                          {myVendorProfile.vendor_types.map((type, index) => (
                            <Badge key={index} variant="default" className="text-xs">
                              {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12">
                  <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Vendor Profile Not Found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    There seems to be an issue with your vendor profile. Please contact support.
                  </p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="others">
              {/* Search and Filter Bar for Other Vendors */}
              <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search vendors by name, email, state, or zip..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedVendorType} onValueChange={setSelectedVendorType}>
                  <SelectTrigger className="w-full md:w-[200px] bg-background">
                    <SelectValue placeholder="Vendor Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">All Types</SelectItem>
                    {availableVendorTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {formatVendorType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="w-full md:w-[200px] bg-background">
                    <SelectValue placeholder="Filter by state" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">All States</SelectItem>
                    {usStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Other Vendors Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-3 w-[100px]" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-10 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {searchTerm ? 'No other vendors found' : 'No other vendors yet'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? 'Try adjusting your search terms.'
                      : 'You are currently the only vendor in our marketplace!'
                    }
                  </p>
                  {searchTerm && (
                    <Button variant="outline" onClick={() => setSearchTerm('')}>
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVendors.map((vendor) => (
                    <VendorGridCard 
                      key={vendor.id} 
                      vendor={vendor} 
                      getInitials={getInitials}
                      currentUserId={user?.id}
                      onEditClick={() => setEditDialogOpen(true)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Search and Filters for non-vendors */
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search vendors by name, email, state, or zip..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedVendorType} onValueChange={setSelectedVendorType}>
              <SelectTrigger className="w-full md:w-[200px] bg-background">
                <SelectValue placeholder="Vendor Type" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Types</SelectItem>
                {availableVendorTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {formatVendorType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-full md:w-[200px] bg-background">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All States</SelectItem>
                {usStates.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        </div>

        {/* Vendors Grid - Show based on user type */}
        {user && hasVendorRole ? (
          /* Tabs already handle the content, vendors grid is inside TabsContent */
          null
        ) : (
          /* Vendors Grid for non-vendors */
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm ? 'No vendors found' : 'No vendors yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms or browse all vendors.'
                  : 'Be the first vendor to join our marketplace!'
                }
              </p>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVendors.map((vendor) => (
                <VendorGridCard 
                  key={vendor.id} 
                  vendor={vendor} 
                  getInitials={getInitials}
                  currentUserId={user?.id}
                  onEditClick={() => setEditDialogOpen(true)}
                />
              ))}
            </div>
          )
        )}

      </main>

      {/* Edit Profile Dialog */}
      {myVendorProfile && (
        <EditVendorProfile
          vendor={myVendorProfile as any}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdate={(vendor) => handleProfileUpdate(vendor as any)}
        />
      )}
    </div>
  );
};

export default Vendors;