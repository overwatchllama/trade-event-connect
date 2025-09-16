import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Header from '@/components/Header';
import { AddItemDialog } from '@/components/AddItemDialog';
import { CreateCollectionDialog } from '@/components/CreateCollectionDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { 
  Search, 
  Plus, 
  Settings,
  TrendingUp,
  Package,
  Star,
  Calendar,
  DollarSign,
  Filter,
  Grid3X3,
  List,
  Eye,
  Edit,
  Trash2
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
  owned?: number;
  completion?: number;
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
  image_url: string | null;
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
  const [selectedGame, setSelectedGame] = useState('pokemon');
  const [activeTab, setActiveTab] = useState('sets');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('name');
  const [conditionFilter, setConditionFilter] = useState('all');

  // TCG Sets Data with realistic card counts and images
  const pokemonSets: TCGSet[] = [
    {
      id: 'sv09-journey-together',
      name: 'Journey Together',
      code: 'SV09',
      releaseDate: 'Mar 28, 2025',
      cardCount: 225,
      estimatedValue: 753,
      description: 'The latest expansion featuring partnership themes',
      imageUrl: 'https://images.pokemontcg.io/sv9/logo.png',
      owned: 142,
      completion: 63
    },
    {
      id: 'sv-prismatic-evolutions',
      name: 'Prismatic Evolutions',
      code: 'SV08',
      releaseDate: 'Jan 17, 2025',
      cardCount: 216,
      estimatedValue: 4348,
      description: 'Spectacular evolution-themed set with prismatic artwork',
      imageUrl: 'https://images.pokemontcg.io/sv8/logo.png',
      owned: 89,
      completion: 41
    },
    {
      id: 'sv-surging-sparks',
      name: 'Surging Sparks',
      code: 'SV07',
      releaseDate: 'Nov 08, 2024',
      cardCount: 191,
      estimatedValue: 2180,
      description: 'Electric-type focused expansion with dynamic artwork',
      imageUrl: 'https://images.pokemontcg.io/sv7/logo.png',
      owned: 156,
      completion: 82
    },
    {
      id: 'sv-stellar-crown',
      name: 'Stellar Crown',
      code: 'SV06',
      releaseDate: 'Sep 13, 2024',
      cardCount: 175,
      estimatedValue: 1890,
      description: 'Stellar crown Pokémon with cosmic powers',
      imageUrl: 'https://images.pokemontcg.io/sv6/logo.png',
      owned: 95,
      completion: 54
    },
    {
      id: 'sv-twilight-masquerade',
      name: 'Twilight Masquerade',
      code: 'SV05',
      releaseDate: 'May 24, 2024',
      cardCount: 167,
      estimatedValue: 1650,
      description: 'Mysterious masked Pokémon under twilight skies',
      imageUrl: 'https://images.pokemontcg.io/sv5/logo.png',
      owned: 134,
      completion: 80
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
      description: 'Mystery-themed set with detective mechanics',
      owned: 89,
      completion: 31
    },
    {
      id: 'lci',
      name: 'The Lost Caverns of Ixalan',
      code: 'LCI',
      releaseDate: 'Nov 17, 2023',
      cardCount: 291,
      estimatedValue: 980,
      description: 'Adventure into the underground world of Ixalan',
      owned: 156,
      completion: 54
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
      description: 'The inaugural set of Disney Lorcana',
      owned: 167,
      completion: 82
    },
    {
      id: 'ris',
      name: 'Rise of the Floodborn',
      code: 'RIS',
      releaseDate: 'Nov 17, 2023',
      cardCount: 204,
      estimatedValue: 1900,
      description: 'Second chapter featuring Floodborn characters',
      owned: 99,
      completion: 49
    }
  ];

  const getCurrentSets = (): TCGSet[] => {
    switch (selectedGame) {
      case 'pokemon': return pokemonSets;
      case 'mtg': return magicSets;
      case 'lorcana': return lorcanaSets;
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

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.set_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
    return matchesSearch && matchesCondition;
  });

  const totalValue = items.reduce((sum, item) => sum + ((item.current_market_price || 0) * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

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
              Track your collection progress across different TCG sets
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CreateCollectionDialog onCollectionCreated={fetchCollections}>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Collection
              </Button>
            </CreateCollectionDialog>
            {collections.length > 0 && (
              <AddItemDialog 
                collectionId={selectedCollection === 'all' ? collections[0]?.id : selectedCollection} 
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">${totalValue.toFixed(2)}</p>
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                  <Star className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Collections</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{collections.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-3">
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg. Value</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${totalItems > 0 ? (totalValue / totalItems).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Game Selection & Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Select value={selectedGame} onValueChange={setSelectedGame}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pokemon">Pokémon TCG</SelectItem>
                  <SelectItem value="mtg">Magic: The Gathering</SelectItem>
                  <SelectItem value="lorcana">Disney Lorcana</SelectItem>
                </SelectContent>
              </Select>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sets">Sets</TabsTrigger>
                  <TabsTrigger value="cards">Cards</TabsTrigger>
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

          <TabsContent value="sets" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getCurrentSets().map((set) => (
                <Card key={set.id} className="hover:shadow-lg transition-shadow cursor-pointer border-slate-200 dark:border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                          {set.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {set.code} • {set.releaseDate}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {set.description}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {set.completion}%
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {set.owned}/{set.cardCount}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Progress value={set.completion} className="h-2" />
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          {set.cardCount} cards total
                        </span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          ${set.estimatedValue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

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
                  {searchTerm ? 'Try adjusting your search or filters' : 'Start building your collection by adding some cards'}
                </p>
                {collections.length > 0 && (
                  <AddItemDialog 
                    collectionId={selectedCollection === 'all' ? collections[0]?.id : selectedCollection} 
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
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-xs">
                            {item.quantity}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm text-slate-900 dark:text-white line-clamp-2">
                          {item.name}
                        </h4>
                        {item.set_name && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.set_name}
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
                            <h4 className="font-medium text-slate-900 dark:text-white">
                              {item.name}
                            </h4>
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
        </div>
      </main>
    </div>
  );
};

export default MyCollection;