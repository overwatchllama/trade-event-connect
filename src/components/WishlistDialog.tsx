import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, X, Plus, Star } from 'lucide-react';
import { useCollection } from '@/hooks/useCollection';
import { CardSearchDialog } from './CardSearchDialog';
import type { PokemonCard } from '@/services/pokemonTcgApi';
import type { ScryfallCard } from '@/services/scryfallApi';
import type { CardCategory } from '@/hooks/useCollection';
import { toast } from '@/hooks/use-toast';

interface WishlistDialogProps {
  game: CardCategory;
  trigger?: React.ReactNode;
}

export const WishlistDialog: React.FC<WishlistDialogProps> = ({ game, trigger }) => {
  const [open, setOpen] = useState(false);
  const { wishlists, fetchWishlists, addToWishlist, removeFromWishlist } = useCollection();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchWishlists();
    }
  }, [open]);

  const handleCardSelect = async (card: PokemonCard | ScryfallCard) => {
    const isPokemonCard = 'supertype' in card;

    const wishlistItem = {
      name: card.name,
      set_name: isPokemonCard ? (card as PokemonCard).set.name : (card as ScryfallCard).set_name,
      card_number: isPokemonCard ? (card as PokemonCard).number : (card as ScryfallCard).collector_number,
      variant: 'normal' as const,
      priority: 3,
    };

    try {
      setLoading(true);
      await addToWishlist(wishlistItem);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeFromWishlist(id);
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'bg-red-500';
    if (priority === 3) return 'bg-orange-500';
    if (priority === 2) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 4) return 'High';
    if (priority === 3) return 'Medium';
    if (priority === 2) return 'Low';
    return 'Wishlist';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Heart className="h-4 w-4 mr-2" />
            Wishlist ({wishlists.length})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Heart className="h-5 w-5 mr-2 text-red-500" />
            My Wishlist
          </DialogTitle>
          <DialogDescription>
            Cards you want to add to your collection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {wishlists.length} {wishlists.length === 1 ? 'item' : 'items'} in your wishlist
            </p>
            <CardSearchDialog
              game={game}
              onCardSelect={handleCardSelect}
              trigger={
                <Button size="sm" variant="outline" disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              }
            />
          </div>

          <ScrollArea className="h-[500px] pr-4">
            {wishlists.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  Your wishlist is empty
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Start adding cards you want to collect
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {wishlists.map((item) => (
                  <Card key={item.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-slate-900 dark:text-white">
                              {item.name}
                            </h4>
                            <Badge
                              className={`${getPriorityColor(item.priority)} text-white`}
                            >
                              <Star className="h-3 w-3 mr-1" />
                              {getPriorityLabel(item.priority)}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-slate-600 dark:text-slate-400">
                            {item.set_name && <span>{item.set_name}</span>}
                            {item.card_number && <span>#{item.card_number}</span>}
                            {item.variant && item.variant !== 'normal' && (
                              <Badge variant="secondary" className="text-xs">
                                {item.variant}
                              </Badge>
                            )}
                          </div>
                          {item.max_price && (
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                              Max price: ${item.max_price.toFixed(2)}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
