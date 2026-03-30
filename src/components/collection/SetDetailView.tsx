import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { pokemonTcgApi, type PokemonCard } from '@/services/pokemonTcgApi';
import { type CollectionItem } from '@/hooks/useCollection';
import {
  ArrowLeft, Search, Grid3X3, List, Loader2, Plus, Minus, MoreVertical, Info, Award,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

// --- Variant definitions per set ---
interface VariantDef {
  key: string;
  label: string;
  description: string;
}

const getCardVariants = (card: PokemonCard): VariantDef[] => {
  const variants: VariantDef[] = [];
  const prices = card.tcgplayer?.prices;

  if (prices?.normal) {
    variants.push({
      key: 'normal',
      label: 'Normal',
      description: 'This is the non-holographic standard set variant. Standard set variants are shown as the first column on official checklists.',
    });
  }
  if (prices?.reverseHolofoil) {
    variants.push({
      key: 'reverseHolofoil',
      label: 'Reverse Holo',
      description: 'The standard set (Normal or Normal Holo variant) often has a complementary set called the parallel set. This parallel set is shown as the second column on official checklists. Reverse Holo is a parallel set variant that features a reverse holographic pattern.',
    });
  }
  if (prices?.holofoil) {
    variants.push({
      key: 'holofoil',
      label: 'Holofoil',
      description: 'This variant features a holographic foil pattern on the card artwork. Holofoil cards are typically found in rare or higher rarity slots.',
    });
  }
  if (prices?.['1stEditionHolofoil']) {
    variants.push({
      key: '1stEditionHolofoil',
      label: '1st Edition Holo',
      description: 'A first edition holographic variant from early Pokémon TCG sets. These are highly collectible due to their limited print run.',
    });
  }

  // If no pricing data, provide standard variants based on rarity
  if (variants.length === 0) {
    variants.push({
      key: 'normal',
      label: 'Normal',
      description: 'This is the non-holographic standard set variant.',
    });
    // Most common cards can have reverse holo
    if (card.rarity && !['Rare Secret', 'Rare Rainbow', 'Hyper Rare', 'Illustration Rare', 'Special Illustration Rare'].includes(card.rarity)) {
      variants.push({
        key: 'reverseHolofoil',
        label: 'Reverse Holo',
        description: 'Reverse Holo is a parallel set variant that features a reverse holographic pattern.',
      });
    }
  }

  return variants;
};

const CONDITIONS = [
  { value: 'mint', label: 'Mint' },
  { value: 'near_mint', label: 'Near Mint' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'light_play', label: 'Light Play' },
  { value: 'moderate_play', label: 'Moderate Play' },
  { value: 'heavy_play', label: 'Heavy Play' },
  { value: 'damaged', label: 'Damaged' },
];

const LANGUAGES = [
  { value: 'EN', label: 'English (EN)' },
  { value: 'JA', label: 'Japanese (JA)' },
  { value: 'DE', label: 'German (DE)' },
  { value: 'FR', label: 'French (FR)' },
  { value: 'ES', label: 'Spanish (ES)' },
  { value: 'IT', label: 'Italian (IT)' },
  { value: 'PT', label: 'Portuguese (PT)' },
  { value: 'KO', label: 'Korean (KO)' },
  { value: 'ZH-TW', label: 'Chinese Trad. (ZH-TW)' },
  { value: 'ZH-CN', label: 'Chinese Simpl. (ZH-CN)' },
  { value: 'TH', label: 'Thai (TH)' },
  { value: 'ID', label: 'Indonesian (ID)' },
];

interface SetDetailViewProps {
  setId: string;
  setName: string;
  setTotal: number;
  setLogoUrl?: string;
  setSymbolUrl?: string;
  items: CollectionItem[];
  onBack: () => void;
  onAddToCollection?: (card: PokemonCard, variant: string, quantity: number, condition: string, language: string, notes: string, isGraded: boolean) => void;
}

const SetDetailView = ({ setId, setName, setTotal, setLogoUrl, setSymbolUrl, items, onBack, onAddToCollection }: SetDetailViewProps) => {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'images' | 'list'>('images');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'in_collection' | 'not_in_collection'>('all');
  const pageSize = 60;

  // Card action states
  const [variantGuideCard, setVariantGuideCard] = useState<PokemonCard | null>(null);
  const [addCardDialog, setAddCardDialog] = useState<{ card: PokemonCard; variant: string } | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [addCondition, setAddCondition] = useState('near_mint');
  const [addLanguage, setAddLanguage] = useState('EN');
  const [addNotes, setAddNotes] = useState('');
  const [addIsGraded, setAddIsGraded] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  // Owned count per card name
  const ownedMap = new Map<string, number>();
  items.forEach(item => {
    if (item.set_name === setName) {
      ownedMap.set(item.name, (ownedMap.get(item.name) || 0) + item.quantity);
    }
  });
  const totalOwned = Array.from(ownedMap.values()).reduce((s, v) => s + v, 0);
  const completion = setTotal > 0 ? Math.min(100, Math.round((ownedMap.size / setTotal) * 100)) : 0;

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const q = debouncedSearch.trim()
        ? `set.id:${setId} name:"*${debouncedSearch.trim()}*"`
        : `set.id:${setId}`;
      const res = await pokemonTcgApi.searchCards({ q, page, pageSize, orderBy: 'number' });
      setCards(res.data || []);
      setTotalCount(res.totalCount || 0);
    } catch (e) {
      console.error('Failed to load set cards:', e);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [setId, debouncedSearch, page, pageSize]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const getPrice = (card: PokemonCard) => {
    return pokemonTcgApi.getCardPrice(card, 'normal')
      ?? pokemonTcgApi.getCardPrice(card, 'holofoil')
      ?? pokemonTcgApi.getCardPrice(card, 'reverseHolofoil');
  };

  const openAddDialog = (card: PokemonCard, variant: string) => {
    setAddCardDialog({ card, variant });
    setAddQuantity(1);
    setAddCondition('near_mint');
    setAddLanguage('EN');
    setAddNotes('');
    setAddIsGraded(false);
  };

  const handleAdd = () => {
    if (!addCardDialog || !onAddToCollection) return;
    onAddToCollection(addCardDialog.card, addCardDialog.variant, addQuantity, addCondition, addLanguage, addNotes, addIsGraded);
    if (addAnother) {
      setAddQuantity(1);
      setAddNotes('');
    } else {
      setAddCardDialog(null);
    }
  };

  const filteredCards = cards;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {setLogoUrl && <img src={setLogoUrl} alt={setName} className="h-8 object-contain" />}
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">{setName}</h2>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-foreground">{ownedMap.size}/{setTotal}</span>
        <Progress value={completion} className="flex-1 h-2" />
        <span className="text-sm text-muted-foreground">{completion}%</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            <Button variant={viewMode === 'images' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('images')} className="h-7 px-3 text-xs gap-1.5">
              <Grid3X3 className="h-3.5 w-3.5" /> Images
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-7 px-3 text-xs gap-1.5">
              <List className="h-3.5 w-3.5" /> List
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search cards..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-56 h-8 text-sm" />
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Loading cards...</p>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No cards found.</div>
      ) : viewMode === 'images' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredCards.map(card => {
            const price = getPrice(card);
            const variants = getCardVariants(card);
            const owned = ownedMap.get(card.name) || 0;

            return (
              <div key={card.id} className="space-y-1">
                <Card className="hover:shadow-lg transition-all group border-border hover:border-primary/40 overflow-hidden">
                  <CardContent className="p-2">
                    <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden mb-1.5 bg-muted relative">
                      <img src={card.images.small} alt={card.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{card.number}/{card.set.printedTotal}</p>
                    {price != null && (
                      <p className="text-xs font-semibold text-primary">${price.toFixed(2)}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Action bar: owned count + variant menu */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-medium text-foreground w-4 text-center">{owned}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => {
                      if (variants.length === 1) {
                        openAddDialog(card, variants[0].key);
                      }
                    }}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1" align="end">
                      {variants.map(v => (
                        <button
                          key={v.key}
                          onClick={() => openAddDialog(card, v.key)}
                          className="flex items-center justify-between w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Plus className="h-3.5 w-3.5 text-primary" />
                            {v.label}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{owned}</Badge>
                        </button>
                      ))}
                      <Separator className="my-1" />
                      <button
                        onClick={() => setVariantGuideCard(card)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                      >
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        Card variant guide
                      </button>
                      <button
                        onClick={() => openAddDialog(card, variants[0]?.key || 'normal')}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        Add with more options
                      </button>
                      <button
                        onClick={() => {
                          openAddDialog(card, variants[0]?.key || 'normal');
                          setAddIsGraded(true);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                      >
                        <Award className="h-3.5 w-3.5 text-muted-foreground" />
                        Add graded card
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {filteredCards.map(card => {
            const price = getPrice(card);
            const variants = getCardVariants(card);
            const owned = ownedMap.get(card.name) || 0;

            return (
              <div key={card.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors">
                <div className="w-8 h-11 rounded overflow-hidden bg-muted flex-shrink-0">
                  <img src={card.images.small} alt={card.name} className="w-full h-full object-contain" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{card.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">#{card.number}</span>
                </div>
                {card.rarity && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 hidden sm:inline-flex">{card.rarity}</Badge>}
                {price != null && <span className="text-sm font-semibold text-primary w-16 text-right">${price.toFixed(2)}</span>}
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Minus className="h-3 w-3" /></Button>
                  <span className="text-xs font-medium w-4 text-center">{owned}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => variants.length === 1 && openAddDialog(card, variants[0].key)}><Plus className="h-3 w-3" /></Button>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1" align="end">
                    {variants.map(v => (
                      <button key={v.key} onClick={() => openAddDialog(card, v.key)} className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted rounded-md">
                        <span className="flex items-center gap-2"><Plus className="h-3.5 w-3.5 text-primary" />{v.label}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{owned}</Badge>
                      </button>
                    ))}
                    <Separator className="my-1" />
                    <button onClick={() => setVariantGuideCard(card)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted rounded-md">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" /> Card variant guide
                    </button>
                    <button onClick={() => openAddDialog(card, variants[0]?.key || 'normal')} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted rounded-md">
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" /> Add with more options
                    </button>
                    <button onClick={() => { openAddDialog(card, variants[0]?.key || 'normal'); setAddIsGraded(true); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted rounded-md">
                      <Award className="h-3.5 w-3.5 text-muted-foreground" /> Add graded card
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Variant Guide Dialog */}
      <Dialog open={!!variantGuideCard} onOpenChange={() => setVariantGuideCard(null)}>
        <DialogContent className="max-w-md">
          {variantGuideCard && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  Variants of <em>{variantGuideCard.name} ({setName} {variantGuideCard.number}/{variantGuideCard.set.printedTotal})</em>
                </DialogTitle>
                <DialogDescription>Available variants for this card</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {getCardVariants(variantGuideCard).map(v => (
                  <div key={v.key}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block w-3 h-3 rounded-sm ${v.key === 'normal' ? 'bg-orange-400' : v.key === 'reverseHolofoil' ? 'bg-blue-400' : v.key === 'holofoil' ? 'bg-yellow-400' : 'bg-purple-400'}`} />
                      <h4 className="font-semibold text-foreground">{v.label}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setVariantGuideCard(null)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add to Collection Dialog */}
      <Dialog open={!!addCardDialog} onOpenChange={() => setAddCardDialog(null)}>
        <DialogContent className="max-w-md">
          {addCardDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  Add <em>{addCardDialog.card.name} ({setName} {addCardDialog.card.number}/{addCardDialog.card.set.printedTotal})</em>
                </DialogTitle>
                <DialogDescription>Add this card to your collection</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {/* Quantity */}
                <div>
                  <Label className="text-sm font-medium">Quantity *</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-semibold text-foreground w-8 text-center">{addQuantity}</span>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setAddQuantity(addQuantity + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Variant */}
                <div>
                  <Label className="text-sm font-medium">Card variant *</Label>
                  <Select value={addCardDialog.variant} onValueChange={v => setAddCardDialog({ ...addCardDialog, variant: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {getCardVariants(addCardDialog.card).map(v => (
                        <SelectItem key={v.key} value={v.key}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button onClick={() => setVariantGuideCard(addCardDialog.card)} className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1">
                    <Info className="h-3 w-3" /> Card variant guide
                  </button>
                </div>

                {/* Language */}
                <div>
                  <Label className="text-sm font-medium">Card language *</Label>
                  <Select value={addLanguage} onValueChange={setAddLanguage}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Condition */}
                <div>
                  <Label className="text-sm font-medium">Card condition *</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Switch checked={addIsGraded} onCheckedChange={setAddIsGraded} />
                    <span className="text-sm text-foreground">Graded card</span>
                  </div>
                  <Select value={addCondition} onValueChange={setAddCondition}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-sm font-medium">Note (optional)</Label>
                  <Textarea
                    value={addNotes}
                    onChange={e => setAddNotes(e.target.value)}
                    placeholder="Optionally add a note, such as specific damage, card grade qualifiers, or subgrades."
                    className="mt-1.5 min-h-[80px]"
                  />
                </div>
              </div>

              <Separator />
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={addAnother} onChange={e => setAddAnother(e.target.checked)} className="accent-primary" />
                  Add another entry after this
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAddCardDialog(null)}>Cancel</Button>
                  <Button onClick={handleAdd} className="bg-primary text-primary-foreground">Add to collection</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SetDetailView;
