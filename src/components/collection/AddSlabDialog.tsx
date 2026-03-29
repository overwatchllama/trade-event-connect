import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { pokemonTcgApi, type PokemonCard } from '@/services/pokemonTcgApi';
import { optcgApi, type OPTCGCard } from '@/services/optcgApi';

const GRADING_COMPANIES = [
  { id: 'psa', acronym: 'PSA', full: 'Professional Sports Authenticator' },
  { id: 'bgs', acronym: 'BGS', full: 'Beckett Grading Services' },
  { id: 'sgc', acronym: 'SGC', full: 'Sportscard Guaranty Corporation' },
  { id: 'cgc', acronym: 'CGC', full: 'Certified Guaranty Company' },
  { id: 'ags', acronym: 'AGS', full: 'Automated Grading Systems' },
  { id: 'tcg', acronym: 'TCG', full: 'TCG Grading' },
];

const GRADES_FULL = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'];
const GRADES_WHOLE = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

interface SelectedCard {
  name: string;
  setName: string;
  imageUrl: string | null;
  cardNumber: string | null;
  rarity: string | null;
}

interface AddSlabDialogProps {
  selectedTcg?: string;
}

const AddSlabDialog = ({ selectedTcg = 'pokemon' }: AddSlabDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'search' | 'details'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SelectedCard[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected card
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);

  // Grading details
  const [company, setCompany] = useState('');
  const [grade, setGrade] = useState('');
  const [isBlackLabel, setIsBlackLabel] = useState(false);
  const [certNumber, setCertNumber] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');

  const searchCards = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      if (selectedTcg === 'pokemon') {
        const response = await pokemonTcgApi.searchCards({
          q: `name:${query}*`,
          pageSize: 20,
          select: 'id,name,set,number,rarity,images',
        });
        setSearchResults(
          response.data.map((c: PokemonCard) => ({
            name: c.name,
            setName: c.set.name,
            imageUrl: c.images.small,
            cardNumber: c.number,
            rarity: c.rarity || null,
          }))
        );
      } else if (selectedTcg === 'onepiece') {
        const results = await optcgApi.getFilteredCards({ card_name: query });
        setSearchResults(
          results.slice(0, 20).map((c: OPTCGCard) => ({
            name: c.card_name,
            setName: c.set_name,
            imageUrl: c.card_image || null,
            cardNumber: c.card_set_id,
            rarity: c.rarity || null,
          }))
        );
      }
    } catch (err) {
      console.error('Card search failed:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [selectedTcg]);

  // Debounced search
  useEffect(() => {
    if (step !== 'search') return;
    const timer = setTimeout(() => searchCards(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchCards, step]);

  const handleSelectCard = (card: SelectedCard) => {
    setSelectedCard(card);
    setStep('details');
  };

  const handleSubmit = () => {
    if (!company || !grade || !selectedCard) {
      toast({ title: 'Missing fields', description: 'Please select a card and fill in company and grade.', variant: 'destructive' });
      return;
    }
    toast({
      title: 'Slab Added',
      description: `${selectedCard.name} - ${company.toUpperCase()} ${grade}${isBlackLabel ? ' (BLK)' : ''}`,
    });
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setStep('search');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCard(null);
    setCompany('');
    setGrade('');
    setIsBlackLabel(false);
    setCertNumber('');
    setPurchasePrice('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Slab
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'search' ? 'Select Card for Slab' : 'Grading Details'}
          </DialogTitle>
        </DialogHeader>

        {step === 'search' && (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${selectedTcg === 'pokemon' ? 'Pokémon' : 'One Piece'} cards...`}
                className="pl-9"
                autoFocus
              />
            </div>

            <ScrollArea className="flex-1 max-h-[50vh]">
              {searching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                <p className="text-center text-muted-foreground text-sm py-8">No cards found</p>
              )}

              {!searching && searchQuery.length < 2 && (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Type at least 2 characters to search
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 p-1">
                {searchResults.map((card, idx) => (
                  <button
                    key={`${card.name}-${card.setName}-${card.cardNumber}-${idx}`}
                    onClick={() => handleSelectCard(card)}
                    className="group rounded-lg border border-border bg-card hover:border-primary hover:ring-1 hover:ring-primary transition-all overflow-hidden text-left"
                  >
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full aspect-[2.5/3.5] object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full aspect-[2.5/3.5] bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">No image</span>
                      </div>
                    )}
                    <div className="p-1.5">
                      <p className="text-xs font-medium text-foreground truncate">{card.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{card.setName}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 'details' && selectedCard && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('search')} className="gap-1 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Button>

            {/* Selected card preview */}
            <div className="flex gap-3 p-3 rounded-lg border border-border bg-muted/50">
              {selectedCard.imageUrl && (
                <img src={selectedCard.imageUrl} alt={selectedCard.name} className="w-16 h-auto rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{selectedCard.name}</p>
                <p className="text-sm text-muted-foreground">{selectedCard.setName}</p>
                {selectedCard.cardNumber && (
                  <p className="text-xs text-muted-foreground">#{selectedCard.cardNumber}</p>
                )}
                {selectedCard.rarity && (
                  <p className="text-xs text-muted-foreground">{selectedCard.rarity}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Grading Company *</Label>
              <Select value={company} onValueChange={(v) => { setCompany(v); setIsBlackLabel(false); }}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {GRADING_COMPANIES.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.acronym} — {c.full}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Grade *</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {company === 'bgs' && (
                <div className="flex-1">
                  <Label>Black Label</Label>
                  <Select value={isBlackLabel ? 'yes' : 'no'} onValueChange={(v) => setIsBlackLabel(v === 'yes')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">BLK (Black Label)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label>Cert # (Certificate Number)</Label>
              <Input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} placeholder="e.g. 12345678" />
            </div>

            <div>
              <Label>Purchase Price</Label>
              <Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00" />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>Add Slab</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddSlabDialog;
