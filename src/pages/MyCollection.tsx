import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Header from '@/components/Header';
import { AddItemDialog } from '@/components/AddItemDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { 
  Search, 
  Filter, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Eye,
  Edit,
  Trash2,
  SortAsc,
  GridIcon,
  ListIcon,
  Sparkles,
  Star
} from 'lucide-react';

interface TCGSet {
  id: string;
  name: string;
  code: string;
  releaseDate: string;
  cardCount: number;
  estimatedValue: number;
  description: string;
  imageUrl?: string;
}

interface Collection {
  id: string;
  name: string;
  description: string | null;
  category: string;
  created_at: string;
}

interface CollectionItem {
  id: string;
  collection_id: string;
  name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  condition: string;
  quantity: number;
  purchase_price: number | null;
  current_market_price: number | null;
  estimated_value: number | null;
  notes: string | null;
  acquired_date: string | null;
  created_at: string;
}

const MyCollection = () => {
  const { user, loading: authLoading } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('pokemon');
  const [selectedTab, setSelectedTab] = useState<'sets' | 'cards'>('sets');

  // Sample sets data for each game
  const pokemonSets: TCGSet[] = [
    {
      id: 'sv09-journey-together',
      name: 'Journey Together',
      code: 'JTG',
      releaseDate: 'Mar 28, 2025',
      cardCount: 376,
      estimatedValue: 753,
      description: 'The latest expansion featuring partnership themes'
    },
    {
      id: 'sv-prismatic-evolutions',
      name: 'Prismatic Evolutions',
      code: 'PRE',
      releaseDate: 'Jan 17, 2025',
      cardCount: 481,
      estimatedValue: 4348,
      description: 'Spectacular evolution-themed set with prismatic artwork'
    },
    {
      id: 'sv-surging-sparks',
      name: 'Surging Sparks',
      code: 'SSP',
      releaseDate: 'Nov 08, 2024',
      cardCount: 452,
      estimatedValue: 2180,
      description: 'Electric-type focused expansion with dynamic artwork'
    }
  ];

  const magicSets: TCGSet[] = [
    {
      id: 'mkm',
      name: 'Murders at Karlov Manor',
      code: 'MKM',
      releaseDate: 'Feb 09, 2024',
      cardCount: 286,
      estimatedValue: 1250,
      description: 'Mystery-themed set with detective mechanics'
    },
    {
      id: 'lci',
      name: 'The Lost Caverns of Ixalan',
      code: 'LCI',
      releaseDate: 'Nov 17, 2023',
      cardCount: 291,
      estimatedValue: 980,
      description: 'Adventure into the underground world of Ixalan'
    },
    {
      id: 'woe',
      name: 'Wilds of Eldraine',
      code: 'WOE',
      releaseDate: 'Sep 08, 2023',
      cardCount: 276,
      estimatedValue: 1100,
      description: 'Fairy tale world with adventure mechanics'
    }
  ];

  const lorcanaSets: TCGSet[] = [
    {
      id: 'tfc',
      name: 'The First Chapter',
      code: 'TFC',
      releaseDate: 'Aug 18, 2023',
      cardCount: 204,
      estimatedValue: 2800,
      description: 'The inaugural set of Disney Lorcana'
    },
    {
      id: 'ris',
      name: 'Rise of the Floodborn',
      code: 'RIS',
      releaseDate: 'Nov 17, 2023',
      cardCount: 204,
      estimatedValue: 1900,
      description: 'Second chapter featuring Floodborn characters'
    },
    {
      id: 'itk',
      name: 'Into the Inklands',
      code: 'ITK',
      releaseDate: 'Feb 23, 2024',
      cardCount: 204,
      estimatedValue: 1600,
      description: 'Third set exploring new realms and characters'
    }
  ];

  const onePieceSets: TCGSet[] = [
    {
      id: 'op01',
      name: 'Romance Dawn',
      code: 'OP01',
      releaseDate: 'Jul 22, 2022',
      cardCount: 121,
      estimatedValue: 1800,
      description: 'The first One Piece TCG set featuring the East Blue saga'
    },
    {
      id: 'op02',
      name: 'Paramount War',
      code: 'OP02',
      releaseDate: 'Sep 30, 2022',
      cardCount: 121,
      estimatedValue: 1200,
      description: 'Epic battles from the Marineford War'
    },
    {
      id: 'op03',
      name: 'Pillars of Strength',
      code: 'OP03',
      releaseDate: 'Dec 02, 2022',
      cardCount: 121,
      estimatedValue: 950,
      description: 'Featuring powerful characters and their abilities'
    }
  ];

  const getCurrentSets = () => {
    switch (selectedGame) {
      case 'pokemon': return pokemonSets;
      case 'magic': return magicSets;
      case 'lorcana': return lorcanaSets;
      case 'onepiece': return onePieceSets;
      default: return pokemonSets;
    }
  };

  useEffect(() => {
    if (user) {
      fetchCollections();
      fetchItems();
    }
  }, [user]);

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load collections.',
        variant: 'destructive',
      });
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const query = supabase
        .from('collection_items')
        .select('*');

      if (selectedCollection && selectedCollection !== 'all') {
        query.eq('collection_id', selectedCollection);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load collection items.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [selectedCollection, user]);

  const filteredAndSortedItems = items
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.set_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
      return matchesSearch && matchesCondition;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'value':
          return (b.current_market_price || 0) - (a.current_market_price || 0);
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

  const totalValue = items.reduce((sum, item) => sum + ((item.current_market_price || 0) * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      mint: 'bg-green-500',
      near_mint: 'bg-green-400',
      excellent: 'bg-blue-400',
      good: 'bg-yellow-400',
      light_play: 'bg-orange-400',
      moderate_play: 'bg-orange-500',
      heavy_play: 'bg-red-400',
      damaged: 'bg-red-500',
    };
    return colors[condition] || 'bg-gray-400';
  };

  const formatCondition = (condition: string) => {
    return condition.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-muted-foreground mb-4">
                Please sign in to view and manage your collection.
              </p>
              <Button onClick={() => window.location.href = '/auth'}>
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Header Section */}
        <div className="relative mb-12">
          <div className="bg-gradient-to-r from-primary/90 to-primary/70 rounded-2xl p-8 text-white overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                Track Your Collection
              </h1>
              <p className="text-lg md:text-xl opacity-90 mb-6 max-w-2xl">
                Easily keep track of your collection at any size. View your progress for individual sets and never lose track of what you own.
              </p>
              <div className="flex flex-wrap gap-3">
                {collections.length > 0 && (
                  <AddItemDialog 
                    collectionId={selectedCollection === 'all' ? collections[0]?.id : selectedCollection} 
                    onItemAdded={fetchItems}
                  />
                )}
                <Button variant="secondary" className="bg-white/20 hover:bg-white/30 border-white/30 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Collection
                </Button>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Total Value</p>
                  <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">${totalValue.toFixed(2)}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Portfolio worth</p>
                </div>
                <div className="p-3 bg-emerald-500 rounded-xl">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Cards</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalItems}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Individual cards</p>
                </div>
                <div className="p-3 bg-blue-500 rounded-xl">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Collections</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{collections.length}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Active collections</p>
                </div>
                <div className="p-3 bg-purple-500 rounded-xl">
                  <GridIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">Avg. Value</p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                    ${totalItems > 0 ? (totalValue / totalItems).toFixed(2) : '0.00'}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Per card</p>
                </div>
                <div className="p-3 bg-orange-500 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Collections Overview */}
        {collections.length > 0 && (
          <Card className="mb-8 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Collection Progress</CardTitle>
              <p className="text-muted-foreground">Track your completion status across all collections</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {collections.map((collection) => {
                  const collectionItems = items.filter(item => item.collection_id === collection.id);
                  const collectionValue = collectionItems.reduce((sum, item) => sum + ((item.current_market_price || 0) * item.quantity), 0);
                  const itemCount = collectionItems.reduce((sum, item) => sum + item.quantity, 0);
                  
                  return (
                    <div key={collection.id} className="p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">{collection.name}</h4>
                        <Badge variant="secondary" className="text-xs">{collection.category}</Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cards:</span>
                          <span className="font-medium">{itemCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Value:</span>
                          <span className="font-bold text-success">${collectionValue.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-background rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(100, (itemCount / Math.max(itemCount, 10)) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.min(100, Math.round((itemCount / Math.max(itemCount, 10)) * 100))}% tracked
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Search and Filters */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search your collection by card name or set..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger className="w-full lg:w-48 h-11">
                  <SelectValue placeholder="All Collections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={conditionFilter} onValueChange={setConditionFilter}>
                <SelectTrigger className="w-full lg:w-40 h-11">
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

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-36 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="value">Value</SelectItem>
                  <SelectItem value="date">Date Added</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="default"
                  onClick={() => setViewMode('grid')}
                  className="h-11 px-4"
                >
                  <GridIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="default"
                  onClick={() => setViewMode('list')}
                  className="h-11 px-4"
                >
                  <ListIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Items Display with Game Tabs */}
        <Tabs value={selectedGame} onValueChange={setSelectedGame} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="pokemon" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Pokémon
            </TabsTrigger>
            <TabsTrigger value="magic" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Magic: The Gathering
            </TabsTrigger>
            <TabsTrigger value="lorcana" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Disney Lorcana
            </TabsTrigger>
            <TabsTrigger value="onepiece" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              One Piece
            </TabsTrigger>
          </TabsList>

          {/* Game Content */}
          <TabsContent value={selectedGame} className="space-y-6">
            <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'sets' | 'cards')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="sets">Sets</TabsTrigger>
                <TabsTrigger value="cards">Cards</TabsTrigger>
              </TabsList>

              <TabsContent value="sets" className="space-y-4">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="capitalize">{selectedGame} Sets</CardTitle>
                    <p className="text-muted-foreground">Explore available sets and their details</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getCurrentSets().map((set) => (
                        <Card key={set.id} className="hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <h3 className="font-semibold text-lg">{set.name}</h3>
                                  <Badge variant="secondary" className="text-xs">{set.code}</Badge>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-success">${set.estimatedValue}</p>
                                  <p className="text-xs text-muted-foreground">Est. Value</p>
                                </div>
                              </div>
                              
                              <p className="text-sm text-muted-foreground">{set.description}</p>
                              
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Cards:</span>
                                <span className="font-medium">{set.cardCount}</span>
                              </div>
                              
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Released:</span>
                                <span className="font-medium">{set.releaseDate}</span>
                              </div>
                              
                              <div className="flex gap-2 pt-2">
                                <Button size="sm" className="flex-1">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Cards
                                </Button>
                                <Button size="sm" variant="outline" className="flex-1">
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add to Collection
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cards" className="space-y-4">
                {loading ? (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className={viewMode === 'grid' ? 'h-80 rounded-xl' : 'h-24 rounded-lg'} />
                    ))}
                  </div>
                ) : filteredAndSortedItems.length === 0 ? (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-12 text-center">
                      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">No cards found</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        {searchTerm || conditionFilter !== 'all' 
                          ? 'Try adjusting your search filters or browse all collections to find what you\'re looking for.'
                          : 'Start building your collection by adding your first trading card. Every great collection starts with a single card.'}
                      </p>
                      {collections.length > 0 && (
                        <div className="flex gap-3 justify-center">
                          <AddItemDialog 
                            collectionId={collections[0].id} 
                            onItemAdded={fetchItems}
                          />
                          <Button variant="outline">Browse Collection Ideas</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAndSortedItems.map((item) => (
                      <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
                        <div className="relative h-80">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20 p-6 flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="font-bold text-lg leading-tight line-clamp-2 mb-2">{item.name}</h3>
                                {item.set_name && (
                                  <Badge variant="outline" className="mb-2 border-primary/30">
                                    {item.set_name}
                                  </Badge>
                                )}
                              </div>
                              <div className="ml-3 text-right">
                                {item.current_market_price && (
                                  <p className="font-bold text-lg text-success">${item.current_market_price}</p>
                                )}
                                <p className="text-xs text-muted-foreground">each</p>
                              </div>
                            </div>
                            
                            <div className="space-y-3 mb-4 flex-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Condition:</span>
                                <Badge variant="secondary" className={`${getConditionColor(item.condition)} text-white text-xs`}>
                                  {formatCondition(item.condition)}
                                </Badge>
                              </div>
                              
                              {item.rarity && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Rarity:</span>
                                  <span className="font-medium">{item.rarity}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Quantity:</span>
                                <span className="font-bold text-primary">{item.quantity}x</span>
                              </div>
                              
                              {item.card_number && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Card #:</span>
                                  <span className="font-mono text-xs">{item.card_number}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="outline" className="flex-1 bg-background/80 backdrop-blur-sm">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1 bg-background/80 backdrop-blur-sm">
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAndSortedItems.map((item) => (
                      <Card key={item.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold">{item.name}</h3>
                                {item.set_name && (
                                  <Badge variant="outline" className="text-xs">{item.set_name}</Badge>
                                )}
                                <Badge variant="secondary" className={`${getConditionColor(item.condition)} text-white text-xs`}>
                                  {formatCondition(item.condition)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                <span>Qty: {item.quantity}</span>
                                {item.rarity && <span>Rarity: {item.rarity}</span>}
                                {item.card_number && <span>#{item.card_number}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              {item.current_market_price && (
                                <p className="font-bold text-lg text-success">${item.current_market_price}</p>
                              )}
                              <p className="text-xs text-muted-foreground">Market Value</p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MyCollection;