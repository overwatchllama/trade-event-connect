import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
          <div className="space-y-4">
            {/* Cards Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cards..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={conditionFilter} onValueChange={setConditionFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    <SelectItem value="mint">Mint</SelectItem>
                    <SelectItem value="near_mint">Near Mint</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All Collections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Collections</SelectItem>
                    {collections.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredItems.length === 0}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export
                </Button>
                <WishlistDialog game={selectedTcg as CardCategory} />
                <CreateCollectionDialog onCollectionCreated={fetchCollections}>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Collection
                  </Button>
                </CreateCollectionDialog>
                {collections.length > 0 && (
                  <EnhancedAddItemDialog
                    collectionId={selectedCollection === 'all' ? collections[0]?.id : selectedCollection}
                    game={selectedTcg as CardCategory}
                    onItemAdded={fetchItems}
                  />
                )}
                <div className="flex bg-muted rounded-lg p-0.5">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8 w-8 p-0"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8 w-8 p-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Cards Content */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-muted-foreground mt-4">Loading cards...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No cards found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm
                    ? 'Try adjusting your search or filters'
                    : 'Start building your collection by adding cards'}
                </p>
                {collections.length > 0 && (
                  <EnhancedAddItemDialog
                    collectionId={selectedCollection === 'all' ? collections[0]?.id : selectedCollection}
                    game={selectedTcg as CardCategory}
                    onItemAdded={fetchItems}
                  />
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow group border-border">
                    <CardContent className="p-3">
                      <div className="aspect-[2/3] bg-muted rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-xs">
                            {item.quantity}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm text-foreground line-clamp-2">{item.name}</h4>
                        {item.set_name && (
                          <p className="text-xs text-muted-foreground">
                            {item.set_name}
                            {item.card_number && ` • #${item.card_number}`}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className={`w-2 h-2 rounded-full ${getConditionColor(item.condition)}`} />
                          {item.current_market_price && (
                            <span className="text-xs font-medium text-primary">
                              ${item.current_market_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-sm transition-shadow border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{item.name}</h4>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              {item.set_name && <span>{item.set_name}</span>}
                              {item.card_number && <span>#{item.card_number}</span>}
                              <span className="flex items-center">
                                <div className={`w-2 h-2 rounded-full mr-2 ${getConditionColor(item.condition)}`} />
                                {formatCondition(item.condition)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge variant="outline">Qty: {item.quantity}</Badge>
                          {item.current_market_price && (
                            <span className="font-medium text-primary">
                              ${item.current_market_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
