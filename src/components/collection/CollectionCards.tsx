import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { pokemonTcgApi, type PokemonCard, type PokemonSet } from '@/services/pokemonTcgApi';
import { optcgApi, type OPTCGCard, type OPTCGSet, type OPTCGStarterDeck } from '@/services/optcgApi';
import {
  Search,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2,
  Filter,
  X,
} from 'lucide-react';

interface CollectionCardsProps {
  selectedTcg: string;
  items?: import('@/hooks/useCollection').CollectionItem[];
}

// Pokemon constants
const POKEMON_RARITIES = [
  'Common', 'Uncommon', 'Rare', 'Rare Holo', 'Rare Holo EX',
  'Rare Holo GX', 'Rare Holo V', 'Rare VMAX', 'Rare VSTAR',
  'Rare Ultra', 'Rare Rainbow', 'Rare Secret', 'Rare Shiny',
  'Illustration Rare', 'Special Illustration Rare', 'Hyper Rare',
  'Amazing Rare', 'Rare ACE', 'Rare BREAK', 'Rare Prism Star', 'Promo',
];
const POKEMON_TYPES = [
  'Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting',
  'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water',
];
const POKEMON_SUPERTYPES = ['Pokémon', 'Trainer', 'Energy'];

// One Piece constants
const OP_COLORS = ['Red', 'Blue', 'Green', 'Purple', 'Black', 'Yellow'];
const OP_TYPES = ['Character', 'Event', 'Leader', 'Stage', 'DON!!'];
const OP_RARITIES = ['C', 'UC', 'R', 'SR', 'L', 'SEC', 'SP', 'P'];

