import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, Loader2 } from 'lucide-react';
import { pokemonTcgApi, type PokemonCard } from '@/services/pokemonTcgApi';
import { scryfallApi, type ScryfallCard } from '@/services/scryfallApi';
import { toast } from '@/hooks/use-toast';
import type { CardCategory } from '@/hooks/useCollection';

interface CardSearchDialogProps {
  game: CardCategory;
  onCardSelect: (card: PokemonCard | ScryfallCard) => void;
  trigger?: React.ReactNode;
}

export const CardSearchDialog: React.FC<CardSearchDialogProps> = ({ game, onCardSelect, trigger }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(PokemonCard | ScryfallCard)[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSet, setSelectedSet] = useState<string>('all');
  const [sets, setSets] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadSets();
    }
  }, [open, game]);

  const loadSets = async () => {
    try {
      if (game === 'pokemon') {
        const response = await pokemonTcgApi.getSets({ pageSize: 250, orderBy: '-releaseDate' });
        setSets(response.data);
      } else if (game === 'mtg') {
        const setsData = await scryfallApi.getSets();
        setSets(setsData.filter(s => !s.digital).slice(0, 100));
      }
    } catch (error) {
      console.error('Error loading sets:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Search Required',
        description: 'Please enter a card name to search.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (game === 'pokemon') {
        let query = `name:${searchQuery}*`;
        if (selectedSet !== 'all') {
          query += ` set.id:${selectedSet}`;
        }

        const response = await pokemonTcgApi.searchCards({
          q: query,
          pageSize: 50,
          orderBy: '-set.releaseDate',
        });
        setSearchResults(response.data);
      } else if (game === 'mtg') {
        let query = searchQuery;
        if (selectedSet !== 'all') {
          query = `${searchQuery} set:${selectedSet}`;
        }

        const response = await scryfallApi.searchCards(query, { order: 'released', dir: 'desc' });
        setSearchResults(response.data);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: 'Search Failed',
        description: error.message || 'Failed to search for cards.',
        variant: 'destructive',
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCardClick = (card: PokemonCard | ScryfallCard) => {
    onCardSelect(card);
    setOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const isPokemonCard = (card: PokemonCard | ScryfallCard): card is PokemonCard => {
    return 'supertype' in card;
  };

  const getCardImage = (card: PokemonCard | ScryfallCard): string => {
    if (isPokemonCard(card)) {
      return card.images.small;
    } else {
      return card.image_uris?.normal || card.image_uris?.small || '';
    }
  };

  const getCardInfo = (card: PokemonCard | ScryfallCard): { name: string; set: string; number: string; rarity: string } => {
    if (isPokemonCard(card)) {
      return {
        name: card.name,
        set: card.set.name,
        number: card.number,
        rarity: card.rarity || 'Unknown',
      };
    } else {
      return {
        name: card.name,
        set: card.set_name,
        number: card.collector_number,
        rarity: card.rarity,
      };
    }
  };

  const getCardPrice = (card: PokemonCard | ScryfallCard): string => {
    if (isPokemonCard(card)) {
      const price = pokemonTcgApi.getCardPrice(card, 'normal');
      return price ? `$${price.toFixed(2)}` : 'N/A';
    } else {
      const price = scryfallApi.getCardPrice(card, 'usd');
      return price ? `$${price.toFixed(2)}` : 'N/A';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Search className="h-4 w-4 mr-2" />
            Search Cards
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Search {game === 'pokemon' ? 'Pokémon' : game.toUpperCase()} Cards</DialogTitle>
          <DialogDescription>
            Search the card database to add cards to your collection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Controls */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Enter card name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Select value={selectedSet} onValueChange={setSelectedSet}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Sets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sets</SelectItem>
                {sets.map((set) => (
                  <SelectItem key={set.id} value={game === 'pokemon' ? set.id : set.code}>
                    {set.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {searchResults.map((card) => {
                  const info = getCardInfo(card);
                  const price = getCardPrice(card);
                  const image = getCardImage(card);

                  return (
                    <Card
                      key={card.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow group"
                      onClick={() => handleCardClick(card)}
                    >
                      <CardContent className="p-3">
                        <div className="aspect-[2/3] bg-slate-100 dark:bg-slate-800 rounded-lg mb-2 overflow-hidden relative">
                          {image ? (
                            <img
                              src={image}
                              alt={info.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              No Image
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Plus className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <h4 className="font-medium text-sm text-slate-900 dark:text-white line-clamp-2 mb-1">
                          {info.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                          {info.set} • #{info.number}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {info.rarity}
                          </Badge>
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {price}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : searchQuery && !loading ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No cards found. Try a different search term.</p>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Enter a card name and click Search to find cards</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
