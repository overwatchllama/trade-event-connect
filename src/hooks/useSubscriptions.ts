import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type SubscriptionType = 'vendor' | 'event' | 'favorite_vendor';

export interface Subscription {
  id: string;
  user_id: string;
  subscription_type: SubscriptionType;
  target_id: string;
  subscribed_at: string;
  created_at: string;
  updated_at: string;
}

export const useSubscriptions = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's subscriptions
  const fetchSubscriptions = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('subscribed_at', { ascending: false });

      if (error) throw error;
      setSubscriptions((data || []) as Subscription[]);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to a vendor or event
  const subscribe = async (type: SubscriptionType, targetId: string) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          subscription_type: type,
          target_id: targetId
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error(`Already subscribed to this ${type}`);
          return false;
        }
        throw error;
      }

      const typeLabel = type === 'favorite_vendor' ? 'vendor' : type;
      toast.success(`Successfully subscribed to ${typeLabel}!`);
      await fetchSubscriptions(); // Refresh subscriptions
      return true;
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error(`Failed to subscribe to ${type}`);
      return false;
    }
  };

  // Unsubscribe from a vendor or event
  const unsubscribe = async (type: SubscriptionType, targetId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('subscription_type', type)
        .eq('target_id', targetId);

      if (error) throw error;

      const typeLabel = type === 'favorite_vendor' ? 'vendor' : type;
      toast.success(`Successfully unsubscribed from ${typeLabel}!`);
      await fetchSubscriptions(); // Refresh subscriptions
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error(`Failed to unsubscribe from ${type}`);
      return false;
    }
  };

  // Check if user is subscribed to a specific target
  const isSubscribed = (type: SubscriptionType, targetId: string): boolean => {
    return subscriptions.some(
      sub => sub.subscription_type === type && sub.target_id === targetId
    );
  };

  // Get subscriptions by type
  const getSubscriptionsByType = (type: SubscriptionType): Subscription[] => {
    return subscriptions.filter(sub => sub.subscription_type === type);
  };

  // Get favorite vendors
  const getFavoriteVendorIds = (): string[] => {
    return subscriptions
      .filter(sub => sub.subscription_type === 'favorite_vendor')
      .map(sub => sub.target_id);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [user]);

  return {
    subscriptions,
    loading,
    subscribe,
    unsubscribe,
    isSubscribed,
    getSubscriptionsByType,
    getFavoriteVendorIds,
    refetch: fetchSubscriptions
  };
};
