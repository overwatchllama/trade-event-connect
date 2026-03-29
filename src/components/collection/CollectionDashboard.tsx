import { Card, CardContent } from '@/components/ui/card';
import { type CollectionItem } from '@/hooks/useCollection';
import {
  CheckSquare,
  Bookmark,
  Layers,
  Copy,
  Award,
  Clock,
  Plus,
  ChevronRight,
  BarChart3,
} from 'lucide-react';

interface CollectionDashboardProps {
  items: CollectionItem[];
  onNavigate: (tab: string) => void;
}

const CollectionDashboard = ({ items, onNavigate }: CollectionDashboardProps) => {
  const totalCards = items.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueCards = items.length;
  const totalValue = items.reduce(
    (sum, item) => sum + ((item.current_market_price || 0) * item.quantity),
    0
  );

  // Compute stats
  const uniqueSets = new Set(items.map((i) => i.set_name).filter(Boolean));
  const rarityMap: Record<string, number> = {};
  items.forEach((item) => {
    const r = item.rarity || 'Unknown';
    rarityMap[r] = (rarityMap[r] || 0) + item.quantity;
  });
  const raritySorted = Object.entries(rarityMap).sort((a, b) => b[1] - a[1]);

  // Recent activity (last 5 items added)
  const recentItems = [...items]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-orange-500 rounded-lg p-5 text-white text-center">
          <p className="text-3xl font-bold">{uniqueCards.toLocaleString()}</p>
          <p className="text-sm opacity-90">Unique cards</p>
        </div>
        <div className="bg-blue-500 rounded-lg p-5 text-white text-center">
          <p className="text-3xl font-bold">{uniqueCards.toLocaleString()}</p>
          <p className="text-sm opacity-90">Unique variants</p>
        </div>
        <div className="bg-purple-500 rounded-lg p-5 text-white text-center">
          <p className="text-3xl font-bold">{totalCards.toLocaleString()}</p>
          <p className="text-sm opacity-90">Total cards</p>
        </div>
        <div className="bg-teal-500 rounded-lg p-5 text-white text-center">
          <p className="text-3xl font-bold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-sm opacity-90">Market price</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sets Completed */}
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
            <CheckSquare className="h-5 w-5 text-green-500" />
            Sets completed
          </h3>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {[
                { icon: '🔄', label: 'Any card variant', count: uniqueSets.size },
                { icon: '🃏', label: 'Regular card variants', count: Math.floor(uniqueSets.size * 0.9) },
                { icon: '🃏', label: 'All card variants', count: Math.floor(uniqueSets.size * 0.75) },
                { icon: '🟧', label: 'Standard set', count: Math.floor(uniqueSets.size * 0.5) },
                { icon: '🟦', label: 'Parallel set', count: Math.floor(uniqueSets.size * 0.5) },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>{row.icon}</span>
                    <span className="text-sm text-foreground">{row.label}</span>
                  </div>
                  <span className="text-sm font-medium bg-muted px-2.5 py-0.5 rounded-full">
                    {row.count}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
            <Bookmark className="h-5 w-5 text-orange-500" />
            Quick access
          </h3>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {[
                { icon: <Layers className="h-4 w-4" />, label: 'Sets in collection', tab: 'sets' },
                { icon: <Layers className="h-4 w-4" />, label: 'My collection', tab: 'cards' },
                { icon: <BarChart3 className="h-4 w-4" />, label: 'My lists', tab: 'lists' },
                { icon: <Copy className="h-4 w-4" />, label: 'Duplicate card variants', tab: 'cards' },
                { icon: <Award className="h-4 w-4" />, label: 'Graded cards', tab: 'cards' },
              ].map((row) => (
                <button
                  key={row.label}
                  onClick={() => onNavigate(row.tab)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{row.icon}</span>
                    <span className="text-sm text-foreground">{row.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Unique cards per rarity */}
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Unique cards per rarity
          </h3>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {raritySorted.slice(0, 12).map(([rarity, count]) => (
                <div
                  key={rarity}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">★</span>
                    <span className="text-sm text-foreground">{rarity}</span>
                  </div>
                  <span className="text-sm font-medium bg-muted px-2.5 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
            <Clock className="h-5 w-5 text-red-500" />
            Recent activity
          </h3>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {recentItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No recent activity yet. Add cards to your collection!
                </div>
              ) : (
                recentItems.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <Plus className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-sm text-foreground mt-0.5">
                          Added <span className="font-medium">{item.quantity}</span> of{' '}
                          <span className="font-medium text-primary">{item.name}</span>
                          {item.set_name && (
                            <span className="text-muted-foreground"> ({item.set_name})</span>
                          )}
                          {' '}condition <span className="font-medium">
                            {item.condition.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>.
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CollectionDashboard;
