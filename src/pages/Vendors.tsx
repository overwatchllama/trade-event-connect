import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { VendorGridCard } from '@/components/VendorGridCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVendorProfile } from '@/hooks/useVendorProfile';
import { Search, Store, Mail, MapPin, Star, Users, Edit } from 'lucide-react';
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
  vendor_types: string[] | null;
  rating: number | null;
  total_reviews: number | null;
  verified: boolean | null;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    role: string;
  };
}

const Vendors = () => {
  const { user } = useAuth();
  const { hasVendorRole } = useVendorProfile();
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [myVendorProfile, setMyVendorProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

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
        .select('id, full_name, email, avatar_url, role')
        .in('id', userIds)
        .eq('role', 'vendor');

      if (profilesError) throw profilesError;

      // Combine the data
      const transformedData = vendorsData?.map(vendor => {
        const profile = profilesData?.find(p => p.id === vendor.user_id);
        return {
          ...vendor,
          profiles: profile
        };
      }).filter(vendor => vendor.profiles) || [];
      
      // Separate current user's profile from others
      const currentUserProfile = transformedData.find(vendor => vendor.user_id === user?.id);
      const otherVendors = transformedData.filter(vendor => vendor.user_id !== user?.id);
      
      setMyVendorProfile(currentUserProfile || null);
      setVendors(otherVendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            
            {/* Apply to Become Vendor Button - Only show if not already a vendor */}
            {user && !hasVendorRole && (
              <Button variant="hero" size="lg">
                Apply to Become a Vendor
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
                      <Button variant="outline" size="sm">
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
              {/* Search Bar for Other Vendors */}
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search other vendors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
                    <VendorGridCard key={vendor.id} vendor={vendor} getInitials={getInitials} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Search Bar for non-vendors */
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search vendors by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                <VendorGridCard key={vendor.id} vendor={vendor} getInitials={getInitials} />
              ))}
            </div>
          )
        )}

        {/* Call to Action - Only show if not already a vendor */}
        {!loading && (vendors.length > 0 || myVendorProfile) && user && !hasVendorRole && (
          <div className="text-center mt-12 p-8 bg-muted/30 rounded-lg">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Want to become a vendor?
            </h3>
            <p className="text-muted-foreground mb-4">
              Join our marketplace and connect with thousands of collectors.
            </p>
            <Button variant="hero" size="lg">
              Apply to Become a Vendor
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vendors;