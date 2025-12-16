import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Star, Award } from 'lucide-react';
import { CardSearchDialog } from './CardSearchDialog';
import { CardImageUpload, type CardImage } from './CardImageUpload';
import type { PokemonCard } from '@/services/pokemonTcgApi';
import type { ScryfallCard } from '@/services/scryfallApi';
import type { CardCategory } from '@/hooks/useCollection';

const enhancedAddItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  set_name: z.string().optional(),
  card_number: z.string().optional(),
  rarity: z.string().optional(),
  condition: z.enum(['mint', 'near_mint', 'excellent', 'good', 'light_play', 'moderate_play', 'heavy_play', 'damaged']),
  variant: z.enum(['normal', 'holo', 'reverse_holo', 'first_edition', 'unlimited', 'shadowless', 'stamped', 'prerelease', 'promo', 'full_art', 'secret_rare', 'rainbow_rare', 'gold', 'silver', 'extended_art', 'showcase', 'borderless', 'foil', 'etched', 'gilded']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  purchase_price: z.number().optional(),
  current_market_price: z.number().optional(),
  notes: z.string().optional(),
  acquired_date: z.string().optional(),
  is_graded: z.boolean(),
  grading_company: z.enum(['psa', 'bgs', 'cgc', 'sgc', 'ace', 'none']),
  grade_score: z.number().optional(),
  cert_number: z.string().optional(),
  is_first_edition: z.boolean(),
  is_shadowless: z.boolean(),
  language: z.string(),
  is_signed: z.boolean(),
  location: z.string().optional(),
  for_trade: z.boolean(),
  image_url: z.string().optional(),
});

type EnhancedAddItemForm = z.infer<typeof enhancedAddItemSchema>;

