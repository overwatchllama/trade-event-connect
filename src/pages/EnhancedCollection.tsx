import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Header from '@/components/Header';
import CollectionSubNav from '@/components/collection/CollectionSubNav';
import CollectionDashboard from '@/components/collection/CollectionDashboard';
import CollectionSets from '@/components/collection/CollectionSets';
import CollectionCards from '@/components/collection/CollectionCards';
import AddSlabDialog from '@/components/collection/AddSlabDialog';
import CollectionSealed from '@/components/collection/CollectionSealed';
import { CreateCollectionDialog } from '@/components/CreateCollectionDialog';
import { EnhancedAddItemDialog } from '@/components/EnhancedAddItemDialog';
import { WishlistDialog } from '@/components/WishlistDialog';
import { useAuth } from '@/hooks/useAuth';
import { useCollection, type CardCategory, type CollectionItem } from '@/hooks/useCollection';
import { toast } from '@/hooks/use-toast';
import { exportToCSV, calculateStats } from '@/utils/collectionExport';
import {
  Search,
  Plus,
  Package,
  Download,
  Grid3X3,
  List,
} from 'lucide-react';

const GRADING_COMPANIES = [
  { id: 'psa', acronym: 'PSA', full: 'Professional Sports Authenticator', desc: 'The market leader; recognized for highest resale value and strong brand recognition.' },
  { id: 'bgs', acronym: 'BGS', full: 'Beckett Grading Services', desc: 'Known for detailed subgrades and prestigious "Black Label" 10s for perfect cards.' },
  { id: 'sgc', acronym: 'SGC', full: 'Sportscard Guaranty Corporation', desc: 'Popular for fast turnaround times, high-quality slabs, and competitive pricing.' },
  { id: 'cgc', acronym: 'CGC', full: 'Certified Guaranty Company', desc: 'A leader in comic grading that has become highly popular for TCGs like Pokémon.' },
  { id: 'ags', acronym: 'AGS', full: 'Automated Grading Systems', desc: 'Known for using AI technology for objective, consistent, and fast grading.' },
  { id: 'tcg', acronym: 'TCG', full: 'TCG Grading', desc: 'A grading service focused on trading card games with competitive pricing and quality slabs.' },
];

const EnhancedCollection = () => {
  const { user, loading: authLoading } = useAuth();
  const { collections, items, loading, fetchCollections, fetchItems } = useCollection();

  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTcg, setSelectedTcg] = useState<string>('pokemon');
  const [selectedLanguage, setSelectedLanguage] = useState('international');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [selectedGraders, setSelectedGraders] = useState<string[]>([]);
  const [slabSearch, setSlabSearch] = useState('');
  const [slabSearchType, setSlabSearchType] = useState<'name' | 'cert'>('name');

  const toggleGrader = (id: string) => {
    setSelectedGraders(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (user) {
      fetchCollections();
      fetchItems();
    }
  }, [user]);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.set_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
    const matchesCollection =
      selectedCollection === 'all' || item.collection_id === selectedCollection;
    return matchesSearch && matchesCondition && matchesCollection;
  });

  const handleExport = () => {
    try {
      exportToCSV(filteredItems, `collection-${selectedTcg}-${Date.now()}.csv`);
      toast({ title: 'Export Successful', description: `Exported ${filteredItems.length} cards.` });
    } catch (error: any) {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' });
    }
  };

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      mint: 'bg-emerald-500',
      near_mint: 'bg-emerald-400',
      excellent: 'bg-blue-400',
      good: 'bg-yellow-400',
      light_play: 'bg-orange-400',
      moderate_play: 'bg-orange-500',
      heavy_play: 'bg-red-400',
      damaged: 'bg-red-500',
    };
    return colors[condition] || 'bg-muted';
  };

  const formatCondition = (condition: string) =>
    condition
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mt-20">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to view and manage your collection.
            </p>
            <Button onClick={() => (window.location.href = '/auth')} size="lg">
              Sign In to Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CollectionSubNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedTcg={selectedTcg}
        onTcgChange={setSelectedTcg}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
      />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <CollectionDashboard items={items} onNavigate={setActiveTab} />
        )}

        {/* Sets Tab */}
        {activeTab === 'sets' && (
          <CollectionSets items={items} selectedTcg={selectedTcg} />
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && (
          <CollectionCards selectedTcg={selectedTcg} />
        )}

        {/* Sealed Tab */}
        {activeTab === 'sealed' && (
          <CollectionSealed selectedTcg={selectedTcg} />
        )}

        {/* Slabs Tab */}
        {activeTab === 'slabs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Graded Slabs</h2>
              <AddSlabDialog selectedTcg={selectedTcg} />
            </div>

            {/* Search Bar */}
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <Select value={slabSearchType} onValueChange={(v: 'name' | 'cert') => setSlabSearchType(v)}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="cert">Cert #</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={slabSearch}
                          onChange={(e) => setSlabSearch(e.target.value)}
                          placeholder={slabSearchType === 'cert' ? 'Enter certificate number...' : 'Search by card name...'}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grading Company Filter */}
            <Card>
              <CardContent className="pt-4 pb-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">Filter by Grading Company</p>
                <TooltipProvider>
                  <div className="flex flex-wrap gap-4">
                    {GRADING_COMPANIES.map(company => (
                      <Tooltip key={company.id}>
                        <TooltipTrigger asChild>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <Checkbox
                              checked={selectedGraders.includes(company.id)}
                              onCheckedChange={() => toggleGrader(company.id)}
                            />
                            <span className="text-sm font-medium text-foreground">{company.acronym}</span>
                          </label>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="font-semibold">{company.full}</p>
                          <p className="text-xs text-muted-foreground mt-1">{company.desc}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>

            {/* Empty State */}
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground mb-1">No slabs yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Track your PSA, BGS, CGC, SGC, AGS, and other graded cards here.
                </p>
                <AddSlabDialog />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lists Tab */}
        {activeTab === 'lists' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">My Lists</h2>
              <div className="flex items-center gap-2">
                <WishlistDialog game={selectedTcg as CardCategory} />
              </div>
            </div>
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground mb-1">No lists yet</h3>
                <p className="text-muted-foreground text-sm">
                  Create wishlists, trade lists, or custom lists to organize your collection goals.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default EnhancedCollection;
