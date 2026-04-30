import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SetCombobox } from '@/components/cards/SetCombobox';
import { Switch } from '@/components/ui/switch';
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
  // When on, force a single exact printing match (set + number, both required).
  // Persisted across sessions per-game so power users keep their preferred mode.
  const exactOnlyStorageKey = `card-search:exact-only:${game}`;
  const [exactOnly, setExactOnly] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(exactOnlyStorageKey) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(exactOnlyStorageKey, exactOnly ? '1' : '0');
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [exactOnly, exactOnlyStorageKey]);

  // When exact mode is on, optionally expand from a single printing to ALL printings that share the
  // same card name + collector number (across sets) so users can compare pricing per printing.
  const allPrintingsStorageKey = `card-search:all-printings:${game}`;
  const [showAllPrintings, setShowAllPrintings] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(allPrintingsStorageKey) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(allPrintingsStorageKey, showAllPrintings ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [showAllPrintings, allPrintingsStorageKey]);
  const cardNumberInputRef = useRef<HTMLInputElement>(null);

  // When the user flips on exact mode and a set is already chosen, jump focus to the
  // card # input so they can immediately type the number from the bottom of the card.
  useEffect(() => {
    if (exactOnly && selectedSet !== 'all' && !cardNumberQuery.trim()) {
      cardNumberInputRef.current?.focus();
    }
    // Intentionally only react to exactOnly toggling on — not to set changes — to avoid stealing focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exactOnly]);

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

    // Validate the card # field if anything was typed — even if name is also present.
    let leftNumber: string | null = null;
    if (trimmedNumber) {
      const result = validateCardNumber(trimmedNumber);
      if (result.ok === false) {
        const message = result.error;
        setCardNumberError(message);
        toast({
          title: 'Invalid card number',
          description: `${message} Examples: 25, 25/102, TG01/TG30.`,
          variant: 'destructive',
        });
        return;
      }
      leftNumber = result.left;
      setCardNumberError(null);
    } else {
      setCardNumberError(null);
    }

    // New rule: a search is valid if EITHER a name is present, OR (set + number) are present.
    if (!trimmedName && !(hasSet && leftNumber)) {
      toast({
        title: 'Search needs more info',
        description: 'Enter a card name, or pick a set and enter the card number from the bottom of the card.',
        variant: 'destructive',
      });
      return;
    }

    // Exact-only mode requires BOTH a set and a card number — name is ignored to guarantee a single printing.
    if (exactOnly && !(hasSet && leftNumber)) {
      toast({
        title: 'Exact match needs set + number',
        description: 'Pick a set and enter the card number to lock onto a single printing for pricing.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (game === 'pokemon') {
        const parts: string[] = [];
        if (exactOnly) {
          // Drop the name to avoid filtering away the exact printing if the name guess is off.
          parts.push(`set.id:${selectedSet}`);
          parts.push(`number:${leftNumber}`);
        } else {
          if (trimmedName) parts.push(`name:${trimmedName}*`);
          if (hasSet) parts.push(`set.id:${selectedSet}`);
          if (leftNumber) parts.push(`number:${leftNumber}`);
        }

        const response = await pokemonTcgApi.searchCards({
          q: parts.join(' '),
          pageSize: exactOnly ? 1 : 50,
          orderBy: '-set.releaseDate',
        });
        setSearchResults(response.data);
      } else if (game === 'mtg') {
        const parts: string[] = [];
        if (exactOnly) {
          parts.push(`set:${selectedSet}`);
          parts.push(`cn:${leftNumber}`);
        } else {
          if (trimmedName) parts.push(trimmedName);
          if (hasSet) parts.push(`set:${selectedSet}`);
          if (leftNumber) parts.push(`cn:${leftNumber}`);
        }

        const response = await scryfallApi.searchCards(parts.join(' '), { order: 'released', dir: 'desc' });
        setSearchResults(exactOnly ? response.data.slice(0, 1) : response.data);
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
            <SetCombobox
              sets={sets}
              game={game}
              value={selectedSet}
              onChange={setSelectedSet}
            />
            <div className="flex flex-col gap-1">
              <Input
                ref={cardNumberInputRef}
                placeholder="Card # (e.g. 25 or 25/102)"
                value={cardNumberQuery}
                onChange={(e) => {
                  setCardNumberQuery(e.target.value);
                  if (cardNumberError) setCardNumberError(null);
                }}
                onKeyPress={handleKeyPress}
                aria-label="Card number"
                aria-invalid={!!showInlineCardNumberError || !!cardNumberError}
                aria-describedby={
                  showInlineCardNumberError || cardNumberError ? 'card-number-error' : undefined
                }
                inputMode="text"
                className={
                  showInlineCardNumberError || cardNumberError
                    ? 'border-destructive focus-visible:ring-destructive'
                    : undefined
                }
              />
              {(showInlineCardNumberError || cardNumberError) && (
                <p id="card-number-error" className="text-[11px] text-destructive leading-tight">
                  {cardNumberError ?? showInlineCardNumberError}
                </p>
              )}
            </div>
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

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-start gap-2 text-xs text-muted-foreground flex-1 min-w-[240px]">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                The <strong>set symbol</strong> is the small icon in the bottom-right of the card art, and the{' '}
                <strong>card number</strong> (e.g. <code>25/102</code>) sits next to it. Match those for exact pricing —
                you can ignore the slash and just enter the left number.
              </span>
            </p>
            <label
              htmlFor="exact-only-toggle"
              className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none rounded-md border bg-muted/30 px-2.5 py-1.5"
              title="Force a single exact printing match using set + card number. Name is ignored."
            >
              <Switch
                id="exact-only-toggle"
                checked={exactOnly}
                onCheckedChange={setExactOnly}
                aria-label="Exact set and number only"
              />
              <span>Exact set + # only</span>
            </label>
          </div>

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
              <div className="space-y-3">
                {exactOnly && searchQuery.trim() && (
                  <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Exact mode is on, so the card name was ignored — results are matched only by{' '}
                      <strong>set + card number</strong> to lock onto a single printing.
                    </span>
                  </div>
                )}
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
              </div>
            ) : (searchQuery || cardNumberQuery) && !loading ? (
              exactOnly ? (
                <div className="text-center py-12 text-muted-foreground space-y-3">
                  <Search className="h-12 w-12 mx-auto opacity-50" />
                  <div>
                    <p className="font-medium text-foreground">No exact match found</p>
                    <p className="text-sm mt-1">
                      No printing matches that set + card number exactly. The number might be off by a digit, or the
                      printing may live in a different set (promos, special editions, etc.).
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setExactOnly(false);
                      setTimeout(() => handleSearch(), 0);
                    }}
                  >
                    Turn off exact mode & search nearby printings
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No cards found. Double-check the set symbol and card number.</p>
                </div>
              )
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
