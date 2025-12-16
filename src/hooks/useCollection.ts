import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export type CardCategory = 'pokemon' | 'mtg' | 'yugioh' | 'sports' | 'lorcana' | 'onepiece' | 'other';
export type CardCondition = 'mint' | 'near_mint' | 'excellent' | 'good' | 'light_play' | 'moderate_play' | 'heavy_play' | 'damaged';

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
  created_at: string;
  updated_at: string;
}

export const useCollection = () => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCollections();
      fetchItems();
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
      
      // Map database fields to our interface
      const mappedItems: CollectionItem[] = (data || []).map(item => ({
        id: item.id,
        collection_id: item.collection_id,
        user_id: item.user_id,
        name: item.name,
        set_name: item.set_name,
        card_number: item.card_number,
        rarity: item.rarity,
        condition: item.condition,
        quantity: item.quantity,
        purchase_price: item.purchase_price,
        current_market_price: item.current_market_price,
        estimated_value: item.estimated_value,
        notes: item.notes,
        image_url: item.image_url,
        acquired_date: item.acquired_date,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
      
      setItems(mappedItems);
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
      if (!item.collection_id) throw new Error('Collection ID is required');

      const { data, error } = await supabase
        .from('collection_items')
        .insert([{ 
          name: item.name || '',
          collection_id: item.collection_id,
          user_id: user.id,
          set_name: item.set_name,
          card_number: item.card_number,
          rarity: item.rarity,
          condition: item.condition || 'near_mint',
          quantity: item.quantity || 1,
          purchase_price: item.purchase_price,
          current_market_price: item.current_market_price,
          estimated_value: item.estimated_value,
          notes: item.notes,
          image_url: item.image_url,
          acquired_date: item.acquired_date,
        }])
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

  return {
    collections,
    items,
    loading,
    fetchCollections,
    fetchItems,
    createCollection,
    addItem,
    updateItem,
    deleteItem,
  };
};
