import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Plus, Users } from 'lucide-react';

const testVendors = [
  {
    business_name: 'CardMaster Pro Shop',
    business_description: 'Your one-stop shop for all trading card games. We specialize in competitive play and tournament-grade cards.',
    business_address: '123 Main Street, Cardtown, CT 06001',
    business_phone: '(555) 123-4567',
    business_email: 'info@cardmasterpro.com',
    website_url: 'https://cardmasterpro.com',
    specialties: ['pokemon', 'mtg', 'lorcana', 'onepiece'],
    rating: 4.8,
    total_reviews: 156
  },
  {
    business_name: 'Pokemon Palace',
    business_description: 'Dedicated to all things Pokemon! From vintage Base Set to the latest releases.',
    business_address: '456 Pokemon Ave, Pallet Town, PA 19001',
    business_phone: '(555) 234-5678',
    business_email: 'shop@pokemonpalace.com',
    website_url: 'https://pokemonpalace.com',
    specialties: ['pokemon'],
    rating: 4.9,
    total_reviews: 203
  },
  {
    business_name: 'Magic Card Emporium',
    business_description: 'Premium Magic: The Gathering cards and supplies. 25+ years of experience.',
    business_address: '789 Planeswalker Blvd, Dominaria, MA 02101',
    business_phone: '(555) 345-6789',
    business_email: 'contact@magicemporium.com',
    website_url: 'https://magicemporium.com',
    specialties: ['mtg'],
    rating: 4.7,
    total_reviews: 98
  },
  {
    business_name: 'Collector\'s Corner',
    business_description: 'Family-owned business specializing in Disney Lorcana and collectible card games.',
    business_address: '321 Disney Drive, Enchanted Forest, FL 32801',
    business_phone: '(555) 456-7890',
    business_email: 'hello@collectorscorner.com',
    website_url: 'https://collectorscorner.com',
    specialties: ['lorcana', 'pokemon'],
    rating: 4.6,
    total_reviews: 67
  },
  {
    business_name: 'Elite Card Traders',
    business_description: 'High-end trading cards and rare collectibles. Investment-grade cards our specialty.',
    business_address: '654 Treasure Street, Goldport, CA 90210',
    business_phone: '(555) 567-8901',
    business_email: 'sales@elitecardtraders.com',
    website_url: 'https://elitecardtraders.com',
    specialties: ['pokemon', 'mtg', 'onepiece'],
    rating: 4.9,
    total_reviews: 134
  },
  {
    business_name: 'Vintage Card Vault',
    business_description: 'Specializing in vintage and retro trading cards. Grading and authentication services available.',
    business_address: '987 Nostalgia Lane, Retro City, NY 10001',
    business_phone: '(555) 678-9012',
    business_email: 'info@vintagecardvault.com',
    website_url: 'https://vintagecardvault.com',
    specialties: ['pokemon', 'mtg'],
    rating: 4.5,
    total_reviews: 89
  }
];

export const CreateTestVendors: React.FC = () => {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const createTestVendor = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to create test vendors.',
        variant: 'destructive',
      });
      return;
    }

    if (currentIndex >= testVendors.length) {
      toast({
        title: 'All Done!',
        description: 'All test vendors have been created.',
      });
      return;
    }

    setIsCreating(true);
    try {
      const vendorData = testVendors[currentIndex];
      
      // First update the user's profile to vendor role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'vendor' })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Then create the vendor business info
      const { error: vendorError } = await supabase
        .from('vendors')
        .insert({
          user_id: user.id,
          ...vendorData,
          verified: currentIndex < 3 // First 3 vendors are verified
        });

      if (vendorError) throw vendorError;

      toast({
        title: 'Test Vendor Created!',
        description: `Created ${vendorData.business_name} successfully.`,
      });

      setCurrentIndex(prev => prev + 1);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create vendor';
      toast({
        title: 'Creation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetVendorCreation = () => {
    setCurrentIndex(0);
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Test Vendors
          </CardTitle>
          <CardDescription>
            Sign in to create test vendor accounts for development purposes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Create Test Vendors
        </CardTitle>
        <CardDescription>
          Create realistic test vendor accounts to populate your marketplace.
          This will temporarily convert your account to a vendor for each test case.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">
                Progress: {currentIndex} of {testVendors.length} vendors created
              </p>
              {currentIndex < testVendors.length && (
                <p className="text-sm text-muted-foreground">
                  Next: {testVendors[currentIndex].business_name}
                </p>
              )}
            </div>
            <div className="text-2xl font-bold text-primary">
              {Math.round((currentIndex / testVendors.length) * 100)}%
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={createTestVendor}
              disabled={isCreating || currentIndex >= testVendors.length}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isCreating ? 'Creating...' : currentIndex >= testVendors.length ? 'All Created!' : 'Create Next Vendor'}
            </Button>
            
            {currentIndex > 0 && (
              <Button
                variant="outline"
                onClick={resetVendorCreation}
                disabled={isCreating}
              >
                Reset
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            <p><strong>Note:</strong> Each vendor creation will temporarily convert your current account to that vendor. 
            You'll need to manually reset your role after testing if needed.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};