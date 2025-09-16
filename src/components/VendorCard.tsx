import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SubscriptionButton } from '@/components/SubscriptionButton';
import { Star, MapPin, Phone, Mail, Globe, Shield } from 'lucide-react';

interface Vendor {
  id: string;
  business_name: string;
  business_description: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  website_url: string | null;
  specialties: string[];
  verified: boolean;
  rating: number;
  total_reviews: number;
}

interface VendorCardProps {
  vendor: Vendor;
  onContactVendor?: (vendor: Vendor) => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({ vendor, onContactVendor }) => {
  const getSpecialtyColor = (specialty: string) => {
    const colors: Record<string, string> = {
      pokemon: 'bg-yellow-500',
      mtg: 'bg-purple-500',
      lorcana: 'bg-pink-500',
      onepiece: 'bg-orange-500',
    };
    return colors[specialty] || 'bg-gray-500';
  };

  const getSpecialtyName = (specialty: string) => {
    const names: Record<string, string> = {
      pokemon: 'Pokémon',
      mtg: 'Magic: TG',
      lorcana: 'Lorcana',
      onepiece: 'One Piece',
    };
    return names[specialty] || specialty;
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {vendor.business_name}
              {vendor.verified && (
                <Shield className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
            {vendor.business_description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {vendor.business_description}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="font-medium">{vendor.rating.toFixed(1)}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            ({vendor.total_reviews} reviews)
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Specialties */}
          <div>
            <p className="text-sm font-medium mb-2">Specialties:</p>
            <div className="flex flex-wrap gap-1">
              {vendor.specialties.map((specialty) => (
                <Badge 
                  key={specialty}
                  variant="secondary"
                  className={`${getSpecialtyColor(specialty)} text-white text-xs`}
                >
                  {getSpecialtyName(specialty)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-2 text-sm">
            {vendor.business_address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{vendor.business_address}</span>
              </div>
            )}
            
            {vendor.business_phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{vendor.business_phone}</span>
              </div>
            )}
            
            {vendor.business_email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{vendor.business_email}</span>
              </div>
            )}
            
            {vendor.website_url && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-3 w-3" />
                <a 
                  href={vendor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary truncate"
                >
                  {vendor.website_url.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => onContactVendor?.(vendor)}
            >
              Contact Vendor
            </Button>
            <Button size="sm" variant="outline">
              View Profile
            </Button>
            <SubscriptionButton
              type="vendor"
              targetId={vendor.id}
              size="sm"
              showText={false}
              variant="outline"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};