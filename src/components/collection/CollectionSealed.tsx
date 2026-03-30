import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Calendar, Globe } from 'lucide-react';
import {
  getSealedProducts,
  SEALED_SERIES,
  PRODUCT_TYPE_LABELS,
  LANGUAGE_LABELS,
  type ProductType,
  type ProductLanguage,
} from '@/services/pokemonSealedData';

interface CollectionSealedProps {
  selectedTcg: string;
}

const CollectionSealed = ({ selectedTcg }: CollectionSealedProps) => {
  const [search, setSearch] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLang, setSelectedLang] = useState('all');

  const products = useMemo(() => {
    if (selectedTcg !== 'pokemon') return [];
    return getSealedProducts({
      series: selectedSeries !== 'all' ? selectedSeries : undefined,
      product_type: selectedType !== 'all' ? selectedType as ProductType : undefined,
      language: selectedLang !== 'all' ? selectedLang as ProductLanguage : undefined,
      search: search || undefined,
    });
  }, [selectedTcg, selectedSeries, selectedType, selectedLang, search]);

  const productTypes = Object.entries(PRODUCT_TYPE_LABELS);
  const languages = Object.entries(LANGUAGE_LABELS);

  if (selectedTcg !== 'pokemon') {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Sealed Products</h2>
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-1">Coming Soon</h3>
            <p className="text-muted-foreground text-sm">
              Sealed product tracking for {selectedTcg === 'onepiece' ? 'One Piece' : selectedTcg} is coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Sealed Products</h2>
        <Badge variant="secondary">{products.length} products</Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="pl-9"
              />
            </div>
            <Select value={selectedSeries} onValueChange={setSelectedSeries}>
              <SelectTrigger>
                <SelectValue placeholder="All Series" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Series</SelectItem>
                {SEALED_SERIES.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.years})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {productTypes.map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLang} onValueChange={setSelectedLang}>
              <SelectTrigger>
                <SelectValue placeholder="All Languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {languages.map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Product Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => {
            const seriesInfo = SEALED_SERIES.find(s => s.id === product.series);
            return (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain p-2"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement?.classList.add('fallback-icon');
                      }}
                    />
                  ) : (
                    <Package className="h-16 w-16 text-muted-foreground/30" />
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
                  <h3 className="font-semibold text-sm text-foreground line-clamp-2">{product.name}</h3>
                  <p className="text-xs text-muted-foreground">{product.set_name}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {PRODUCT_TYPE_LABELS[product.product_type]}
                    </Badge>
                    {seriesInfo && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {seriesInfo.era}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {product.release_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(product.release_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {product.languages.length} lang{product.languages.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {product.msrp && (
                    <p className="text-xs font-medium text-foreground">MSRP: ${product.msrp.toFixed(2)}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-1">No products found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CollectionSealed;