interface EnhancedAddItemDialogProps {
  collectionId: string;
  game: CardCategory;
  onItemAdded: () => void;
  trigger?: React.ReactNode;
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

const variants = [
  { value: 'normal', label: 'Normal' },
  { value: 'holo', label: 'Holo/Foil' },
  { value: 'reverse_holo', label: 'Reverse Holo' },
  { value: 'first_edition', label: '1st Edition' },
  { value: 'unlimited', label: 'Unlimited' },
  { value: 'shadowless', label: 'Shadowless' },
  { value: 'stamped', label: 'Stamped' },
  { value: 'prerelease', label: 'Prerelease' },
  { value: 'promo', label: 'Promo' },
  { value: 'full_art', label: 'Full Art' },
  { value: 'secret_rare', label: 'Secret Rare' },
  { value: 'rainbow_rare', label: 'Rainbow Rare' },
  { value: 'gold', label: 'Gold' },
  { value: 'extended_art', label: 'Extended Art' },
  { value: 'showcase', label: 'Showcase' },
  { value: 'borderless', label: 'Borderless' },
  { value: 'etched', label: 'Etched' },
];

const gradingCompanies = [
  { value: 'none', label: 'Not Graded' },
  { value: 'psa', label: 'PSA' },
  { value: 'bgs', label: 'BGS/Beckett' },
  { value: 'cgc', label: 'CGC' },
  { value: 'sgc', label: 'SGC' },
  { value: 'ace', label: 'ACE' },
];

export const EnhancedAddItemDialog = ({ collectionId, game, onItemAdded, trigger }: EnhancedAddItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addMethod, setAddMethod] = useState<'manual' | 'search'>('search');
  const [cardImages, setCardImages] = useState<CardImage[]>([]);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);

  const form = useForm<EnhancedAddItemForm>({
    resolver: zodResolver(enhancedAddItemSchema),
    defaultValues: {
      name: '',
      set_name: '',
      card_number: '',
      rarity: '',
      condition: 'near_mint',
      variant: 'normal',
      quantity: 1,
      notes: '',
      is_graded: false,
      grading_company: 'none',
      is_first_edition: false,
      is_shadowless: false,
      language: 'en',
      is_signed: false,
      for_trade: false,
    },
  });

  const isGraded = form.watch('is_graded');

  const handleCardSelect = (card: PokemonCard | ScryfallCard) => {
    const isPokemonCard = 'supertype' in card;

    if (isPokemonCard) {
      const pokemonCard = card as PokemonCard;
      form.setValue('name', pokemonCard.name);
      form.setValue('set_name', pokemonCard.set.name);
      form.setValue('card_number', pokemonCard.number);
      form.setValue('rarity', pokemonCard.rarity || '');
      form.setValue('image_url', pokemonCard.images.large);

      // Set market price if available
      const prices = pokemonCard.tcgplayer?.prices;
      if (prices) {
        const normalPrice = prices.normal?.market || prices.holofoil?.market || prices.reverseHolofoil?.market;
        if (normalPrice) {
          form.setValue('current_market_price', normalPrice);
        }
      }
    } else {
      const mtgCard = card as ScryfallCard;
      form.setValue('name', mtgCard.name);
      form.setValue('set_name', mtgCard.set_name);
      form.setValue('card_number', mtgCard.collector_number);
      form.setValue('rarity', mtgCard.rarity);
      form.setValue('image_url', mtgCard.image_uris?.large || mtgCard.image_uris?.normal);

      // Set market price
      const price = mtgCard.prices.usd;
      if (price) {
        form.setValue('current_market_price', parseFloat(price));
      }
    }

    setAddMethod('manual');
    toast({
      title: 'Card Selected',
      description: 'Card details have been pre-filled. You can now customize and add to your collection.',
    });
  };

  const onSubmit = async (data: EnhancedAddItemForm) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: insertedData, error } = await supabase.from('collection_items').insert({
        collection_id: collectionId,
        user_id: user.id,
        name: data.name,
        set_name: data.set_name || null,
        card_number: data.card_number || null,
        rarity: data.rarity || null,
        condition: data.condition,
        variant: data.variant,
        quantity: data.quantity,
        purchase_price: data.purchase_price || null,
        current_market_price: data.current_market_price || null,
        notes: data.notes || null,
        acquired_date: data.acquired_date ? new Date(data.acquired_date).toISOString().split('T')[0] : null,
        is_graded: data.is_graded,
        grading_company: data.grading_company,
        grade_score: data.grade_score || null,
        cert_number: data.cert_number || null,
        is_first_edition: data.is_first_edition,
        is_shadowless: data.is_shadowless,
        language: data.language,
        is_signed: data.is_signed,
        location: data.location || null,
        for_trade: data.for_trade,
        image_url: data.image_url || null,
      }).select().single();

      if (error) throw error;

      // Save item ID for image uploads
      if (insertedData) {
        setSavedItemId(insertedData.id);
      }

      toast({
        title: 'Item Added',
        description: data.is_graded
          ? 'Card added! You can now upload images of your graded card.'
          : 'Your collection item has been added successfully.',
      });

      form.reset();
      setCardImages([]);

      // Don't close dialog if graded card - allow image upload
      if (!data.is_graded) {
        setOpen(false);
        setSavedItemId(null);
      }

      onItemAdded();
    } catch (error) {
      console.error('Error adding item:', error);
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
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Card to Collection</DialogTitle>
          <DialogDescription>
            Search for a card or add manually with detailed information
          </DialogDescription>
        </DialogHeader>

        <Tabs value={addMethod} onValueChange={(v) => setAddMethod(v as 'manual' | 'search')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Search Database
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Plus className="h-4 w-4 mr-2" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="text-center py-8">
              <CardSearchDialog
                game={game}
                onCardSelect={handleCardSelect}
                trigger={
                  <Button size="lg">
                    <Search className="h-5 w-5 mr-2" />
                    Search for Cards
                  </Button>
                }
              />
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                Search the {game === 'pokemon' ? 'Pokémon' : game.toUpperCase()} card database to quickly add cards with prices
              </p>
            </div>
          </TabsContent>

          <TabsContent value="manual">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Card Name *</FormLabel>
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
                            <Input placeholder="e.g., Base Set" {...field} />
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

                    <FormField
                      control={form.control}
                      name="rarity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rarity</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Rare Holo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="variant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variant *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {variants.map((v) => (
                                <SelectItem key={v.value} value={v.value}>
                                  {v.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Condition & Quantity */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Condition & Quantity</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {conditions.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  </div>
                </div>

                {/* Grading */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4 text-amber-600" />
                    <h3 className="font-medium text-sm">Grading Information</h3>
                  </div>
                  <FormField
                    control={form.control}
                    name="is_graded"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>This card is graded</FormLabel>
                          <FormDescription>
                            Check if this card has been professionally graded
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isGraded && (
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="grading_company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grading Company</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {gradingCompanies.map((gc) => (
                                  <SelectItem key={gc.value} value={gc.value}>
                                    {gc.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="grade_score"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grade Score</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.5"
                                min="1"
                                max="10"
                                placeholder="e.g., 9.5"
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
                        name="cert_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cert Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Certificate #" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Pricing</h3>
                  <div className="grid grid-cols-2 gap-4">
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
                              placeholder="$0.00"
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
                              placeholder="$0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Additional Options */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Additional Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storage Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Binder 1, Box 3" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  </div>

                  <div className="flex gap-4">
                    <FormField
                      control={form.control}
                      name="for_trade"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>For Trade</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_signed"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Signed</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Image Upload Section - Shows after card is saved for graded cards */}
                {savedItemId && isGraded && (
                  <div className="space-y-4 border-t pt-4">
                    <CardImageUpload
                      collectionItemId={savedItemId}
                      images={cardImages}
                      onImagesChange={setCardImages}
                    />
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setOpen(false);
                    setSavedItemId(null);
                    setCardImages([]);
                  }}>
                    {savedItemId ? 'Done' : 'Cancel'}
                  </Button>
                  {!savedItemId && (
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Adding...' : 'Add to Collection'}
                    </Button>
                  )}
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
