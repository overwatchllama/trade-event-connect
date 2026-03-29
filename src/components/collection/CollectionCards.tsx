import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { pokemonTcgApi, type PokemonCard, type PokemonSet } from '@/services/pokemonTcgApi';
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
}

const RARITIES = [
  'Common', 'Uncommon', 'Rare', 'Rare Holo', 'Rare Holo EX',
  'Rare Holo GX', 'Rare Holo V', 'Rare VMAX', 'Rare VSTAR',
  'Rare Ultra', 'Rare Rainbow', 'Rare Secret', 'Rare Shiny',
  'Illustration Rare', 'Special Illustration Rare', 'Hyper Rare',
  'Amazing Rare', 'Rare ACE', 'Rare BREAK', 'Rare Prism Star',
  'Promo',
];

const TYPES = [
  'Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting',
  'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water',
];

const SUPERTYPES = ['Pokémon', 'Trainer', 'Energy'];

const CollectionCards = ({ selectedTcg }: CollectionCardsProps) => {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(40);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSet, setSelectedSet] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSupertype, setSelectedSupertype] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Detail dialog
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);

  // Load sets on mount
  useEffect(() => {
    const loadSets = async () => {
      try {
        const res = await pokemonTcgApi.getSets({ pageSize: 250, orderBy: '-releaseDate' });
        setSets(res.data);
      } catch (e) {
        console.error('Failed to load sets:', e);
      }
    };
    if (selectedTcg === 'pokemon') loadSets();
  }, [selectedTcg]);

  // Build query and fetch cards
  const fetchCards = useCallback(async () => {
    if (selectedTcg !== 'pokemon') return;
    setLoading(true);
    try {
      const queryParts: string[] = [];
      if (searchTerm.trim()) queryParts.push(`name:"*${searchTerm.trim()}*"`);
      if (selectedSet !== 'all') queryParts.push(`set.id:${selectedSet}`);
      if (selectedRarity !== 'all') queryParts.push(`rarity:"${selectedRarity}"`);
      if (selectedType !== 'all') queryParts.push(`types:${selectedType}`);
      if (selectedSupertype !== 'all') queryParts.push(`supertype:${selectedSupertype}`);

      const res = await pokemonTcgApi.searchCards({
        q: queryParts.length > 0 ? queryParts.join(' ') : undefined,
        page,
        pageSize,
        orderBy: '-set.releaseDate,number',
      });
      setCards(res.data || []);
      setTotalCount(res.totalCount || 0);
    } catch (e) {
      console.error('Failed to fetch cards:', e);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTcg, searchTerm, selectedSet, selectedRarity, selectedType, selectedSupertype, page, pageSize]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedSet, selectedRarity, selectedType, selectedSupertype]);

  const totalPages = Math.ceil(totalCount / pageSize);

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
    setPage(1);
  };

  const hasActiveFilters = searchTerm || selectedSet !== 'all' || selectedRarity !== 'all' || selectedType !== 'all' || selectedSupertype !== 'all';

  if (selectedTcg !== 'pokemon') {
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
            <Select value={selectedSet} onValueChange={setSelectedSet}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All Sets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sets</SelectItem>
                {sets.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {totalCount.toLocaleString()} cards
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
            <Select value={selectedRarity} onValueChange={setSelectedRarity}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Rarity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rarities</SelectItem>
                {RARITIES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSupertype} onValueChange={setSelectedSupertype}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Supertype" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Supertypes</SelectItem>
                {SUPERTYPES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Card grid/list */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Loading cards...</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No cards found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {cards.map((card) => {
            const price = getMarketPrice(card);
            return (
              <Card
                key={card.id}
                className="hover:shadow-lg transition-all cursor-pointer group border-border hover:border-primary/40"
                onClick={() => setSelectedCard(card)}
              >
                <CardContent className="p-2">
                  <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden mb-2 bg-muted">
                    <img
                      src={card.images.small}
                      alt={card.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </div>
                  <div className="space-y-0.5 px-0.5">
                    <h4 className="font-medium text-xs text-foreground line-clamp-1">{card.name}</h4>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {card.set.name} · #{card.number}
                    </p>
                    <div className="flex items-center justify-between">
                      {card.rarity && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                          {card.rarity}
                        </Badge>
                      )}
                      {price != null && (
                        <span className="text-[10px] font-semibold text-primary">
                          ${price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          {cards.map((card) => {
            const price = getMarketPrice(card);
            return (
              <Card
                key={card.id}
                className="hover:shadow-sm transition-shadow cursor-pointer border-border hover:border-primary/40"
                onClick={() => setSelectedCard(card)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                      <img src={card.images.small} alt={card.name} className="w-full h-full object-contain" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground">{card.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {card.set.name} · #{card.number}
                        {card.rarity && ` · ${card.rarity}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {card.types && (
                        <div className="flex gap-1">
                          {card.types.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                          ))}
                        </div>
                      )}
                      {card.artist && <span className="text-xs text-muted-foreground hidden lg:inline">{card.artist}</span>}
                      {price != null && (
                        <span className="text-sm font-semibold text-primary min-w-[60px] text-right">
                          ${price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages.toLocaleString()}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Card Detail Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          {selectedCard && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">{selectedCard.name}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-1">
                  <div className="flex justify-center">
                    <img
                      src={selectedCard.images.large}
                      alt={selectedCard.name}
                      className="max-w-full rounded-xl shadow-lg"
                    />
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
                        <div className="flex gap-1.5 mt-1">
                          {selectedCard.types.map((t) => (
                            <Badge key={t} variant="secondary">{t}</Badge>
                          ))}
                        </div>
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

                    {/* Pricing Variants */}
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Market Prices</span>
                      {getPriceVariants(selectedCard).length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {getPriceVariants(selectedCard).map((v) => (
                            <div key={v.label} className="bg-muted/50 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-muted-foreground uppercase">{v.label}</p>
                              <p className="text-sm font-semibold text-primary">
                                {v.price != null ? `$${v.price.toFixed(2)}` : '—'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">No pricing data available</p>
                      )}
                    </div>

                    {selectedCard.tcgplayer?.url && (
                      <a
                        href={selectedCard.tcgplayer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm text-primary hover:underline"
                      >
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
    </div>
  );
};

export default CollectionCards;
