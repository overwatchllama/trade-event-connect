import { useEffect } from 'react';
import Header from "@/components/Header";
import SubscriptionTiers from "@/components/SubscriptionTiers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const Subscription = () => {
  const { user } = useAuth();
  const { 
    subscribed, 
    subscription_tier, 
    subscription_end, 
    billing_period,
    loading,
    checkSubscription,
    openCustomerPortal 
  } = useSubscription();

  useEffect(() => {
    // Auto-refresh subscription status when component mounts
    if (user) {
      checkSubscription();
    }
  }, [user]);

  const handleRefreshStatus = async () => {
    await checkSubscription();
    toast.success('Subscription status refreshed');
  };

  const formatTierName = (tier: string | null) => {
    if (!tier) return 'Free';
    return tier.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="sr-only">Subscription Plans</h1>

        {/* Current Subscription Status */}
        {user && (
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-card-foreground">Your Subscription</h2>
              <Button variant="outline" size="sm" onClick={handleRefreshStatus} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
            </div>
            
            {loading ? (
              <div className="text-muted-foreground">Loading subscription status...</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge variant={subscribed ? "default" : "secondary"}>
                    {subscribed ? 'Active Subscription' : 'Free Plan'}
                  </Badge>
                  <span className="text-lg font-semibold text-card-foreground">
                    {formatTierName(subscription_tier)}
                  </span>
                  {billing_period && (
                    <Badge variant="outline">
                      {billing_period === 'yearly' ? 'Annual' : 'Monthly'} Billing
                    </Badge>
                  )}
                </div>
                
                {subscribed && subscription_end && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Renews on {formatDate(subscription_end)}</span>
                  </div>
                )}
                
                {subscribed && (
                  <Button variant="outline" onClick={openCustomerPortal}>
                    Manage Subscription
                  </Button>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Subscription Tiers */}
        <SubscriptionTiers />
        
        {/* Features Comparison */}
        <section className="py-20 bg-muted/30 rounded-lg mt-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Upgrade?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Unlock powerful features to enhance your trading card experience.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-card-foreground mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground">
                  Get detailed insights into your events, sales, and collection performance.
                </p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-bold text-card-foreground mb-2">Priority Support</h3>
                <p className="text-muted-foreground">
                  Get faster response times and dedicated support for your account.
                </p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-bold text-card-foreground mb-2">Custom Branding</h3>
                <p className="text-muted-foreground">
                  Customize your profile and event listings with your brand colors and logo.
                </p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-bold text-card-foreground mb-2">Inventory Management</h3>
                <p className="text-muted-foreground">
                  Track your inventory across multiple events with advanced tools.
                </p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-bold text-card-foreground mb-2">Market Insights</h3>
                <p className="text-muted-foreground">
                  Access real-time market data and price trends for better decisions.
                </p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-bold text-card-foreground mb-2">No Limits</h3>
                <p className="text-muted-foreground">
                  Create unlimited events, collections, and vendor profiles.
                </p>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Subscription;