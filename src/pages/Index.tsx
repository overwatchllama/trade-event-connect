import Header from "@/components/Header";
import Hero from "@/components/Hero";
import UserTypeSelector from "@/components/UserTypeSelector";
import SubscriptionTiers from "@/components/SubscriptionTiers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Users, Calendar, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const featuredEvents = [
    {
      title: "Pokemon Regional Championship",
      location: "Los Angeles, CA",
      date: "March 15",
      attendees: 156,
      rating: 4.8,
      cardTypes: ["Pokemon", "TCG"]
    },
    {
      title: "MTG Commander Night", 
      location: "San Francisco, CA",
      date: "March 18",
      attendees: 48,
      rating: 4.9,
      cardTypes: ["MTG", "Commander"]
    },
    {
      title: "Sports Card Expo",
      location: "San Diego, CA", 
      date: "March 20",
      attendees: 89,
      rating: 4.7,
      cardTypes: ["Sports", "Baseball"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <UserTypeSelector />
      <SubscriptionTiers />
      
      {/* Featured Events Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Featured Events This Week
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Don't miss these popular trading card events happening near you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {featuredEvents.map((event, index) => (
              <Card key={index} className="p-6 hover:shadow-lg-custom transition-shadow">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-primary">
                      {event.cardTypes[0]}
                    </Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="w-4 h-4 text-warning fill-warning mr-1" />
                      {event.rating}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-card-foreground">
                    {event.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {event.location}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {event.date}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      {event.attendees} attendees
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full" onClick={() => navigate('/events')}>
                    View Event
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button variant="hero" size="lg" onClick={() => navigate('/events')}>
              Browse All Events
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-foreground">
                500+
              </div>
              <div className="text-muted-foreground">Events Listed</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-foreground">
                2,500+
              </div>
              <div className="text-muted-foreground">Active Vendors</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-foreground">
                15,000+
              </div>
              <div className="text-muted-foreground">Collectors</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-foreground">
                98%
              </div>
              <div className="text-muted-foreground">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Join thousands of collectors, vendors, and organizers in the ultimate 
            trading card marketplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="text-lg px-8" onClick={() => navigate('/auth')}>
              Sign Up Free
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" onClick={() => navigate('/events')}>
              Browse Events
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
