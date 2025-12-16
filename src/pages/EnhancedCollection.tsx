import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/Header';
import { CreateCollectionDialog } from '@/components/CreateCollectionDialog';
import { EnhancedAddItemDialog } from '@/components/EnhancedAddItemDialog';
import { WishlistDialog } from '@/components/WishlistDialog';
import { GradedCardsGallery } from '@/components/GradedCardsGallery';
import { useAuth } from '@/hooks/useAuth';
import { useCollection, type CardCategory } from '@/hooks/useCollection';
import { toast } from '@/hooks/use-toast';
import { exportToCSV, calculateStats } from '@/utils/collectionExport';
import {
  Search,
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  Star,
  Download,
  Upload,
  Heart,
  Grid3X3,
  List,
  Award,
  BarChart3,
} from 'lucide-react';

const EnhancedCollection = () => {
  const { user, loading: authLoading } = useAuth();
  const {
    collections,
    items,
    wishlists,
    loading,
    fetchCollections,
    fetchItems,
  } = useCollection();

  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGame, setSelectedGame] = useState<CardCategory>('pokemon');
  const [activeTab, setActiveTab] = useState<'cards' | 'sets' | 'stats'>('cards');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [variantFilter, setVariantFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchCollections();
      fetchItems();
    }
  }, [user]);

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.set_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
    const matchesRarity = rarityFilter === 'all' || item.rarity === rarityFilter;
    const matchesVariant = variantFilter === 'all' || item.variant === variantFilter;
    const matchesCollection = selectedCollection === 'all' || item.collection_id === selectedCollection;

    return matchesSearch && matchesCondition && matchesRarity && matchesVariant && matchesCollection;
  });

  // Calculate stats
  const stats = calculateStats(filteredItems);

  // Get unique values for filters
  const uniqueRarities = [...new Set(items.map(item => item.rarity).filter(Boolean))];
  const uniqueVariants = [...new Set(items.map(item => item.variant))];

  const handleExport = () => {
    try {
      exportToCSV(filteredItems, `collection-${selectedGame}-${Date.now()}.csv`);
      toast({
        title: 'Export Successful',
        description: `Exported ${filteredItems.length} cards to CSV.`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive',
      });
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
    return colors[condition] || 'bg-slate-400';
  };

  const formatCondition = (condition: string) => {
    return condition.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatVariant = (variant: string) => {
    return variant.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mt-20">
            <Package className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Please sign in to view and manage your collection.
            </p>
            <Button onClick={() => window.location.href = '/auth'} size="lg">
              Sign In to Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              My Collection
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Track, manage, and analyze your TCG collection
            </p>
          </div>
          <div className="flex items-center gap-3">
            <GradedCardsGallery />
            <WishlistDialog game={selectedGame} />
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredItems.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <CreateCollectionDialog onCollectionCreated={fetchCollections}>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Collection
              </Button>
            </CreateCollectionDialog>
            {collections.length > 0 && (
              <EnhancedAddItemDialog
                collectionId={selectedCollection === 'all' ? collections[0]?.id : selectedCollection}
                game={selectedGame}
                onItemAdded={fetchItems}
              />
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mr-3">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Value</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">${stats.totalValue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Cards</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalCards}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                  <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Graded Cards</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.gradedCards}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg mr-3 ${stats.profit >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  <TrendingUp className={`h-5 w-5 ${stats.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Profit/Loss</p>
                  <p className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {stats.profit >= 0 ? '+' : ''}{' '}${stats.profit.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Select value={selectedGame} onValueChange={(v) => setSelectedGame(v as CardCategory)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pokemon">Pokémon TCG</SelectItem>
                  <SelectItem value="mtg">Magic: The Gathering</SelectItem>
                  <SelectItem value="yugioh">Yu-Gi-Oh!</SelectItem>
                  <SelectItem value="lorcana">Disney Lorcana</SelectItem>
                  <SelectItem value="onepiece">One Piece</SelectItem>
                  <SelectItem value="sports">Sports Cards</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger className="w-48">
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

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="cards">Cards</TabsTrigger>
                  <TabsTrigger value="sets">Sets</TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {activeTab === 'cards' && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
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

                <Select value="variantFilter" onValueChange={setVariantFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Variant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Variants</SelectItem>
                    {uniqueVariants.map((variant) => (
                      <SelectItem key={variant} value={variant}>
                        {formatVariant(variant)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
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
            )}
          </div>

          <TabsContent value="cards" className="mt-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-slate-600 dark:text-slate-400 mt-4">Loading cards...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  No cards found
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {searchTerm ? 'Try adjusting your search or filters' : 'Start building your collection by adding cards'}
                </p>
                {collections.length > 0 && (
                  <EnhancedAddItemDialog
                    collectionId={selectedCollection === 'all' ? collections[0]?.id : selectedCollection}
                    game={selectedGame}
                    onItemAdded={fetchItems}
                  />
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow group border-slate-200 dark:border-slate-700">
                    <CardContent className="p-3">
                      <div className="aspect-[2/3] bg-slate-100 dark:bg-slate-700 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-slate-400" />
                        )}
                        <div className="absolute top-2 right-2 flex flex-col gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {item.quantity}
                          </Badge>
                          {item.is_graded && (
                            <Badge className="text-xs bg-amber-500 text-white">
                              <Award className="h-3 w-3 mr-1" />
                              {item.grade_score}
                            </Badge>
                          )}
                        </div>
                        {item.for_trade && (
                          <div className="absolute top-2 left-2">
                            <Badge className="text-xs bg-blue-500 text-white">
                              For Trade
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-medium text-sm text-slate-900 dark:text-white line-clamp-2">
                          {item.name}
                        </h4>
                        {item.set_name && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.set_name} {item.card_number && `• #${item.card_number}`}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className={`w-2 h-2 rounded-full ${getConditionColor(item.condition)}`} />
                          {item.current_market_price && (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
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
                  <Card key={item.id} className="hover:shadow-sm transition-shadow border-slate-200 dark:border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-16 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-slate-900 dark:text-white">
                                {item.name}
                              </h4>
                              {item.is_graded && (
                                <Badge className="text-xs bg-amber-500 text-white">
                                  <Award className="h-3 w-3 mr-1" />
                                  {item.grading_company.toUpperCase()} {item.grade_score}
                                </Badge>
                              )}
                              {item.variant !== 'normal' && (
                                <Badge variant="secondary" className="text-xs">
                                  {formatVariant(item.variant)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
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
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
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
          </TabsContent>

          <TabsContent value="sets" className="mt-0">
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Set progress tracking coming soon! This will show completion percentages for each set.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Condition */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cards by Condition</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.byCondition).map(([condition, data]) => (
                        <div key={condition}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{formatCondition(condition)}</span>
                            <span className="text-slate-600 dark:text-slate-400">
                              {data.count} cards • ${data.value.toFixed(2)}
                            </span>
                          </div>
                          <Progress value={(data.count / stats.totalCards) * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* By Rarity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cards by Rarity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.byRarity).slice(0, 5).map(([rarity, data]) => (
                        <div key={rarity}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{rarity}</span>
                            <span className="text-slate-600 dark:text-slate-400">
                              {data.count} cards • ${data.value.toFixed(2)}
                            </span>
                          </div>
                          <Progress value={(data.count / stats.totalCards) * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Investment Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Investment Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Invested</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        ${stats.totalInvestment.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Current Value</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        ${stats.totalValue.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Profit/Loss</p>
                      <p className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${stats.profit.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">ROI</p>
                      <p className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {stats.roi.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </main>
    </div>
  );
};

export default EnhancedCollection;
