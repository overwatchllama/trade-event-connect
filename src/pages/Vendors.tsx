import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { Search, Store, Mail, MapPin, Star, Users } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface VendorProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

const Vendors = () => {
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'vendor')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load vendors. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Trading Card Vendors
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Connect with verified vendors offering trading cards, collectibles, and more.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search vendors by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>


        {/* Vendors Grid */}
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
              <Card key={vendor.id} className="hover:shadow-lg-custom transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={vendor.avatar_url || ''} />
                        <AvatarFallback className="bg-vendor text-vendor-foreground">
                          {getInitials(vendor.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {vendor.full_name || 'Vendor'}
                        </CardTitle>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Mail className="h-3 w-3 mr-1" />
                          {vendor.email}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-vendor/10 text-vendor border-vendor/20">
                      Vendor
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    Available nationwide
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-4 w-4 text-warning fill-warning mr-1" />
                      4.8 (127 reviews)
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Member since {new Date(vendor.created_at).getFullYear()}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button className="flex-1" size="sm">
                      View Profile
                    </Button>
                    <Button variant="outline" size="sm">
                      Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Call to Action */}
        {!loading && vendors.length > 0 && (
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