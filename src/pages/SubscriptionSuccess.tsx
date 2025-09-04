import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const { checkSubscription } = useSubscription();

  useEffect(() => {
    // Refresh subscription status when user returns from Stripe
    const refreshStatus = async () => {
      await checkSubscription();
      toast.success('Subscription activated successfully!');
    };
    
    refreshStatus();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        
        <h1 className="text-2xl font-bold text-card-foreground mb-4">
          Welcome to Pro!
        </h1>
        
        <p className="text-muted-foreground mb-8">
          Your subscription has been activated successfully. You now have access to all premium features.
        </p>
        
        <div className="space-y-3">
          <Button 
            className="w-full" 
            onClick={() => navigate('/subscription')}
          >
            View My Subscription
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => navigate('/')}
          >
            Continue to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;