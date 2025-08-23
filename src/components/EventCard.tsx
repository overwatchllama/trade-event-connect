import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users, Clock, Star } from "lucide-react";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    city: string;
    state: string;
    organizer: string;
    rating: number;
    attendees: number;
    maxAttendees: number;
    tablesAvailable: number;
    totalTables: number;
    cardTypes: string[];
    image?: string;
    price: number;
  };
  userType?: "collector" | "vendor" | "organizer";
}

const EventCard = ({ event, userType = "collector" }: EventCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-event transition-all duration-300 group">
      <div className="aspect-video bg-gradient-subtle relative overflow-hidden">
        {event.image ? (
          <img 
            src={event.image} 
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
            <Calendar className="w-12 h-12 text-primary-foreground opacity-50" />
          </div>
        )}
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-background/90 text-foreground">
            ${event.price}
          </Badge>
        </div>
        <div className="absolute top-4 left-4 flex gap-2">
          {event.cardTypes.slice(0, 2).map((type, index) => (
            <Badge key={index} variant="outline" className="bg-background/90 text-foreground">
              {type}
            </Badge>
          ))}
          {event.cardTypes.length > 2 && (
            <Badge variant="outline" className="bg-background/90 text-foreground">
              +{event.cardTypes.length - 2}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-card-foreground mb-2 group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{event.location}, {event.city}, {event.state}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-2" />
              <span>{event.date} at {event.time}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center text-muted-foreground">
              <Users className="w-4 h-4 mr-2" />
              <span>{event.attendees}/{event.maxAttendees} attendees</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Star className="w-4 h-4 mr-2 text-warning fill-warning" />
              <span>{event.rating}/5.0</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {userType === "vendor" ? (
                event.tablesAvailable > 0 ? (
                  <span>
                    <span className="font-medium text-vendor">{event.tablesAvailable}</span> tables{" "}
                    <span className="text-vendor underline cursor-pointer">available</span>
                  </span>
                ) : (
                  <span>Tables <span className="text-destructive">not available</span></span>
                )
              ) : (
                <span>
                  <span className="font-medium text-vendor">{event.tablesAvailable}</span> tables available
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              by <span className="font-medium text-card-foreground">{event.organizer}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1">
              View Details
            </Button>
            {userType === "vendor" ? (
              <Button variant="vendor" className="flex-1">
                Book Table
              </Button>
            ) : (
              <Button variant="default" className="flex-1">
                Buy Tickets
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EventCard;