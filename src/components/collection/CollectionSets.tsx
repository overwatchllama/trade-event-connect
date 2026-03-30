import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { pokemonTcgApi, type PokemonSet } from '@/services/pokemonTcgApi';
import { optcgApi, type OPTCGSet, type OPTCGStarterDeck } from '@/services/optcgApi';
import { type CollectionItem } from '@/hooks/useCollection';
import SetDetailView from './SetDetailView';
import {
  Search,
  Grid3X3,
  List,
  BarChart3,
  MoreVertical,
  Menu,
  ChevronRight,
} from 'lucide-react';

interface CollectionSetsProps {
  items: CollectionItem[];
  selectedTcg: string;
}

// Unified set type for rendering
interface UnifiedSet {
  id: string;
  name: string;
  series: string;
  total: number;
  releaseDate: string;
  logoUrl?: string;
  symbolUrl?: string;
  code?: string;
}

const CollectionSets = ({ items, selectedTcg }: CollectionSetsProps) => {
  const [pokemonSets, setPokemonSets] = useState<PokemonSet[]>([]);
  const [opSets, setOpSets] = useState<(OPTCGSet | OPTCGStarterDeck)[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'images' | 'list'>('images');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'in_collection' | 'completed'>('all');
  const [sortBy, setSortBy] = useState('releaseDate');
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [selectedSetDetail, setSelectedSetDetail] = useState<UnifiedSet | null>(null);

  useEffect(() => {
    setLoading(true);
    setActiveSeries(null);
    if (selectedTcg === 'pokemon') {
      pokemonTcgApi.getSets({ orderBy: '-releaseDate', pageSize: 250 })
        .then(res => setPokemonSets(res.data || []))
        .catch(e => console.error('Failed to fetch Pokemon sets:', e))
        .finally(() => setLoading(false));
    } else if (selectedTcg === 'onepiece') {
      Promise.all([optcgApi.getAllSets(), optcgApi.getAllStarterDecks()])
        .then(([sets, decks]) => setOpSets([...sets, ...decks]))
        .catch(e => console.error('Failed to fetch OP sets:', e))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [selectedTcg]);

  // Normalize sets into unified format
  const unifiedSets: UnifiedSet[] = useMemo(() => {
    if (selectedTcg === 'pokemon') {
      return pokemonSets.map(s => ({
        id: s.id,
        name: s.name,
        series: s.series || 'Other',
        total: s.total,
        releaseDate: s.releaseDate,
        logoUrl: s.images.logo,
        symbolUrl: s.images.symbol,
        code: s.ptcgoCode || s.id.toUpperCase(),
      }));
    }
    if (selectedTcg === 'onepiece') {
      return opSets.map(s => {
        const isSet = 'set_id' in s;
        const id = isSet ? (s as OPTCGSet).set_id : (s as OPTCGStarterDeck).structure_deck_id;
        const name = isSet ? (s as OPTCGSet).set_name : (s as OPTCGStarterDeck).structure_deck_name;
        const series = isSet ? 'Booster Sets' : 'Starter Decks';
        return {
          id,
          name,
          series,
          total: 0, // API doesn't give total per set in list endpoint
          releaseDate: '',
          code: id,
        };
      });
    }
    return [];
  }, [selectedTcg, pokemonSets, opSets]);

  // Count owned cards per set
  const ownedPerSet = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((item) => {
      if (item.set_name) {
        map[item.set_name] = (map[item.set_name] || 0) + item.quantity;
      }
    });
    return map;
  }, [items]);

  // Group by series
  const seriesGroups = useMemo(() => {
    let filtered = unifiedSets;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        s => s.name.toLowerCase().includes(term) || (s.code || '').toLowerCase().includes(term)
      );
    }

    const groups: Record<string, UnifiedSet[]> = {};
    filtered.forEach((set) => {
      if (!groups[set.series]) groups[set.series] = [];
      groups[set.series].push(set);
    });

    return Object.entries(groups).map(([series, sets]) => ({
      series,
      sets: sets.sort((a, b) => {
        if (a.releaseDate && b.releaseDate) {
          return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        }
        return a.name.localeCompare(b.name);
      }),
    }));
  }, [unifiedSets, searchTerm]);

  const allSeriesNames = seriesGroups.map(g => g.series);

  const getOwnedCount = (set: UnifiedSet) => ownedPerSet[set.name] || 0;

  const getCompletion = (set: UnifiedSet) => {
    const owned = getOwnedCount(set);
    if (set.total === 0) return 0;
    return Math.min(100, Math.round((owned / set.total) * 100));
  };

  const getSetValue = (set: UnifiedSet) => {
    return items
      .filter(i => i.set_name === set.name)
      .reduce((sum, i) => sum + ((i.current_market_price || 0) * i.quantity), 0);
  };

  if (selectedTcg !== 'pokemon' && selectedTcg !== 'onepiece') {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Set browsing is currently available for Pokémon TCG and One Piece TCG.</p>
        <p className="text-sm mt-1">Support for other TCGs coming soon.</p>
      </div>
    );
  }

  if (selectedSetDetail && selectedTcg === 'pokemon') {
    return (
      <SetDetailView
        setId={selectedSetDetail.id}
        setName={selectedSetDetail.name}
        setTotal={selectedSetDetail.total}
        setLogoUrl={selectedSetDetail.logoUrl}
        setSymbolUrl={selectedSetDetail.symbolUrl}
        items={items}
        onBack={() => setSelectedSetDetail(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground mt-4">Loading sets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 h-9 text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="releaseDate">Sort ↓</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="completion">Completion</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            {(['all', 'in_collection', 'completed'] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="filterMode"
                  checked={filterMode === mode}
                  onChange={() => setFilterMode(mode)}
                  className="accent-primary"
                />
                <span className="text-foreground capitalize">
                  {mode === 'in_collection' ? 'In collection' : mode === 'completed' ? 'Completed' : 'All'}
                </span>
              </label>
            ))}
          </div>

          <div className="flex bg-muted rounded-lg p-0.5">
            <Button
              variant={viewMode === 'images' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('images')}
              className="h-7 px-2 text-xs gap-1"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Images
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-7 px-2 text-xs gap-1"
            >
              <List className="h-3.5 w-3.5" />
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Set Count */}
      <p className="text-sm font-medium text-foreground">
        {unifiedSets.length} sets found
      </p>

      {/* Series Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 flex-shrink-0"
          onClick={() => setActiveSeries(null)}
        >
          <Menu className="h-4 w-4" />
        </Button>
        {allSeriesNames.slice(0, 8).map((series) => (
          <Button
            key={series}
            variant={activeSeries === series ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs flex-shrink-0 whitespace-nowrap"
            onClick={() => setActiveSeries(activeSeries === series ? null : series)}
          >
            {series}
          </Button>
        ))}
        {allSeriesNames.length > 8 && (
          <Button variant="outline" size="sm" className="h-8 text-xs flex-shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Series Groups */}
      {seriesGroups
        .filter(g => !activeSeries || g.series === activeSeries)
        .map((group) => (
          <div key={group.series} className="space-y-3">
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <span className="text-primary">◆</span>
              {group.series}
            </h3>

            {viewMode === 'images' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {group.sets.map((set) => {
                  const owned = getOwnedCount(set);
                  const completion = getCompletion(set);
                  const value = getSetValue(set);

                  return (
                    <Card key={set.id} className="hover:shadow-md transition-shadow cursor-pointer border-border" onClick={() => setSelectedSetDetail(set)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-foreground truncate">{set.name}</h4>
                            <span className="text-xs text-muted-foreground">{set.code}</span>
                          </div>
                          <div className="text-right ml-2">
                            {set.releaseDate && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(set.releaseDate).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                })}
                              </p>
                            )}
                            {value > 0 && (
                              <p className="text-sm font-semibold text-primary">${value.toLocaleString()}</p>
                            )}
                          </div>
                        </div>

                        {/* Set Logo */}
                        {set.logoUrl ? (
                          <div className="flex items-center justify-center h-16 mb-3">
                            <img
                              src={set.logoUrl}
                              alt={set.name}
                              className="max-h-full max-w-full object-contain"
                              loading="lazy"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-16 mb-3 bg-muted/50 rounded-lg">
                            <span className="text-xs font-bold text-muted-foreground">{set.code}</span>
                          </div>
                        )}

                        {/* Progress */}
                        {set.total > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{owned}/{set.total}</span>
                              <span className="text-muted-foreground">{completion}%</span>
                            </div>
                            <Progress value={completion} className="h-1.5" />
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-1 mt-2">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* List View */
              <div className="border border-border rounded-lg overflow-hidden">
                {group.sets.map((set, idx) => {
                  const owned = getOwnedCount(set);
                  const completion = getCompletion(set);
                  const value = getSetValue(set);

                  return (
                    <div
                      key={set.id}
                      className={`flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                        idx !== group.sets.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      {/* Set Symbol */}
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                        {set.symbolUrl ? (
                          <img
                            src={set.symbolUrl}
                            alt=""
                            className="max-w-full max-h-full object-contain"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground">{set.code?.slice(0, 4)}</span>
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-primary hover:underline cursor-pointer">{set.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{set.code}</span>
                      </div>

                      {/* Date */}
                      {set.releaseDate && (
                        <div className="w-32 text-sm text-muted-foreground hidden md:block">
                          {new Date(set.releaseDate).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </div>
                      )}

                      {/* Value */}
                      <div className="w-20 text-right text-sm">
                        {value > 0 ? (
                          <span className="font-medium text-primary">${value.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">$—</span>
                        )}
                      </div>

                      {/* Progress */}
                      {set.total > 0 && (
                        <div className="w-32 hidden lg:flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground w-16 text-right">{owned}/{set.total}</span>
                          <span className="text-xs text-muted-foreground w-10 text-right">{completion}%</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <BarChart3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default CollectionSets;
