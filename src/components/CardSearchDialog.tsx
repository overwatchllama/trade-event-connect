import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, Loader2, Info, History, X } from 'lucide-react';
import { pokemonTcgApi, type PokemonCard } from '@/services/pokemonTcgApi';
import { scryfallApi, type ScryfallCard } from '@/services/scryfallApi';
import {
  getPokemonPriceSource,
  getScryfallPriceSource,
  type PriceSource,
} from '@/services/cardPriceSource';
import { PriceSourceBadge } from '@/components/pricing/PriceSourceBadge';
import {
  getCardSearchHistory,
  recordCardSearch,
  removeCardSearch,
  clearCardSearchHistory,
  summarizeEntry,
  type CardSearchHistoryEntry,
} from '@/services/cardSearchHistory';
import { validateCardNumber } from '@/services/cardNumberValidation';
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
  const [cardNumberQuery, setCardNumberQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(PokemonCard | ScryfallCard)[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSet, setSelectedSet] = useState<string>('all');
  const [sets, setSets] = useState<any[]>([]);
  const [history, setHistory] = useState<CardSearchHistoryEntry[]>([]);
  const [cardNumberError, setCardNumberError] = useState<string | null>(null);

  // Live-validate the card number field but only show errors after the user has typed something.
  const cardNumberValidation = cardNumberQuery.trim()
    ? validateCardNumber(cardNumberQuery)
    : null;
  const showInlineCardNumberError =
    cardNumberValidation && cardNumberValidation.ok === false
      ? cardNumberValidation.error
      : null;

  // Only Pokémon and MTG are persisted to history; the dialog skips it for other catalogs.
  const historyGame: CardSearchHistoryEntry['game'] | null =
    game === 'pokemon' ? 'pokemon' : game === 'mtg' ? 'mtg' : null;

  useEffect(() => {
    if (open) {
      loadSets();
      if (historyGame) {
        setHistory(getCardSearchHistory(historyGame));
      }
    }
  }, [open, game, historyGame]);

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

  const refreshHistory = useCallback(() => {
    if (historyGame) setHistory(getCardSearchHistory(historyGame));
  }, [historyGame]);

  const handleSearch = async () => {
    const trimmedName = searchQuery.trim();
    const trimmedNumber = cardNumberQuery.trim();
    const hasSet = selectedSet !== 'all';

    // New rule: a search is valid if EITHER a name is present, OR (set + number) are present.
    if (!trimmedName && !(hasSet && trimmedNumber)) {
      toast({
        title: 'Search needs more info',
        description: 'Enter a card name, or pick a set and enter the card number from the bottom of the card.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (game === 'pokemon') {
        const parts: string[] = [];
        if (trimmedName) parts.push(`name:${trimmedName}*`);
        if (hasSet) parts.push(`set.id:${selectedSet}`);
        if (trimmedNumber) {
          // Card numbers are usually printed like "25/102" — only the left portion is the actual number.
          const numericPart = trimmedNumber.split('/')[0].trim();
          parts.push(`number:${numericPart}`);
        }

        const response = await pokemonTcgApi.searchCards({
          q: parts.join(' '),
          pageSize: 50,
          orderBy: '-set.releaseDate',
        });
        setSearchResults(response.data);
      } else if (game === 'mtg') {
        const parts: string[] = [];
        if (trimmedName) parts.push(trimmedName);
        if (hasSet) parts.push(`set:${selectedSet}`);
        if (trimmedNumber) parts.push(`cn:${trimmedNumber.split('/')[0].trim()}`);

        const response = await scryfallApi.searchCards(parts.join(' '), { order: 'released', dir: 'desc' });
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
      return;
    } finally {
      setLoading(false);
    }

    // Persist this search as a quick pick for next time.
    if (historyGame) {
      const setOption = sets.find((s) => {
        const value = game === 'pokemon' ? s.id : s.code;
        return value === selectedSet;
      });
      recordCardSearch({
        game: historyGame,
        name: trimmedName,
        setId: selectedSet,
        setLabel: setOption?.name ?? null,
        cardNumber: trimmedNumber,
      });
      refreshHistory();
    }
  };

  /** Re-run a saved search by populating inputs and firing handleSearch on the next tick. */
  const runHistoryEntry = (entry: CardSearchHistoryEntry) => {
    setSearchQuery(entry.name);
    setCardNumberQuery(entry.cardNumber);
    setSelectedSet(entry.setId);
    // Defer so the controlled inputs commit before we read state in handleSearch.
    setTimeout(() => handleSearch(), 0);
  };

  const handleRemoveHistory = (
    e: React.MouseEvent<HTMLButtonElement>,
    entry: CardSearchHistoryEntry,
  ) => {
    e.stopPropagation();
    removeCardSearch(entry);
    refreshHistory();
  };

  const handleClearHistory = () => {
    if (!historyGame) return;
    clearCardSearchHistory(historyGame);
    refreshHistory();
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
    setCardNumberQuery('');
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

  const getSetSymbolUrl = (card: PokemonCard | ScryfallCard): string | null => {
    if (isPokemonCard(card)) {
      return card.set?.images?.symbol ?? null;
    }
    // Scryfall provides set codes; symbols served from Scryfall's set endpoint
    const code = (card as ScryfallCard).set;
    return code ? `https://svgs.scryfall.io/sets/${code}.svg` : null;
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

  const getPriceSource = (card: PokemonCard | ScryfallCard): PriceSource | null => {
    if (isPokemonCard(card)) {
      return getPokemonPriceSource(card);
    }
    return getScryfallPriceSource(card);
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
            Search by name, or pinpoint a card by its set and card number for exact pricing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Controls */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_140px_auto] gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Card name (optional if set + # provided)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
                aria-label="Card name"
              />
            </div>
            <Select value={selectedSet} onValueChange={setSelectedSet}>
              <SelectTrigger aria-label="Filter by set">
                <SelectValue placeholder="All Sets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sets</SelectItem>
                {sets.map((set) => {
                  const symbol = game === 'pokemon' ? set.images?.symbol : null;
                  const value = game === 'pokemon' ? set.id : set.code;
                  return (
                    <SelectItem key={set.id ?? set.code} value={value}>
                      <span className="flex items-center gap-2">
                        {symbol && (
                          <img
                            src={symbol}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-4 w-4 object-contain"
                          />
                        )}
                        <span className="truncate">{set.name}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Input
              placeholder="Card # (e.g. 25)"
              value={cardNumberQuery}
              onChange={(e) => setCardNumberQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              aria-label="Card number"
              inputMode="numeric"
            />
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

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              The <strong>set symbol</strong> is the small icon in the bottom-right of the card art, and the{' '}
              <strong>card number</strong> (e.g. <code>25/102</code>) sits next to it. Match those for exact pricing —
              you can ignore the slash and just enter the left number.
            </span>
          </p>

          {/* Quick picks — recent searches saved per browser */}
          {historyGame && history.length > 0 && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  Recent searches
                </div>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search history"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {history.map((entry) => (
                  <div
                    key={`${entry.game}-${entry.setId}-${entry.name}-${entry.cardNumber}-${entry.lastUsedAt}`}
                    className="group inline-flex items-center gap-1 rounded-full border bg-background pl-2.5 pr-1 py-0.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => runHistoryEntry(entry)}
                      className="truncate max-w-[200px] text-left"
                      title={summarizeEntry(entry)}
                    >
                      {summarizeEntry(entry)}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveHistory(e, entry)}
                      className="rounded-full p-0.5 opacity-50 group-hover:opacity-100 hover:bg-background/80"
                      aria-label={`Remove "${summarizeEntry(entry)}" from recent searches`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  const priceSource = getPriceSource(card);
                  const image = getCardImage(card);
                  const symbol = getSetSymbolUrl(card);

                  return (
                    <Card
                      key={card.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow group"
                      onClick={() => handleCardClick(card)}
                    >
                      <CardContent className="p-3">
                        <div className="aspect-[2/3] bg-muted rounded-lg mb-2 overflow-hidden relative">
                          {image ? (
                            <img
                              src={image}
                              alt={info.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              No Image
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Plus className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <h4 className="font-medium text-sm line-clamp-2 mb-1">
                          {info.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mb-2">
                          {symbol && (
                            <img
                              src={symbol}
                              alt={`${info.set} symbol`}
                              referrerPolicy="no-referrer"
                              className="h-4 w-4 object-contain shrink-0"
                            />
                          )}
                          <p className="text-xs text-muted-foreground truncate">
                            {info.set} • #{info.number}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {info.rarity}
                          </Badge>
                          <PriceSourceBadge source={priceSource} size="sm" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (searchQuery || cardNumberQuery) && !loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No cards found. Double-check the set symbol and card number.</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Search by name, or by set + card number for an exact match.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
