import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, Calendar, Store, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface SubscriptionTier {
  id: string;
  name: string;
  icon: typeof Calendar;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  popular?: boolean;
}

const SubscriptionTiers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'event_host' | 'vendor' | 'collector'>('collector');

  const tiers: SubscriptionTier[] = [
    {
      id: 'collector_free',
      name: 'Collector Free',
      icon: Users,
      description: 'For casual collectors',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        'Browse all events',
        'Follow up to 5 vendors',
        'Rate events & vendors',
        'Basic notifications',
        'Standard search'
      ]
    },
    {
      id: 'collector_pro',
      name: 'Collector Pro',
      icon: Users,
      description: 'For serious collectors',
      monthlyPrice: 5,
      yearlyPrice: 55,
      features: [
        'Early event access',
        'Follow unlimited vendors',
        'Priority notifications',
        'Advanced search filters',
        'Exclusive deals',
        'Save favorite events',
        'Community badges'
      ],
      popular: true
    },
    {
      id: 'vendor_free',
      name: 'Vendor Free',
      icon: Store,
      description: 'Start selling at events',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        'Browse available events',
        'Book tables (with fees)',
        'Basic vendor profile',
        'Connect 2 social links',
        'Standard ratings'
      ]
    },
    {
      id: 'vendor_pro',
      name: 'Vendor Pro', 
      icon: Store,
      description: 'Ideal for professional vendors',
      monthlyPrice: 20,
      yearlyPrice: 220,
      features: [
        'Priority event access',
        'Waived booking fees',
        'Premium vendor profile',
        'Unlimited social links',
        'Featured in searches',
        'Advanced analytics',
        'Custom branding'
      ],
      popular: true
    },
    {
      id: 'event_free',
      name: 'Event Host Free',
      icon: Calendar,
      description: 'Start hosting events',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        'List events for $20',
        'Basic vendor management',
        'Standard table pricing',
        'Basic event page',
        '$1 platform fee per table'
      ]
    },
    {
      id: 'event_pro',
      name: 'Event Host Pro',
      icon: Calendar,
      description: 'Perfect for event organizers',
      monthlyPrice: 30,
      yearlyPrice: 330,
      features: [
        'List unlimited events',
        'Advanced vendor management',
        'Custom table pricing & layouts',
        'Premium event pages',
        'No platform fees',
        'Priority support',
        'Analytics dashboard'
      ],
      popular: true
    }
  ];

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user) {
      // Redirect to auth page for account creation/login
      toast.info('Please sign in or create an account to continue');
      navigate('/auth');
      return;
    }

    // If it's a free tier, just redirect to events page
    if (tier.monthlyPrice === 0) {
      navigate('/events');
      toast.success('Welcome! Start exploring events');
      return;
    }

    setLoading(tier.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          tier: tier.id,
          billing_period: isYearly ? 'yearly' : 'monthly'
        }
      });

      if (error) throw error;

      // Open Stripe checkout in new tab
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to create checkout session');
    } finally {
      setLoading(null);
    }
  };

  const getPrice = (tier: SubscriptionTier) => {
    return isYearly ? tier.yearlyPrice : tier.monthlyPrice;
  };

  const getSavings = (tier: SubscriptionTier) => {
    const monthlyTotal = tier.monthlyPrice * 12;
    const savings = monthlyTotal - tier.yearlyPrice;
    const percentage = Math.round((savings / monthlyTotal) * 100);
    return { amount: savings, percentage };
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Select an account type
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Upgrade to unlock premium features and take your trading card experience to the next level.
          </p>

          {/* Account Type Selector */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Button
              variant={accountType === 'collector' ? 'default' : 'outline'}
              onClick={() => setAccountType('collector')}
              className="min-w-[120px]"
            >
              <Users className="w-4 h-4 mr-2" />
              Collector
            </Button>
            <Button
              variant={accountType === 'vendor' ? 'default' : 'outline'}
              onClick={() => setAccountType('vendor')}
              className="min-w-[120px]"
            >
              <Store className="w-4 h-4 mr-2" />
              Vendor
            </Button>
            <Button
              variant={accountType === 'event_host' ? 'default' : 'outline'}
              onClick={() => setAccountType('event_host')}
              className="min-w-[120px]"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Event Host
            </Button>
          </div>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm ${!isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <span className={`text-sm ${isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              Yearly
            </span>
            <Badge variant="secondary" className="ml-2">
              Yearly savings
            </Badge>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
          {tiers.filter(tier => {
            if (accountType === 'event_host') return tier.id.startsWith('event_');
            if (accountType === 'vendor') return tier.id.startsWith('vendor_');
            if (accountType === 'collector') return tier.id.startsWith('collector_');
            return false;
          }).map((tier) => {
            const Icon = tier.icon;
            const price = getPrice(tier);
            const savings = getSavings(tier);
            
            return (
              <Card key={tier.id} className={`p-8 text-center relative ${tier.popular ? 'border-primary shadow-lg-custom' : ''}`}>
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold text-card-foreground mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {tier.description}
                  </p>
                  
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-foreground">
                      ${price}
                      <span className="text-lg font-normal text-muted-foreground">
                        /{isYearly ? 'year' : 'month'}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isYearly ? (
                        <>or ${tier.monthlyPrice}/month</>
                      ) : (
                        <>or ${tier.yearlyPrice}/year</>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-card-foreground">
                      <CheckCircle className="w-4 h-4 text-success mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  variant={tier.popular ? "default" : "outline"}
                  size="lg" 
                  className="w-full"
                  onClick={() => handleSubscribe(tier)}
                  disabled={loading === tier.id}
                >
                  {tier.monthlyPrice === 0 ? 'Get Started Free' : loading === tier.id ? 'Processing...' : `Subscribe to ${tier.name}`}
                </Button>
              </Card>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SubscriptionTiers;