import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

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
    <section className="relative min-h-[400px] md:min-h-[500px] bg-gradient-subtle overflow-hidden">
      <div className="absolute inset-0 bg-gradient-primary/10"></div>
      <div className="container mx-auto px-4 py-12 md:py-24 relative">
        <div className="max-w-3xl mx-auto text-center space-y-6 md:space-y-8">
          <div className="space-y-3 md:space-y-4 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl md:text-5xl xl:text-7xl font-bold text-foreground leading-tight">
              The Ultimate
              <span className="bg-gradient-primary bg-clip-text text-transparent"> Collector</span>
              <br />Experience
            </h1>
            <p className="text-base sm:text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto px-2">
              Connect event organizers, vendors, and collectors in one powerful platform. 
              Discover Pokemon, MTG, sports cards events near you.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="hero" 
              size="lg" 
              className="text-lg px-8 hover-scale"
              onClick={handleFindEvents}
            >
              Find Events Near You
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 hover-scale"
              onClick={handleListEvent}
            >
              List Your Event
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;