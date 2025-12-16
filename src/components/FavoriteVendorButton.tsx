import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FavoriteVendorButtonProps {
  vendorId: string;
  isFavorite: boolean;
  onToggle: () => void;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

export const FavoriteVendorButton = ({ 
  vendorId, 
  isFavorite,
  onToggle,
  className,
  size = 'sm',
  showText = false
}: FavoriteVendorButtonProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleToggleFavorite = async () => {
    if (!user) {
      toast.error('Please sign in to favorite vendors');
      return;
    }
    
    setLoading(true);
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('user_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('subscription_type', 'favorite_vendor')
          .eq('target_id', vendorId);

        if (error) throw error;
        toast.success('Removed from favorites');
      } else {
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            subscription_type: 'favorite_vendor',
            target_id: vendorId
          });

        if (error) {
          if (error.code === '23505') {
            toast.error('Already in favorites');
            return;
          }
          throw error;
        }
        toast.success('Added to favorites!');
      }
      onToggle();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Button
      onClick={handleToggleFavorite}
      disabled={loading}
      variant={isFavorite ? 'default' : 'outline'}
      size={size}
      className={cn(
        'transition-all duration-200',
        isFavorite && 'bg-red-500 hover:bg-red-600 text-white',
        className
      )}
    >
      <Heart className={cn('w-4 h-4', isFavorite && 'fill-current')} />
      {showText && <span className="ml-2">{isFavorite ? 'Favorited' : 'Favorite'}</span>}
    </Button>
  );
};