const CollectionCards = ({ selectedTcg }: CollectionCardsProps) => {
  // Shared state
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pokemon state
  const [pokemonCards, setPokemonCards] = useState<PokemonCard[]>([]);
  const [pokemonSets, setPokemonSets] = useState<PokemonSet[]>([]);
  const [pokemonTotalCount, setPokemonTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(40);
  const [selectedSet, setSelectedSet] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSupertype, setSelectedSupertype] = useState<string>('all');
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);

  // One Piece state
  const [opCards, setOpCards] = useState<OPTCGCard[]>([]);
  const [opSets, setOpSets] = useState<(OPTCGSet | OPTCGStarterDeck)[]>([]);
  const [opSelectedSet, setOpSelectedSet] = useState<string>('all');
  const [opSelectedColor, setOpSelectedColor] = useState<string>('all');
  const [opSelectedType, setOpSelectedType] = useState<string>('all');
  const [opSelectedRarity, setOpSelectedRarity] = useState<string>('all');
  const [opSelectedCard, setOpSelectedCard] = useState<OPTCGCard | null>(null);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm]);

  // Reset filters on TCG change
  useEffect(() => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedSet('all');
    setSelectedRarity('all');
    setSelectedType('all');
    setSelectedSupertype('all');
    setOpSelectedSet('all');
    setOpSelectedColor('all');
    setOpSelectedType('all');
    setOpSelectedRarity('all');
    setPage(1);
    setPokemonCards([]);
    setOpCards([]);
  }, [selectedTcg]);

  // Load sets on mount
  useEffect(() => {
    if (selectedTcg === 'pokemon') {
      pokemonTcgApi.getSets({ pageSize: 250, orderBy: '-releaseDate' })
        .then(res => setPokemonSets(res.data))
        .catch(e => console.error('Failed to load pokemon sets:', e));
    } else if (selectedTcg === 'onepiece') {
      Promise.all([optcgApi.getAllSets(), optcgApi.getAllStarterDecks()])
        .then(([sets, decks]) => setOpSets([...sets, ...decks]))
        .catch(e => console.error('Failed to load OP sets:', e));
    }
  }, [selectedTcg]);

  // === POKEMON FETCH ===
  const pokemonHasQuery = debouncedSearch.trim() || selectedSet !== 'all' || selectedRarity !== 'all' || selectedType !== 'all' || selectedSupertype !== 'all';

  const fetchPokemonCards = useCallback(async () => {
    if (selectedTcg !== 'pokemon' || !pokemonHasQuery) {
      setPokemonCards([]);
      setPokemonTotalCount(0);
      return;
    }
    setLoading(true);
    try {
      const q: string[] = [];
      if (debouncedSearch.trim()) q.push(`name:"*${debouncedSearch.trim()}*"`);
      if (selectedSet !== 'all') q.push(`set.id:${selectedSet}`);
      if (selectedRarity !== 'all') q.push(`rarity:"${selectedRarity}"`);
      if (selectedType !== 'all') q.push(`types:${selectedType}`);
      if (selectedSupertype !== 'all') q.push(`supertype:${selectedSupertype}`);
      const res = await pokemonTcgApi.searchCards({ q: q.join(' '), page, pageSize, orderBy: '-set.releaseDate,number' });
      setPokemonCards(res.data || []);
      setPokemonTotalCount(res.totalCount || 0);
    } catch (e) {
      console.error('Failed to fetch pokemon cards:', e);
      setPokemonCards([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTcg, debouncedSearch, selectedSet, selectedRarity, selectedType, selectedSupertype, page, pageSize, pokemonHasQuery]);

  useEffect(() => {
    if (selectedTcg === 'pokemon') fetchPokemonCards();
  }, [fetchPokemonCards, selectedTcg]);

  // === ONE PIECE FETCH ===
  const opHasQuery = opSelectedSet !== 'all' || debouncedSearch.trim() || opSelectedColor !== 'all' || opSelectedType !== 'all' || opSelectedRarity !== 'all';

  const fetchOpCards = useCallback(async () => {
    if (selectedTcg !== 'onepiece' || !opHasQuery) {
      setOpCards([]);
      return;
    }
    setLoading(true);
    try {
      let cards: OPTCGCard[] = [];

      if (opSelectedSet !== 'all') {
        // Determine if it's a set or starter deck
        const isBoosterSet = opSets.some(s => 'set_id' in s && (s as OPTCGSet).set_id === opSelectedSet);
        if (isBoosterSet) {
          cards = await optcgApi.getSetCards(opSelectedSet);
        } else {
          cards = await optcgApi.getStarterDeckCards(opSelectedSet);
        }
      } else if (debouncedSearch.trim()) {
        // Use filtered endpoint with name
        cards = await optcgApi.getFilteredCards({ card_name: debouncedSearch.trim() });
      }

      // Apply client-side filters
      if (opSelectedColor !== 'all') cards = cards.filter(c => c.card_color === opSelectedColor);
      if (opSelectedType !== 'all') cards = cards.filter(c => c.card_type === opSelectedType);
      if (opSelectedRarity !== 'all') cards = cards.filter(c => c.rarity === opSelectedRarity);
      if (debouncedSearch.trim() && opSelectedSet !== 'all') {
        const term = debouncedSearch.trim().toLowerCase();
        cards = cards.filter(c => c.card_name.toLowerCase().includes(term));
      }

      setOpCards(cards);
    } catch (e) {
      console.error('Failed to fetch OP cards:', e);
      setOpCards([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTcg, opSelectedSet, debouncedSearch, opSelectedColor, opSelectedType, opSelectedRarity, opSets, opHasQuery]);

  useEffect(() => {
    if (selectedTcg === 'onepiece') fetchOpCards();
  }, [fetchOpCards, selectedTcg]);

  // Reset page on filter change (Pokemon)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedSet, selectedRarity, selectedType, selectedSupertype]);

  const totalPages = Math.ceil(pokemonTotalCount / pageSize);

  const getMarketPrice = (card: PokemonCard) => {
    return pokemonTcgApi.getCardPrice(card, 'holofoil')
      ?? pokemonTcgApi.getCardPrice(card, 'normal')
      ?? pokemonTcgApi.getCardPrice(card, 'reverseHolofoil');
  };

  const getPriceVariants = (card: PokemonCard) => {
    const variants: { label: string; price: number | null }[] = [];
    if (card.tcgplayer?.prices?.normal) variants.push({ label: 'Normal', price: card.tcgplayer.prices.normal.market });
    if (card.tcgplayer?.prices?.holofoil) variants.push({ label: 'Holofoil', price: card.tcgplayer.prices.holofoil.market });
    if (card.tcgplayer?.prices?.reverseHolofoil) variants.push({ label: 'Reverse Holo', price: card.tcgplayer.prices.reverseHolofoil.market });
    if (card.tcgplayer?.prices?.['1stEditionHolofoil']) variants.push({ label: '1st Ed. Holo', price: card.tcgplayer.prices['1stEditionHolofoil'].market });
    return variants;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSet('all');
    setSelectedRarity('all');
    setSelectedType('all');
    setSelectedSupertype('all');
    setOpSelectedSet('all');
    setOpSelectedColor('all');
    setOpSelectedType('all');
    setOpSelectedRarity('all');
    setPage(1);
  };

  const hasActiveFilters = selectedTcg === 'pokemon'
    ? (searchTerm || selectedSet !== 'all' || selectedRarity !== 'all' || selectedType !== 'all' || selectedSupertype !== 'all')
    : (searchTerm || opSelectedSet !== 'all' || opSelectedColor !== 'all' || opSelectedType !== 'all' || opSelectedRarity !== 'all');

  const hasQuery = selectedTcg === 'pokemon' ? pokemonHasQuery : opHasQuery;

  // Get OP set name list for dropdown
  const opSetOptions = useMemo(() => {
    return opSets.map(s => {
      const isSet = 'set_id' in s;
      return {
        id: isSet ? (s as OPTCGSet).set_id : (s as OPTCGStarterDeck).structure_deck_id,
        name: isSet ? (s as OPTCGSet).set_name : (s as OPTCGStarterDeck).structure_deck_name,
      };
    });
  }, [opSets]);

  const opColorMap: Record<string, string> = {
    Red: 'bg-red-500', Blue: 'bg-blue-500', Green: 'bg-green-500',
    Purple: 'bg-purple-500', Black: 'bg-gray-800', Yellow: 'bg-yellow-500',
  };

  if (selectedTcg !== 'pokemon' && selectedTcg !== 'onepiece') {
    return (
      <div className="text-center py-16">
        <Package className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Coming Soon</h3>
        <p className="text-muted-foreground">Card browsing for this TCG is not yet available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cards by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            {selectedTcg === 'pokemon' ? (
              <Select value={selectedSet} onValueChange={setSelectedSet}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="All Sets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sets</SelectItem>
                  {pokemonSets.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={opSelectedSet} onValueChange={setOpSelectedSet}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="All Sets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sets</SelectItem>
                  {opSetOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Filters
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedTcg === 'pokemon'
                ? `${pokemonTotalCount.toLocaleString()} cards`
                : `${opCards.length} cards`
              }
            </span>
            <div className="flex bg-muted rounded-lg p-0.5">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-8 w-8 p-0">
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-8 w-8 p-0">
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border border-border">
            {selectedTcg === 'pokemon' ? (
              <>
                <Select value={selectedRarity} onValueChange={setSelectedRarity}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Rarity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rarities</SelectItem>
                    {POKEMON_RARITIES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {POKEMON_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedSupertype} onValueChange={setSelectedSupertype}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Supertype" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Supertypes</SelectItem>
                    {POKEMON_SUPERTYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Select value={opSelectedColor} onValueChange={setOpSelectedColor}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Color" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colors</SelectItem>
                    {OP_COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={opSelectedType} onValueChange={setOpSelectedType}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {OP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={opSelectedRarity} onValueChange={setOpSelectedRarity}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Rarity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rarities</SelectItem>
                    {OP_RARITIES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        )}
      </div>

      {/* Card grid/list */}
      {!hasQuery ? (
        <div className="text-center py-16">
          <Search className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Select a set or search to browse cards</h3>
          <p className="text-muted-foreground">Choose a set from the dropdown or type a card name to get started.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Loading cards...</p>
        </div>
      ) : (selectedTcg === 'pokemon' ? pokemonCards.length === 0 : opCards.length === 0) ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No cards found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : selectedTcg === 'pokemon' ? (
        // === POKEMON GRID/LIST ===
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {pokemonCards.map(card => {
              const price = getMarketPrice(card);
              return (
                <Card key={card.id} className="hover:shadow-lg transition-all cursor-pointer group border-border hover:border-primary/40" onClick={() => setSelectedCard(card)}>
                  <CardContent className="p-2">
                    <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden mb-2 bg-muted">
                      <img src={card.images.small} alt={card.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                    <div className="space-y-0.5 px-0.5">
                      <h4 className="font-medium text-xs text-foreground line-clamp-1">{card.name}</h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{card.set.name} · #{card.number}</p>
                      <div className="flex items-center justify-between">
                        {card.rarity && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{card.rarity}</Badge>}
                        {price != null && <span className="text-[10px] font-semibold text-primary">${price.toFixed(2)}</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            {pokemonCards.map(card => {
              const price = getMarketPrice(card);
              return (
                <Card key={card.id} className="hover:shadow-sm transition-shadow cursor-pointer border-border hover:border-primary/40" onClick={() => setSelectedCard(card)}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                        <img src={card.images.small} alt={card.name} className="w-full h-full object-contain" loading="lazy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-foreground">{card.name}</h4>
                        <p className="text-xs text-muted-foreground">{card.set.name} · #{card.number}{card.rarity && ` · ${card.rarity}`}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {card.types && <div className="flex gap-1">{card.types.map(t => <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>)}</div>}
                        {price != null && <span className="text-sm font-semibold text-primary min-w-[60px] text-right">${price.toFixed(2)}</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        // === ONE PIECE GRID/LIST ===
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {opCards.map((card, idx) => (
              <Card key={`${card.card_set_id}-${idx}`} className="hover:shadow-lg transition-all cursor-pointer group border-border hover:border-primary/40" onClick={() => setOpSelectedCard(card)}>
                <CardContent className="p-2">
                  <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden mb-2 bg-muted">
                    <img src={card.card_image} alt={card.card_name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" loading="lazy" />
                  </div>
                  <div className="space-y-0.5 px-0.5">
                    <h4 className="font-medium text-xs text-foreground line-clamp-1">{card.card_name}</h4>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{card.set_name} · {card.card_set_id}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{card.rarity}</Badge>
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${opColorMap[card.card_color] || 'bg-muted'}`} title={card.card_color} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {opCards.map((card, idx) => (
              <Card key={`${card.card_set_id}-${idx}`} className="hover:shadow-sm transition-shadow cursor-pointer border-border hover:border-primary/40" onClick={() => setOpSelectedCard(card)}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                      <img src={card.card_image} alt={card.card_name} className="w-full h-full object-contain" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground">{card.card_name}</h4>
                      <p className="text-xs text-muted-foreground">{card.set_name} · {card.card_set_id} · {card.rarity}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{card.card_color}</Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{card.card_type}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Pagination (Pokemon only) */}
      {selectedTcg === 'pokemon' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages.toLocaleString()}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Pokemon Card Detail Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          {selectedCard && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">{selectedCard.name}</DialogTitle>
                <DialogDescription>{selectedCard.set.name} · #{selectedCard.number}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-1">
                  <div className="flex justify-center">
                    <img src={selectedCard.images.large} alt={selectedCard.name} className="max-w-full rounded-xl shadow-lg" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{selectedCard.supertype}{selectedCard.subtypes ? ` — ${selectedCard.subtypes.join(', ')}` : ''}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <img src={selectedCard.set.images.symbol} alt="" className="h-5 w-5" />
                        <span className="text-sm text-foreground">{selectedCard.set.name}</span>
                        <span className="text-sm text-muted-foreground">#{selectedCard.number}/{selectedCard.set.printedTotal}</span>
                      </div>
                    </div>
                    {selectedCard.rarity && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Rarity</span>
                        <p className="text-sm font-medium text-foreground">{selectedCard.rarity}</p>
                      </div>
                    )}
                    {selectedCard.types && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Type</span>
                        <div className="flex gap-1.5 mt-1">{selectedCard.types.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
                      </div>
                    )}
                    {selectedCard.hp && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">HP</span>
                        <p className="text-sm font-medium text-foreground">{selectedCard.hp}</p>
                      </div>
                    )}
                    {selectedCard.attacks && selectedCard.attacks.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Attacks</span>
                        <div className="space-y-2 mt-1">
                          {selectedCard.attacks.map((atk, i) => (
                            <div key={i} className="bg-muted/50 rounded-lg p-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-foreground">{atk.name}</span>
                                {atk.damage && <span className="text-sm font-bold text-primary">{atk.damage}</span>}
                              </div>
                              {atk.text && <p className="text-xs text-muted-foreground mt-0.5">{atk.text}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedCard.artist && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Artist</span>
                        <p className="text-sm text-foreground">{selectedCard.artist}</p>
                      </div>
                    )}
                    <Separator />
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Market Prices</span>
                      {getPriceVariants(selectedCard).length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {getPriceVariants(selectedCard).map(v => (
                            <div key={v.label} className="bg-muted/50 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-muted-foreground uppercase">{v.label}</p>
                              <p className="text-sm font-semibold text-primary">{v.price != null ? `$${v.price.toFixed(2)}` : '—'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">No pricing data available</p>
                      )}
                    </div>
                    {selectedCard.tcgplayer?.url && (
                      <a href={selectedCard.tcgplayer.url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-primary hover:underline">
                        View on TCGplayer →
                      </a>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* One Piece Card Detail Dialog */}
      <Dialog open={!!opSelectedCard} onOpenChange={() => setOpSelectedCard(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          {opSelectedCard && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">{opSelectedCard.card_name}</DialogTitle>
                <DialogDescription>{opSelectedCard.set_name} · {opSelectedCard.card_set_id}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-1">
                  <div className="flex justify-center">
                    <img src={opSelectedCard.card_image} alt={opSelectedCard.card_name} className="max-w-full rounded-xl shadow-lg" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{opSelectedCard.card_type}</Badge>
                      <Badge variant="outline">{opSelectedCard.rarity}</Badge>
                      <span className={`inline-block w-3 h-3 rounded-full ${opColorMap[opSelectedCard.card_color] || 'bg-muted'}`} />
                      <span className="text-sm text-foreground">{opSelectedCard.card_color}</span>
                    </div>

                    {opSelectedCard.card_cost && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Cost</span>
                        <p className="text-sm font-medium text-foreground">{opSelectedCard.card_cost}</p>
                      </div>
                    )}

                    {opSelectedCard.card_power && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Power</span>
                        <p className="text-sm font-medium text-foreground">{opSelectedCard.card_power}</p>
                      </div>
                    )}

                    {opSelectedCard.life && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Life</span>
                        <p className="text-sm font-medium text-foreground">{opSelectedCard.life}</p>
                      </div>
                    )}

                    {opSelectedCard.counter_amount != null && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Counter</span>
                        <p className="text-sm font-medium text-foreground">+{opSelectedCard.counter_amount}</p>
                      </div>
                    )}

                    {opSelectedCard.attribute && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Attribute</span>
                        <p className="text-sm font-medium text-foreground">{opSelectedCard.attribute}</p>
                      </div>
                    )}

                    {opSelectedCard.sub_types && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Sub Types</span>
                        <p className="text-sm text-foreground">{opSelectedCard.sub_types}</p>
                      </div>
                    )}

                    {opSelectedCard.card_text && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Effect</span>
                        <p className="text-sm text-foreground leading-relaxed">{opSelectedCard.card_text}</p>
                      </div>
                    )}

                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionCards;
