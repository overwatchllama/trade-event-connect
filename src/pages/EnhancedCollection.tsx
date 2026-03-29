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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Sealed Products</h2>
            </div>
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground mb-1">No sealed products yet</h3>
                <p className="text-muted-foreground text-sm">
                  Track your sealed booster boxes, ETBs, tins, and other unopened products here.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Slabs Tab */}
        {activeTab === 'slabs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Graded Slabs</h2>
            </div>
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground mb-1">No slabs yet</h3>
                <p className="text-muted-foreground text-sm">
                  Track your PSA, BGS, CGC, and other graded cards here.
                </p>
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
