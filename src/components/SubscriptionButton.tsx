import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface SubscriptionButtonProps {
  type: 'vendor' | 'event';
  targetId: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

export const SubscriptionButton = ({ 
  type, 
  targetId, 
  className,
  variant = 'outline',
  size = 'sm',
  showText = true
}: SubscriptionButtonProps) => {
  const { user } = useAuth();
  const { isSubscribed, subscribe, unsubscribe } = useSubscriptions();
  const [loading, setLoading] = useState(false);

  const subscribed = isSubscribed(type, targetId);

  const handleToggleSubscription = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribe(type, targetId);
      } else {
        await subscribe(type, targetId);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Button
      onClick={handleToggleSubscription}
      disabled={loading}
      variant={subscribed ? 'default' : variant}
      size={size}
      className={cn(
        'transition-all duration-200',
        subscribed && 'bg-primary hover:bg-primary/90',
        className
      )}
    >
      {subscribed ? (
        <>
          <BellOff className="w-4 h-4" />
          {showText && <span className="ml-2">Unsubscribe</span>}
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          {showText && <span className="ml-2">Subscribe</span>}
        </>
      )}
    </Button>
  );
};