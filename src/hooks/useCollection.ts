import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export type CardCategory = 'pokemon' | 'mtg' | 'yugioh' | 'sports' | 'lorcana' | 'onepiece' | 'other';
export type CardCondition = 'mint' | 'near_mint' | 'excellent' | 'good' | 'light_play' | 'moderate_play' | 'heavy_play' | 'damaged';
export type CardVariant = 'normal' | 'holo' | 'reverse_holo' | 'first_edition' | 'unlimited' | 'shadowless' | 'stamped' | 'prerelease' | 'promo' | 'full_art' | 'secret_rare' | 'rainbow_rare' | 'gold' | 'silver' | 'extended_art' | 'showcase' | 'borderless' | 'foil' | 'etched' | 'gilded';
export type GradingCompany = 'psa' | 'bgs' | 'cgc' | 'sgc' | 'ace' | 'none';

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: CardCategory;
  created_at: string;
  updated_at: string;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  user_id: string;
  tcg_card_id: string | null;
  name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  condition: CardCondition;
  quantity: number;
  purchase_price: number | null;
  current_market_price: number | null;
  estimated_value: number | null;
  notes: string | null;
  image_url: string | null;
  acquired_date: string | null;
  variant: CardVariant;
  is_graded: boolean;
  grading_company: GradingCompany;
  grade_score: number | null;
  cert_number: string | null;
  is_first_edition: boolean;
  is_shadowless: boolean;
  language: string;
  is_signed: boolean;
  tags: string[] | null;
  location: string | null;
  for_trade: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Wishlist {
  id: string;
  user_id: string;
  tcg_card_id: string | null;
  name: string | null;
  set_name: string | null;
  card_number: string | null;
  variant: CardVariant;
  desired_condition: CardCondition | null;
  max_price: number | null;
  priority: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TcgSet {
  id: string;
  external_id: string | null;
  game: CardCategory;
  name: string;
  code: string | null;
  series: string | null;
  release_date: string | null;
  total_cards: number | null;
  printed_total: number | null;
  logo_url: string | null;
  symbol_url: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface SetCompletion {
  id: string;
  user_id: string;
  tcg_set_id: string;
  total_cards: number;
  owned_cards: number;
  completion_percentage: number;
  total_value: number;
  last_updated: string;
}

export const useCollection = () => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [sets, setSets] = useState<TcgSet[]>([]);
  const [setCompletions, setSetCompletions] = useState<SetCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCollections();
      fetchItems();
      fetchWishlists();
    }
  }, [user]);

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collections.',
        variant: 'destructive',
      });
    }
  };

  const fetchItems = async (collectionId?: string) => {
    try {
      setLoading(true);
      let query = supabase.from('collection_items').select('*');

      if (collectionId) {
        query = query.eq('collection_id', collectionId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collection items.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlists = async () => {
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setWishlists(data || []);
    } catch (error) {
      console.error('Error fetching wishlists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load wishlists.',
        variant: 'destructive',
      });
    }
  };

  const fetchSets = async (game?: CardCategory) => {
    try {
      let query = supabase.from('tcg_sets').select('*');

      if (game) {
        query = query.eq('game', game);
      }

      const { data, error } = await query.order('release_date', { ascending: false });

      if (error) throw error;
      setSets(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching sets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load TCG sets.',
        variant: 'destructive',
      });
      return [];
    }
  };

  const fetchSetCompletions = async (game?: CardCategory) => {
    try {
      let query = supabase
        .from('set_completion')
        .select('*, tcg_sets!inner(*)');

      if (game) {
        query = query.eq('tcg_sets.game', game);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSetCompletions(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching set completions:', error);
      return [];
    }
  };

  const createCollection = async (collection: Omit<Collection, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('collections')
        .insert([{ ...collection, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      await fetchCollections();
      toast({
        title: 'Success',
        description: 'Collection created successfully.',
      });
      return data;
    } catch (error) {
      console.error('Error creating collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to create collection.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const addItem = async (item: Partial<CollectionItem>) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('collection_items')
        .insert([{ ...item, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      await fetchItems(item.collection_id);
      toast({
        title: 'Success',
        description: 'Item added to collection.',
      });
      return data;
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateItem = async (id: string, updates: Partial<CollectionItem>) => {
    try {
      const { data, error } = await supabase
        .from('collection_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchItems();
      toast({
        title: 'Success',
        description: 'Item updated successfully.',
      });
      return data;
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('collection_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchItems();
      toast({
        title: 'Success',
        description: 'Item deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const addToWishlist = async (wishlistItem: Partial<Wishlist>) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('wishlists')
        .insert([{ ...wishlistItem, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      await fetchWishlists();
      toast({
        title: 'Success',
        description: 'Added to wishlist.',
      });
      return data;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to add to wishlist.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const removeFromWishlist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchWishlists();
      toast({
        title: 'Success',
        description: 'Removed from wishlist.',
      });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove from wishlist.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateSetCompletion = async (setId: string) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('update_set_completion', {
        p_user_id: user.id,
        p_tcg_set_id: setId,
      });

      if (error) throw error;

      await fetchSetCompletions();
    } catch (error) {
      console.error('Error updating set completion:', error);
    }
  };

  return {
    collections,
    items,
    wishlists,
    sets,
    setCompletions,
    loading,
    fetchCollections,
    fetchItems,
    fetchWishlists,
    fetchSets,
    fetchSetCompletions,
    createCollection,
    addItem,
    updateItem,
    deleteItem,
    addToWishlist,
    removeFromWishlist,
    updateSetCompletion,
  };
};
