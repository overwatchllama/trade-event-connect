import { useState } from 'react';
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
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const tiers: SubscriptionTier[] = [
    {
      id: 'event_pro',
      name: 'Event Pro',
      icon: Calendar,
      description: 'Perfect for event organizers',
      monthlyPrice: 30,
      yearlyPrice: 330,
      features: [
        'Advanced event analytics',
        'Priority support',
        'Custom branding options',
        'Vendor management tools'
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
        'Enhanced vendor profile',
        'Inventory management',
        'Sales analytics',
        'Pre-verified booking profile',
        'Customer relationship tools'
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
        'Advanced collection tracking',
        'Price alerts',
        'Market insights',
        'Premium search filters',
        'Collection valuation tools'
      ]
    }
  ];

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
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
            Choose Your Plan
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Upgrade to unlock premium features and take your trading card experience to the next level.
          </p>
          
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

        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier) => {
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
                  {loading === tier.id ? 'Processing...' : `Subscribe to ${tier.name}`}
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SubscriptionTiers;