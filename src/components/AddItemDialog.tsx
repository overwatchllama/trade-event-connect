import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

const addItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  set_name: z.string().optional(),
  card_number: z.string().optional(),
  rarity: z.string().optional(),
  condition: z.enum(['mint', 'near_mint', 'excellent', 'good', 'light_play', 'moderate_play', 'heavy_play', 'damaged']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  purchase_price: z.number().optional(),
  current_market_price: z.number().optional(),
  notes: z.string().optional(),
  acquired_date: z.string().optional(),
});

type AddItemForm = z.infer<typeof addItemSchema>;

interface AddItemDialogProps {
  collectionId: string;
  onItemAdded: () => void;
}

const conditions = [
  { value: 'mint', label: 'Mint (M)' },
  { value: 'near_mint', label: 'Near Mint (NM)' },
  { value: 'excellent', label: 'Excellent (EX)' },
  { value: 'good', label: 'Good (GD)' },
  { value: 'light_play', label: 'Light Play (LP)' },
  { value: 'moderate_play', label: 'Moderate Play (MP)' },
  { value: 'heavy_play', label: 'Heavy Play (HP)' },
  { value: 'damaged', label: 'Damaged (DMG)' },
];

export const AddItemDialog = ({ collectionId, onItemAdded }: AddItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<AddItemForm>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      name: '',
      set_name: '',
      card_number: '',
      rarity: '',
      condition: 'near_mint',
      quantity: 1,
      notes: '',
    },
  });

  const onSubmit = async (data: AddItemForm) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('collection_items').insert({
        collection_id: collectionId,
        user_id: user.id,
        name: data.name,
        set_name: data.set_name || null,
        card_number: data.card_number || null,
        rarity: data.rarity || null,
        condition: data.condition,
        quantity: data.quantity,
        purchase_price: data.purchase_price || null,
        current_market_price: data.current_market_price || null,
        notes: data.notes || null,
        acquired_date: data.acquired_date ? new Date(data.acquired_date).toISOString().split('T')[0] : null,
      });

      if (error) throw error;

      toast({
        title: 'Item Added',
        description: 'Your collection item has been added successfully.',
      });

      form.reset();
      setOpen(false);
      onItemAdded();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Collection Item</DialogTitle>
          <DialogDescription>
            Add a new item to your collection with detailed information and pricing.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Charizard, Black Lotus" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="set_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Set Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Base Set, Alpha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="card_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 4/102" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rarity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rarity</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Rare, Mythic" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {conditions.map((condition) => (
                          <SelectItem key={condition.value} value={condition.value}>
                            {condition.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="purchase_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Price</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="current_market_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Price</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="acquired_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acquired Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this item..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};