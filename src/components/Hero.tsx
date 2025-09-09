import { Button } from "@/components/ui/button";
import { Calendar, Users, Store, MapPin, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import heroImage from "@/assets/hero-marketplace.jpg";

const Hero = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<string>("");

  const handleFindEvents = () => {
    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Navigate with location parameters
          navigate('/events', { 
            state: { 
              latitude: position.coords.latitude, 
              longitude: position.coords.longitude 
            } 
          });
        },
        (error) => {
          // Fallback: navigate without location
          console.log("Location access denied:", error);
          navigate('/events');
        }
      );
    } else {
      // Browser doesn't support geolocation
      navigate('/events');
    }
  };

  const handleListEvent = () => {
    // Navigate to events page with creation intent
    navigate('/events', { state: { showCreateEvent: true } });
  };
  return (
    <section className="relative min-h-[600px] bg-gradient-subtle overflow-hidden">
      <div className="absolute inset-0 bg-gradient-primary/10"></div>
      <div className="container mx-auto px-4 py-20 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                The Ultimate
                <span className="bg-gradient-primary bg-clip-text text-transparent"> Trading Card</span>
                <br />Event Marketplace
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl">
                Connect event organizers, vendors, and collectors in one powerful platform. 
                Discover Pokemon, MTG, sports cards events near you.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="hero" 
                size="lg" 
                className="text-lg px-8"
                onClick={handleFindEvents}
              >
                Find Events Near You
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8"
                onClick={handleListEvent}
              >
                List Your Event
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-8 pt-8">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-accent mx-auto mb-2" />
                <h3 className="font-semibold text-foreground mb-1">Event Organizers</h3>
                <p className="text-sm text-muted-foreground">List events easily</p>
              </div>
              <div className="text-center">
                <Store className="w-8 h-8 text-vendor mx-auto mb-2" />
                <h3 className="font-semibold text-foreground mb-1">Vendors</h3>
                <p className="text-sm text-muted-foreground">Book tables easily</p>
              </div>
              <div className="text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-foreground mb-1">Collectors</h3>
                <p className="text-sm text-muted-foreground">Get location alerts</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <img 
              src={heroImage} 
              alt="Trading card marketplace showcasing Pokemon, MTG, and sports cards"
              className="rounded-2xl shadow-lg-custom w-full"
            />
            <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-xl p-4 shadow-card">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm text-card-foreground">Local Events</p>
                  <p className="text-xs text-muted-foreground">Find events near you</p>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-vendor border border-border rounded-xl p-4 shadow-vendor text-vendor-foreground">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5" />
                <div>
                  <p className="font-semibold text-sm">Smart Alerts</p>
                  <p className="text-xs opacity-90">Get notified instantly</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;