import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Store, Users, CheckCircle, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const UserTypeSelector = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<{ type: string; tier: 'free' | 'pro' } | null>(null);

  const handleCardClick = (userType: string, tier: 'free' | 'pro') => {
    if (!user) {
      // Not signed in - show confirmation dialog
      setSelectedTier({ type: userType, tier });
      setShowAccountDialog(true);
      return;
    }

    // User is signed in - redirect to subscription page if pro, otherwise handle normally
    if (tier === 'pro') {
      navigate('/subscription');
      toast.info('Upgrade to Pro to unlock premium features');
      return;
    }

    // Free tier logic for signed-in users
    handleUserTypeAction(userType);
  };

  const handleCreateAccount = () => {
    setShowAccountDialog(false);
    navigate('/auth', { state: { selectedTier } });
  };

  const handleUserTypeAction = (userTypeVariant: string) => {
    // User is signed in - determine where to redirect based on user type
    switch (userTypeVariant) {
      case 'organizer':
        if (profile?.role === 'organizer') {
          navigate('/events', { state: { showCreateEvent: true } });
        } else {
          navigate('/profile');
          toast.info('Request organizer role in your profile to start hosting events');
        }
        break;
      
      case 'vendor':
        if (profile?.role === 'vendor') {
          navigate('/events');
        } else {
          navigate('/profile');
          toast.info('Request vendor role in your profile to start selling');
        }
        break;
      
      case 'collector':
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
      free: {
        features: [
          "List events for $20",
          "Basic vendor management",
          "Standard table pricing",
          "Basic event page",
          "$1 platform fee per table"
        ]
      },
      pro: {
        features: [
          "List unlimited events",
          "Advanced vendor management",
          "Custom table pricing & layouts",
          "Premium event pages",
          "No platform fees",
          "Priority support",
          "Analytics dashboard"
        ],
        price: "$29/month"
      }
    },
    {
      type: "Vendor",
      icon: Store,
      variant: "vendor" as const,
      description: "Book tables at events and showcase your inventory",
      free: {
        features: [
          "Browse available events",
          "Book tables (with fees)",
          "Basic vendor profile",
          "Connect 2 social links",
          "Standard ratings"
        ]
      },
      pro: {
        features: [
          "Priority event access",
          "Waived booking fees",
          "Premium vendor profile",
          "Unlimited social links",
          "Featured in searches",
          "Advanced analytics",
          "Custom branding"
        ],
        price: "$19/month"
      }
    },
    {
      type: "Collector",
      icon: Users,
      variant: "collector" as const,
      description: "Discover events and connect with the community",
      free: {
        features: [
          "Browse all events",
          "Follow up to 5 vendors",
          "Rate events & vendors",
          "Basic notifications",
          "Standard search"
        ]
      },
      pro: {
        features: [
          "Early event access",
          "Follow unlimited vendors",
          "Priority notifications",
          "Advanced search filters",
          "Exclusive deals",
          "Save favorite events",
          "Community badges"
        ],
        price: "$9/month"
      }
    }
  ];

  return (
    <>
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

          <div className="space-y-12">
            {userTypes.map((userType) => {
              const Icon = userType.icon;
              return (
                <div key={userType.type}>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {userType.type}
                    </h3>
                    <p className="text-muted-foreground max-w-xl mx-auto">
                      {userType.description}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {/* Free Tier */}
                    <Card 
                      className="p-6 hover:shadow-lg-custom transition-all cursor-pointer hover:border-primary"
                      onClick={() => handleCardClick(userType.variant, 'free')}
                    >
                      <div className="text-center mb-6">
                        <Badge variant="outline" className="mb-3">Free</Badge>
                        <h4 className="text-xl font-bold text-card-foreground mb-1">
                          Start Free
                        </h4>
                        <p className="text-2xl font-bold text-primary">$0</p>
                        <p className="text-sm text-muted-foreground">Forever free</p>
                      </div>

                      <div className="space-y-3">
                        {userType.free.features.map((feature, index) => (
                          <div key={index} className="flex items-start text-sm text-card-foreground">
                            <CheckCircle className="w-4 h-4 text-success mr-3 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      <Button className="w-full mt-6" variant="outline">
                        Get Started Free
                      </Button>
                    </Card>

                    {/* Pro Tier */}
                    <Card 
                      className="p-6 hover:shadow-lg-custom transition-all cursor-pointer border-primary/50 relative hover:border-primary"
                      onClick={() => handleCardClick(userType.variant, 'pro')}
                    >
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-gradient-primary text-primary-foreground">
                          <Crown className="w-3 h-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>

                      <div className="text-center mb-6">
                        <Badge variant="default" className="mb-3 bg-gradient-primary">Pro</Badge>
                        <h4 className="text-xl font-bold text-card-foreground mb-1">
                          Go Pro
                        </h4>
                        <p className="text-2xl font-bold text-primary">{userType.pro.price}</p>
                        <p className="text-sm text-muted-foreground">Billed monthly</p>
                      </div>

                      <div className="space-y-3">
                        {userType.pro.features.map((feature, index) => (
                          <div key={index} className="flex items-start text-sm text-card-foreground">
                            <CheckCircle className="w-4 h-4 text-success mr-3 flex-shrink-0 mt-0.5" />
                            <span className="font-medium">{feature}</span>
                          </div>
                        ))}
                      </div>

                      <Button className="w-full mt-6" variant="hero">
                        Upgrade to Pro
                      </Button>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <AlertDialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Do you want to create an account?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedTier?.tier === 'pro' 
                ? `Sign up to unlock premium ${selectedTier.type} features with our Pro plan.`
                : `Create a free account to start as a ${selectedTier?.type}.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateAccount}>
              Create Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserTypeSelector;