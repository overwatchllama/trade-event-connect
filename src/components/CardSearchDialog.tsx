import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SetCombobox } from '@/components/cards/SetCombobox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, Loader2, Info, History, X, HelpCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { trackCardSearchEvent } from '@/services/cardSearchAnalytics';
import { toast } from '@/hooks/use-toast';
import type { CardCategory } from '@/hooks/useCollection';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface CardSearchDialogProps {
  game: CardCategory;
  onCardSelect: (card: PokemonCard | ScryfallCard) => void;
  trigger?: React.ReactNode;
}

// Dedupe printings returned by the "all printings" expansion. APIs occasionally return
// the same printing twice (reprints indexed under multiple promo codes, language variants
// sharing identifiers, etc). We collapse on a stable key: set id + collector number, with
// the card id as a final fallback. First occurrence wins (results are pre-sorted newest first).
function dedupePrintings<T extends PokemonCard | ScryfallCard>(cards: T[], game: 'pokemon' | 'mtg'): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const c of cards) {
    const setId = game === 'pokemon'
      ? (c as PokemonCard).set?.id ?? ''
      : (c as ScryfallCard).set ?? '';
    const number = game === 'pokemon'
      ? (c as PokemonCard).number ?? ''
      : (c as ScryfallCard).collector_number ?? '';
    const key = setId && number ? `${setId}::${number}` : `id::${(c as any).id ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export const CardSearchDialog: React.FC<CardSearchDialogProps> = ({ game, onCardSelect, trigger }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cardNumberQuery, setCardNumberQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(PokemonCard | ScryfallCard)[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandingPrintings, setExpandingPrintings] = useState(false);
  // Server-reported total of matching printings for the last "show all printings" expansion.
  // Used to display "Showing N of ~M" and how many are hidden by the cap. Null = no expansion done yet.
  const [allPrintingsTotal, setAllPrintingsTotal] = useState<number | null>(null);
  type AllPrintingsSort = 'release-desc' | 'release-asc' | 'price-asc' | 'price-desc';
  const [allPrintingsSort, setAllPrintingsSort] = useState<AllPrintingsSort>('release-desc');
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

  // Cap on how many printings the "Show all printings" expansion fetches and renders.
  // Persisted per browser AND synced to the user's profile (when signed in) so the preference
  // follows them across devices. Lower caps keep the dialog snappy on slow connections.
  const ALL_PRINTINGS_CAP_OPTIONS = [10, 25, 50, 100] as const;
  type AllPrintingsCap = typeof ALL_PRINTINGS_CAP_OPTIONS[number];
  const allPrintingsCapKey = 'card-search:all-printings-cap';
  const { user } = useAuth();
  const [allPrintingsCap, setAllPrintingsCap] = useState<AllPrintingsCap>(() => {
    if (typeof window === 'undefined') return 25;
    try {
      const raw = Number(window.localStorage.getItem(allPrintingsCapKey));
      return (ALL_PRINTINGS_CAP_OPTIONS as readonly number[]).includes(raw)
        ? (raw as AllPrintingsCap)
        : 25;
    } catch {
      return 25;
    }
  });
  // Track whether we've hydrated from the profile yet so we don't overwrite the
  // server value with the local default on first render.
  const profileCapHydrated = useRef(false);

  // Hydrate cap from the user's profile on sign-in / dialog open.
  useEffect(() => {
    if (!user) {
      profileCapHydrated.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('all_printings_cap')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const remote = (data as any)?.all_printings_cap;
      if (!error && (ALL_PRINTINGS_CAP_OPTIONS as readonly number[]).includes(Number(remote))) {
        setAllPrintingsCap(Number(remote) as AllPrintingsCap);
      }
      profileCapHydrated.current = true;
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    try {
      window.localStorage.setItem(allPrintingsCapKey, String(allPrintingsCap));
    } catch {
      // ignore
    }
    // Persist to profile when signed in (after initial hydration to avoid clobbering).
    if (user && profileCapHydrated.current) {
      supabase
        .from('profiles')
        .update({ all_printings_cap: allPrintingsCap } as any)
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.warn('Failed to sync all-printings cap to profile:', error.message);
        });
    }
  }, [allPrintingsCap, user]);

  // Client-side paging over grouped printings (page size matches the cap so each page fits the cap).
  const ALL_PRINTINGS_PAGE_SIZE = 12;
  const [allPrintingsPage, setAllPrintingsPage] = useState(1);

  // Reset to first page whenever the underlying dataset, sort, or cap changes.
  useEffect(() => {
    setAllPrintingsPage(1);
  }, [searchResults, allPrintingsSort, allPrintingsCap]);

  // Dismissable inline note shown above results when exact-only mode is active.
  // Persisted so power users who already understand the rule don't have to keep dismissing it.
  const exactNoteDismissedKey = 'card-search:exact-note-dismissed';
  const [exactNoteDismissed, setExactNoteDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(exactNoteDismissedKey) === '1';
    } catch {
      return false;
    }
  });
  const dismissExactNote = () => {
    setExactNoteDismissed(true);
    try {
      window.localStorage.setItem(exactNoteDismissedKey, '1');
    } catch {
      // ignore
    }
  };
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

    // "Show all printings" expands the exact match across sets by re-querying by card name.
    // Without a name we have nothing to expand on, so require it up front with a clear message.
    if (exactOnly && showAllPrintings && !trimmedName) {
      toast({
        title: 'Card name required to show all printings',
        description: 'Enter the card name so we can find every printing across sets. Or turn off "Show all printings" to look up just this set + number.',
        variant: 'destructive',
      });
      return;
    }

    // Track when exact mode is about to silently ignore a typed name. Helps us measure
    // how often users hit the recovery flows (notice button, empty-state CTA).
    if (exactOnly && trimmedName && historyGame) {
      trackCardSearchEvent('card_search.exact_disabled_name', {
        game: historyGame,
        ignoredName: trimmedName,
        hadSet: hasSet,
        hadNumber: !!leftNumber,
      });
    }

    setLoading(true);
    setAllPrintingsTotal(null);
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
          pageSize: exactOnly && !showAllPrintings ? 1 : 50,
          orderBy: '-set.releaseDate',
        });
        let results = response.data;

        // Expand: if exact + show-all, do a second query for all printings sharing this card's
        // name + collector number across every set. Sorted newest first for easier price comparison.
        if (exactOnly && showAllPrintings && results[0]) {
          setExpandingPrintings(true);
          try {
            const baseName = results[0].name.replace(/"/g, '');
            const allResp = await pokemonTcgApi.searchCards({
              q: `name:"${baseName}" number:${leftNumber}`,
              pageSize: allPrintingsCap,
              orderBy: '-set.releaseDate',
            });
            if (allResp.data.length > 0) {
              results = dedupePrintings(allResp.data, 'pokemon').slice(0, allPrintingsCap);
            }
            // totalCount reflects the full server-side match count (pre-cap, pre-dedupe).
            if (typeof allResp.totalCount === 'number') {
              setAllPrintingsTotal(allResp.totalCount);
            }
          } finally {
            setExpandingPrintings(false);
          }
        }
        setSearchResults(results);
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
        let results = response.data;
        if (exactOnly && !showAllPrintings) {
          results = results.slice(0, 1);
        } else if (exactOnly && showAllPrintings && results[0]) {
          // Scryfall: re-query by exact name + collector number across all sets/printings.
          setExpandingPrintings(true);
          try {
            const baseName = results[0].name.replace(/"/g, '\\"');
            const allResp = await scryfallApi.searchCards(
              `!"${baseName}" cn:${leftNumber}`,
              { order: 'released', dir: 'desc' },
            );
            if (allResp.data.length > 0) {
              results = dedupePrintings(allResp.data, 'mtg').slice(0, allPrintingsCap);
            }
            // Scryfall returns total_cards for the full server-side match count.
            if (typeof allResp.total_cards === 'number') {
              setAllPrintingsTotal(allResp.total_cards);
            }
          } finally {
            setExpandingPrintings(false);
          }
        }
        setSearchResults(results);
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
      setExpandingPrintings(false);
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
            <TooltipProvider delayDuration={150}>
              <div className="flex flex-wrap items-start gap-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="exact-only-toggle"
                      className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none rounded-md border bg-muted/30 px-2.5 py-1.5"
                    >
                      <Switch
                        id="exact-only-toggle"
                        checked={exactOnly}
                        onCheckedChange={setExactOnly}
                        aria-label="Exact set and number only"
                        aria-describedby="exact-only-help"
                      />
                      <span>Exact set + # only</span>
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="What does Exact set + # only do?"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs leading-snug">
                        <p className="font-medium mb-1">Card name matching is disabled</p>
                        <p>
                          Results are matched only by the <strong>set</strong> and <strong>card number</strong> from
                          the bottom of the card. The name field is ignored so a typo or alt-form name can't filter
                          out the exact printing you're pricing.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p id="exact-only-help" className="text-[11px] text-muted-foreground pl-1">
                    Name is ignored — uses set + card # only.
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="all-printings-toggle"
                    className={`flex items-center gap-2 text-xs font-medium select-none rounded-md border px-2.5 py-1.5 transition-opacity ${
                      exactOnly ? 'cursor-pointer bg-muted/30' : 'cursor-not-allowed bg-muted/10 opacity-50'
                    }`}
                    title={
                      exactOnly
                        ? 'Expand to all printings of this card across sets for fuller pricing comparison. Requires a card name.'
                        : 'Turn on Exact set + # only first.'
                    }
                  >
                    <Switch
                      id="all-printings-toggle"
                      checked={showAllPrintings}
                      onCheckedChange={setShowAllPrintings}
                      disabled={!exactOnly}
                      aria-describedby="all-printings-help"
                      aria-label="Show all printings of this card"
                    />
                    <span>Show all printings</span>
                  </label>
                  {exactOnly && showAllPrintings && (
                    <p id="all-printings-help" className="text-[11px] text-muted-foreground pl-1">
                      Card name required to match printings across sets.
                    </p>
                  )}
                </div>
              </div>
            </TooltipProvider>
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
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                {expandingPrintings && (
                  <p className="text-xs text-muted-foreground max-w-xs" role="status" aria-live="polite">
                    Expanding to all printings to pull pricing across sets…
                  </p>
                )}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {exactOnly &&
                  (showAllPrintings || searchQuery.trim()) &&
                  // The plain (non-all-printings) note is dismissible; the all-printings summary always shows.
                  (showAllPrintings || !exactNoteDismissed) && (
                  <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <div className="flex-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      {showAllPrintings ? (
                        <span>
                          Showing <strong>{searchResults.length} printing{searchResults.length === 1 ? '' : 's'}</strong>{' '}
                          of this card across sets, grouped by set+number for easier price comparison. Pick the
                          printing that matches your copy.
                        </span>
                      ) : (
                        <>
                          <span>
                            Exact mode is on, so the card name was ignored — results are matched only by{' '}
                            <strong>set + card number</strong> to lock onto a single printing.
                          </span>
                          {searchQuery.trim() && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[11px]"
                              onClick={() => {
                                if (historyGame) {
                                  trackCardSearchEvent('card_search.exact_recovery_clicked', {
                                    game: historyGame,
                                    source: 'results-note',
                                    ignoredName: searchQuery.trim(),
                                  });
                                }
                                setExactOnly(false);
                                setTimeout(() => handleSearch(), 0);
                              }}
                            >
                              Search with name too
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    {!showAllPrintings && (
                      <button
                        type="button"
                        onClick={dismissExactNote}
                        className="shrink-0 rounded p-0.5 text-muted-foreground/70 hover:text-foreground hover:bg-background/60 transition-colors"
                        aria-label="Dismiss exact-mode notice (won't show again)"
                        title="Don't show this again"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
                {(() => {
                  const renderCard = (card: PokemonCard | ScryfallCard) => {
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
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">{info.name}</h4>
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
                  };

                  // When showing all printings in exact mode, group cards by "Set name • #number"
                  // so users can scan price differences between printings of the same card.
                  if (exactOnly && showAllPrintings) {
                    const groups = new Map<string, (PokemonCard | ScryfallCard)[]>();
                    for (const card of searchResults) {
                      const info = getCardInfo(card);
                      const key = `${info.set} • #${info.number}`;
                      if (!groups.has(key)) groups.set(key, []);
                      groups.get(key)!.push(card);
                    }

                    // Per-group representative for sorting: cheapest priced printing in the group,
                    // and the newest release date among its printings.
                    const getReleaseTime = (card: PokemonCard | ScryfallCard): number => {
                      const raw = (card as PokemonCard).set?.releaseDate
                        ?? (card as ScryfallCard).released_at
                        ?? null;
                      if (!raw) return 0;
                      const t = new Date(raw).getTime();
                      return Number.isFinite(t) ? t : 0;
                    };
                    const getMinPrice = (cards: (PokemonCard | ScryfallCard)[]): number | null => {
                      let min: number | null = null;
                      for (const c of cards) {
                        const p = getPriceSource(c)?.price;
                        if (typeof p === 'number' && p > 0 && (min === null || p < min)) min = p;
                      }
                      return min;
                    };
                    const getMaxPrice = (cards: (PokemonCard | ScryfallCard)[]): number | null => {
                      let max: number | null = null;
                      for (const c of cards) {
                        const p = getPriceSource(c)?.price;
                        if (typeof p === 'number' && p > 0 && (max === null || p > max)) max = p;
                      }
                      return max;
                    };
                    const getMaxRelease = (cards: (PokemonCard | ScryfallCard)[]): number =>
                      cards.reduce((acc, c) => Math.max(acc, getReleaseTime(c)), 0);

                    const sortedGroups = Array.from(groups.entries()).sort(([, a], [, b]) => {
                      switch (allPrintingsSort) {
                        case 'release-asc':
                          return getMaxRelease(a) - getMaxRelease(b);
                        case 'price-asc': {
                          const pa = getMinPrice(a);
                          const pb = getMinPrice(b);
                          if (pa === null && pb === null) return 0;
                          if (pa === null) return 1; // unpriced last
                          if (pb === null) return -1;
                          return pa - pb;
                        }
                        case 'price-desc': {
                          const pa = getMaxPrice(a);
                          const pb = getMaxPrice(b);
                          if (pa === null && pb === null) return 0;
                          if (pa === null) return 1;
                          if (pb === null) return -1;
                          return pb - pa;
                        }
                        case 'release-desc':
                        default:
                          return getMaxRelease(b) - getMaxRelease(a);
                      }
                    });

                    const totalGroups = sortedGroups.length;
                    const totalPages = Math.max(1, Math.ceil(totalGroups / ALL_PRINTINGS_PAGE_SIZE));
                    const safePage = Math.min(allPrintingsPage, totalPages);
                    const pageStart = (safePage - 1) * ALL_PRINTINGS_PAGE_SIZE;
                    const pageGroups = sortedGroups.slice(pageStart, pageStart + ALL_PRINTINGS_PAGE_SIZE);
                    const capHit = searchResults.length >= allPrintingsCap;

                    return (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <label htmlFor="all-printings-cap" className="text-xs text-muted-foreground">
                            Max printings
                          </label>
                          <Select
                            value={String(allPrintingsCap)}
                            onValueChange={(v) => setAllPrintingsCap(Number(v) as AllPrintingsCap)}
                          >
                            <SelectTrigger id="all-printings-cap" className="h-8 w-[90px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_PRINTINGS_CAP_OPTIONS.map((n) => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <label htmlFor="all-printings-sort" className="text-xs text-muted-foreground ml-2">
                            Sort
                          </label>
                          <Select
                            value={allPrintingsSort}
                            onValueChange={(v) => setAllPrintingsSort(v as AllPrintingsSort)}
                          >
                            <SelectTrigger id="all-printings-sort" className="h-8 w-[200px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="release-desc">Newest release first</SelectItem>
                              <SelectItem value="release-asc">Oldest release first</SelectItem>
                              <SelectItem value="price-asc">Lowest price first</SelectItem>
                              <SelectItem value="price-desc">Highest price first</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(allPrintingsTotal !== null || capHit) && (() => {
                          const shown = searchResults.length;
                          const total = allPrintingsTotal;
                          const hidden = total !== null ? Math.max(0, total - shown) : null;
                          return (
                            <p className="text-[11px] text-muted-foreground">
                              {total !== null ? (
                                <>Showing {shown} of ~{total} matching printing{total === 1 ? '' : 's'}</>
                              ) : (
                                <>Showing the first {shown} printings</>
                              )}
                              {hidden !== null && hidden > 0 && (
                                <> · <span className="font-medium text-foreground">{hidden} hidden by cap</span></>
                              )}
                              {(capHit || (hidden !== null && hidden > 0)) && (
                                <> — raise the Max printings limit above to fetch more (slower).</>
                              )}
                            </p>
                          );
                        })()}
                        {pageGroups.map(([label, cards]) => (
                          <div key={label} className="space-y-2">
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">
                              {label}{' '}
                              <span className="font-normal normal-case tracking-normal text-[11px]">
                                ({cards.length} printing{cards.length === 1 ? '' : 's'})
                              </span>
                            </h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {cards.map(renderCard)}
                            </div>
                          </div>
                        ))}
                        {totalPages > 1 && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={safePage <= 1}
                              onClick={() => setAllPrintingsPage((p) => Math.max(1, p - 1))}
                            >
                              Previous
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              Page {safePage} of {totalPages} • {totalGroups} printing group{totalGroups === 1 ? '' : 's'}
                            </span>
                            <div className="flex items-center gap-1">
                              <label htmlFor="all-printings-jump" className="text-xs text-muted-foreground">
                                Jump to
                              </label>
                              <Input
                                id="all-printings-jump"
                                type="number"
                                min={1}
                                max={totalPages}
                                inputMode="numeric"
                                value={safePage}
                                onChange={(e) => {
                                  const n = Number(e.target.value);
                                  if (!Number.isFinite(n)) return;
                                  setAllPrintingsPage(Math.min(totalPages, Math.max(1, Math.floor(n))));
                                }}
                                className="h-8 w-16 text-xs"
                                aria-label={`Jump to page (1 to ${totalPages})`}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={safePage >= totalPages}
                              onClick={() => setAllPrintingsPage((p) => Math.min(totalPages, p + 1))}
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {searchResults.map(renderCard)}
                    </div>
                  );
                })()}
              </div>
            ) : (searchQuery || cardNumberQuery) && !loading ? (
              exactOnly ? (
                <div className="text-center py-12 text-muted-foreground space-y-3">
                  <Search className="h-12 w-12 mx-auto opacity-50" />
                  {searchQuery.trim() ? (
                    // User typed a name AND has exact mode on. Their name was ignored — call that out
                    // explicitly so they know to either turn off exact mode or fix the set/#.
                    <div>
                      <p className="font-medium text-foreground">No exact match for that set + #</p>
                      <p className="text-sm mt-1">
                        Exact mode ignored the name <strong>"{searchQuery.trim()}"</strong> and matched only on the
                        set + card number — and nothing came back. Double-check the card # against the bottom of the
                        card, or turn off exact mode to search by name across all sets.
                      </p>
                    </div>
                  ) : (
                    // Pure set + # lookup with no name hint at all.
                    <div>
                      <p className="font-medium text-foreground">No printing at this set + #</p>
                      <p className="text-sm mt-1">
                        That set doesn't have a card numbered <strong>{cardNumberQuery.trim() || '—'}</strong>. The
                        printing may live in a different set (promos, secret rares, alt-arts, etc.) — try removing
                        the set or adding the card name.
                      </p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (historyGame) {
                        trackCardSearchEvent('card_search.exact_recovery_clicked', {
                          game: historyGame,
                          source: 'empty-state',
                          ignoredName: searchQuery.trim() || undefined,
                        });
                      }
                      setExactOnly(false);
                      setTimeout(() => handleSearch(), 0);
                    }}
                  >
                    {searchQuery.trim()
                      ? 'Search by name across all sets'
                      : 'Turn off exact mode & search nearby printings'}
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
