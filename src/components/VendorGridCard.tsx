import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, MapPin, Star } from 'lucide-react';
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

interface VendorGridCardProps {
  vendor: VendorProfile;
  getInitials: (name: string | null) => string;
}

export const VendorGridCard = ({ vendor, getInitials }: VendorGridCardProps) => {
  const formatVendorType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="hover:shadow-lg-custom transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={vendor.avatar_url || vendor.profiles?.avatar_url || ''} />
              <AvatarFallback className="bg-vendor text-vendor-foreground">
                {getInitials(vendor.profiles?.full_name || vendor.business_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {vendor.business_name}
              </CardTitle>
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="h-3 w-3 mr-1" />
                {vendor.profiles?.email}
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
          {vendor.business_address || 'Available nationwide'}
        </div>
        
        {/* Vendor Types */}
        {vendor.vendor_types && vendor.vendor_types.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {vendor.vendor_types.map((type, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {formatVendorType(type)}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-muted-foreground">
            <Star className="w-4 h-4 text-muted-foreground mr-1" />
            {vendor.rating && vendor.total_reviews ? (
              <>Rating: {vendor.rating}/5 ({vendor.total_reviews} reviews)</>
            ) : (
              'Not yet reviewed'
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Member since {new Date(vendor.created_at).getFullYear()}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button className="flex-1" size="sm" asChild>
            <Link to={`/vendor/${vendor.id}`}>
              View Profile
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => toast.info('Contact feature coming soon!')}
          >
            Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};