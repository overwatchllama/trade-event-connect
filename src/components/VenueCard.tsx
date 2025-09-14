import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Globe, Phone, Mail, Building2 } from "lucide-react";
import { ClaimVenueDialog } from "./ClaimVenueDialog";
import { useState } from "react";

interface Venue {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  owner_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  capacity: number | null;
  amenities: string[] | null;
  image_url: string | null;
  verified: boolean;
  created_at: string;
}

interface VenueCardProps {
  venue: Venue;
  canClaim?: boolean;
  onVenueClick?: (venue: Venue) => void;
}

export const VenueCard = ({ venue, canClaim = false, onVenueClick }: VenueCardProps) => {
  const [showClaimDialog, setShowClaimDialog] = useState(false);

  return (
    <>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <div onClick={() => onVenueClick?.(venue)} className="h-full">
          {venue.image_url && (
            <div className="aspect-video overflow-hidden rounded-t-lg">
              <img 
                src={venue.image_url} 
                alt={venue.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {venue.name}
              </CardTitle>
              {venue.verified && (
                <Badge variant="secondary" className="ml-2">Verified</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{venue.address}, {venue.city}, {venue.state} {venue.zip_code}</span>
            </div>

            {venue.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {venue.description}
              </p>
            )}

            {venue.capacity && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span>Capacity: {venue.capacity}</span>
              </div>
            )}

            {venue.amenities && venue.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {venue.amenities.slice(0, 3).map((amenity) => (
                  <Badge key={amenity} variant="outline" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
                {venue.amenities.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{venue.amenities.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {venue.contact_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span className="truncate">{venue.contact_phone}</span>
                </div>
              )}
              {venue.contact_email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{venue.contact_email}</span>
                </div>
              )}
              {venue.website_url && (
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <span>Website</span>
                </div>
              )}
            </div>

            {canClaim && !venue.owner_id && (
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowClaimDialog(true);
                }}
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
              >
                Claim Venue
              </Button>
            )}
          </CardContent>
        </div>
      </Card>

      {showClaimDialog && (
        <ClaimVenueDialog
          venue={venue}
          open={showClaimDialog}
          onOpenChange={setShowClaimDialog}
        />
      )}
    </>
  );
};