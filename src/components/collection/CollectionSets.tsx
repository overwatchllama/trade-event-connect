import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { pokemonTcgApi, type PokemonSet } from '@/services/pokemonTcgApi';
import { type CollectionItem } from '@/hooks/useCollection';
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

// Group sets by series
interface SeriesGroup {
  series: string;
  sets: PokemonSet[];
}

const CollectionSets = ({ items, selectedTcg }: CollectionSetsProps) => {
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'images' | 'list'>('images');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'in_collection' | 'completed'>('all');
  const [sortBy, setSortBy] = useState('releaseDate');
  const [activeSeries, setActiveSeries] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTcg === 'pokemon') {
      fetchSets();
    }
  }, [selectedTcg]);

  const fetchSets = async () => {
    try {
      setLoading(true);
      const response = await pokemonTcgApi.getSets({
        orderBy: '-releaseDate',
        pageSize: 250,
      });
      setSets(response.data || []);
    } catch (error) {
      console.error('Failed to fetch sets:', error);
    } finally {
      setLoading(false);
    }
  };

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
    let filtered = sets;
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.ptcgoCode || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const groups: Record<string, PokemonSet[]> = {};
    filtered.forEach((set) => {
      const series = set.series || 'Other';
      if (!groups[series]) groups[series] = [];
      groups[series].push(set);
    });

    return Object.entries(groups).map(([series, sets]) => ({
      series,
      sets: sets.sort(
        (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      ),
    }));
  }, [sets, searchTerm]);

  const allSeriesNames = seriesGroups.map((g) => g.series);

  const getOwnedCount = (set: PokemonSet) => {
    return ownedPerSet[set.name] || 0;
  };

  const getCompletion = (set: PokemonSet) => {
    const owned = getOwnedCount(set);
    if (set.total === 0) return 0;
    return Math.min(100, Math.round((owned / set.total) * 100));
  };

  const getSetValue = (set: PokemonSet) => {
    // Sum estimated values of items matching this set name
    return items
      .filter((i) => i.set_name === set.name)
      .reduce((sum, i) => sum + ((i.current_market_price || 0) * i.quantity), 0);
  };

  if (selectedTcg !== 'pokemon') {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Set browsing is currently available for Pokémon TCG.</p>
        <p className="text-sm mt-1">Support for other TCGs coming soon.</p>
      </div>
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
        {sets.length} sets found
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
        .filter((g) => !activeSeries || g.series === activeSeries)
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
                    <Card
                      key={set.id}
                      className="hover:shadow-md transition-shadow cursor-pointer border-border"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-foreground truncate">
                              {set.name}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {set.ptcgoCode || set.id.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-xs text-muted-foreground">
                              {new Date(set.releaseDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            {value > 0 && (
                              <p className="text-sm font-semibold text-primary">
                                ${value.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Set Logo */}
                        <div className="flex items-center justify-center h-16 mb-3">
                          <img
                            src={set.images.logo}
                            alt={set.name}
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>

                        {/* Progress */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {owned}/{set.total}
                            </span>
                            <span className="text-muted-foreground">{completion}%</span>
                          </div>
                          <Progress
                            value={completion}
                            className="h-1.5"
                          />
                        </div>

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
                        <img
                          src={set.images.symbol}
                          alt=""
                          className="max-w-full max-h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
                          {set.name}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {set.ptcgoCode || set.id.toUpperCase()}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="w-32 text-sm text-muted-foreground hidden md:block">
                        {new Date(set.releaseDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>

                      {/* Value */}
                      <div className="w-20 text-right text-sm">
                        {value > 0 ? (
                          <span className="font-medium text-primary">
                            ${value.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">$—</span>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="w-32 hidden lg:flex items-center gap-2">
                        {owned > 0 || set.total > 0 ? (
                          <>
                            <span className="text-xs font-medium text-foreground w-16 text-right">
                              {owned}/{set.total}
                            </span>
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {completion}%
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

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
