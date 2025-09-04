import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Store, Users, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

const UserTypeSelector = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();

  const handleUserTypeClick = (userTypeVariant: string) => {
    if (!user) {
      // Not signed in - redirect to auth page
      toast.info('Please sign in to get started');
      navigate('/auth');
      return;
    }

    // User is signed in - determine where to redirect based on user type
    switch (userTypeVariant) {
      case 'organizer':
        if (profile?.role === 'organizer') {
          // Already an organizer - go to events page to create event
          navigate('/events', { state: { showCreateEvent: true } });
        } else {
          // Need to request organizer role - go to profile to request role
          navigate('/profile');
          toast.info('Request organizer role in your profile to start hosting events');
        }
        break;
      
      case 'vendor':
        if (profile?.role === 'vendor') {
          // Already a vendor - go to events page to book tables
          navigate('/events');
        } else {
          // Need to request vendor role - go to profile
          navigate('/profile');
          toast.info('Request vendor role in your profile to start selling');
        }
        break;
      
      case 'default': // Collector
        // All users can collect - go to events to find events
        navigate('/events');
        toast.success('Welcome! Discover events near you');
        break;
      
      default:
        navigate('/events');
    }
  };
  const userTypes = [
    {
      type: "Event Organizer",
      icon: Calendar,
      variant: "organizer" as const,
      description: "Host trading card events and tournaments",
      features: [
        "List events for $20",
        "Manage vendor bookings",
        "Set custom table pricing", 
        "Track event analytics",
        "Collect $1 platform fee per table"
      ],
      cta: "Start Hosting Events"
    },
    {
      type: "Vendor",
      icon: Store, 
      variant: "vendor" as const,
      description: "Book tables at events and showcase your inventory",
      features: [
        "Browse available events",
        "Book tables instantly",
        "Manage your vendor profile",
        "Connect social media & shops",
        "Get rated by attendees"
      ],
      cta: "Start Selling"
    },
    {
      type: "Collector",
      icon: Users,
      variant: "default" as const,
      description: "Discover events and connect with the community",
      features: [
        "Location-based event alerts",
        "Follow favorite vendors",
        "Rate events & vendors",
        "Get notified of new events",
        "Build your collector network"
      ],
      cta: "Start Collecting"
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Join the Community
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you're organizing events, selling cards, or collecting treasures, 
            we have the perfect tools for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {userTypes.map((userType) => {
            const Icon = userType.icon;
            return (
              <Card key={userType.type} className="p-8 text-center hover:shadow-lg-custom transition-shadow">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold text-card-foreground mb-2">
                    {userType.type}
                  </h3>
                  <p className="text-muted-foreground">
                    {userType.description}
                  </p>
                </div>

                <div className="space-y-3 mb-8">
                  {userType.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-card-foreground">
                      <CheckCircle className="w-4 h-4 text-success mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  variant={userType.variant} 
                  size="lg" 
                  className="w-full"
                  onClick={() => handleUserTypeClick(userType.variant)}
                >
                  {userType.cta}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UserTypeSelector;