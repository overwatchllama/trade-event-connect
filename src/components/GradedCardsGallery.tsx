import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Award, Eye, Image as ImageIcon, X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CollectionItem } from '@/hooks/useCollection';

interface CardImage {
  id: string;
  image_type: string;
  storage_path: string;
  collection_item_id: string;
}

interface GradedCardWithImages extends CollectionItem {
  images: CardImage[];
}

interface GradedCardsGalleryProps {
  trigger?: React.ReactNode;
}

export const GradedCardsGallery: React.FC<GradedCardsGalleryProps> = ({ trigger }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [gradedCards, setGradedCards] = useState<GradedCardWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<GradedCardWithImages | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchGradedCards();
    }
  }, [open, user]);

  const fetchGradedCards = async () => {
    try {
      setLoading(true);

      // Fetch graded cards
      const { data: items, error: itemsError } = await supabase
        .from('collection_items')
        .select('*')
        .eq('is_graded', true)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      // Fetch images for all graded cards
      const itemIds = items?.map(item => item.id) || [];
      const { data: images, error: imagesError } = await supabase
        .from('card_images')
        .select('*')
        .in('collection_item_id', itemIds);

      if (imagesError) throw imagesError;

      // Combine cards with their images
      const cardsWithImages = items?.map(item => ({
        ...item,
        images: images?.filter(img => img.collection_item_id === item.id) || [],
      })) || [];

      setGradedCards(cardsWithImages as GradedCardWithImages[]);
    } catch (error: any) {
      console.error('Error fetching graded cards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load graded cards.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (storagePath: string) => {
    return supabase.storage.from('card-images').getPublicUrl(storagePath).data.publicUrl;
  };

  const getGradeColor = (score: number | null) => {
    if (!score) return 'bg-slate-500';
    if (score >= 9.5) return 'bg-emerald-500';
    if (score >= 9) return 'bg-blue-500';
    if (score >= 8) return 'bg-yellow-500';
    if (score >= 7) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getCompanyLogo = (company: string) => {
    const logos: Record<string, string> = {
      psa: '🏆',
      bgs: '💎',
      cgc: '🎯',
      sgc: '⭐',
      ace: '🃏',
    };
    return logos[company] || '📜';
  };

  const openImageViewer = (card: GradedCardWithImages, imageIndex: number = 0) => {
    setSelectedCard(card);
    setSelectedImageIndex(imageIndex);
    setViewerOpen(true);
  };

  const nextImage = () => {
    if (!selectedCard) return;
    setSelectedImageIndex((prev) =>
      prev < selectedCard.images.length - 1 ? prev + 1 : 0
    );
  };

  const previousImage = () => {
    if (!selectedCard) return;
    setSelectedImageIndex((prev) =>
      prev > 0 ? prev - 1 : selectedCard.images.length - 1
    );
  };

  const formatImageType = (type: string) => {
    const labels: Record<string, string> = {
      front: 'Card Front',
      back: 'Card Back',
      slab: 'Full Slab',
      label: 'Grade Label',
      case: 'In Case',
      other: 'Other',
    };
    return labels[type] || type;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline">
              <Award className="h-4 w-4 mr-2" />
              Graded Cards Gallery
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-amber-500" />
              Graded Cards Gallery
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[calc(90vh-100px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="ml-3 text-slate-600 dark:text-slate-400">Loading graded cards...</p>
              </div>
            ) : gradedCards.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  No Graded Cards Yet
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Add graded cards to your collection to see them here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                {gradedCards.map((card) => {
                  const primaryImage = card.images.find(img => img.image_type === 'slab') ||
                                      card.images.find(img => img.image_type === 'front') ||
                                      card.images[0];

                  return (
                    <Card key={card.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div
                        className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-800 cursor-pointer group"
                        onClick={() => primaryImage && openImageViewer(card, 0)}
                      >
                        {primaryImage ? (
                          <>
                            <img
                              src={getImageUrl(primaryImage.storage_path)}
                              alt={card.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="h-8 w-8 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-16 w-16 text-slate-400" />
                          </div>
                        )}

                        {/* Grade Badge */}
                        <div className="absolute top-3 right-3">
                          <Badge className={`${getGradeColor(card.grade_score)} text-white font-bold text-lg px-3 py-1`}>
                            {getCompanyLogo(card.grading_company)}{' '}
                            {card.grade_score || '?'}
                          </Badge>
                        </div>

                        {/* Image Count */}
                        {card.images.length > 0 && (
                          <div className="absolute bottom-3 right-3">
                            <Badge variant="secondary" className="bg-black/70 text-white">
                              <ImageIcon className="h-3 w-3 mr-1" />
                              {card.images.length}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h4 className="font-bold text-lg line-clamp-1">{card.name}</h4>
                          <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                            {card.set_name && <span>{card.set_name}</span>}
                            {card.card_number && (
                              <>
                                <span>•</span>
                                <span>#{card.card_number}</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {card.grading_company.toUpperCase()} Grade
                              </p>
                              <p className="font-bold text-lg">
                                {card.grade_score || 'N/A'}
                              </p>
                            </div>
                            {card.cert_number && (
                              <div className="text-right">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Cert #
                                </p>
                                <p className="text-sm font-mono">
                                  {card.cert_number}
                                </p>
                              </div>
                            )}
                          </div>

                          {card.current_market_price && (
                            <div className="pt-2 border-t">
                              <p className="text-sm text-slate-500 dark:text-slate-400">Market Value</p>
                              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                ${card.current_market_price.toFixed(2)}
                              </p>
                            </div>
                          )}

                          {card.images.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => openImageViewer(card, 0)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View All Images
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl">
          {selectedCard && selectedCard.images.length > 0 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span>{selectedCard.name}</span>
                      <Badge className={`${getGradeColor(selectedCard.grade_score)} text-white`}>
                        {selectedCard.grading_company.toUpperCase()} {selectedCard.grade_score}
                      </Badge>
                    </div>
                    {selectedCard.cert_number && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-normal mt-1">
                        Cert #{selectedCard.cert_number}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewerOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Main Image */}
                <div className="relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                  <img
                    src={getImageUrl(selectedCard.images[selectedImageIndex].storage_path)}
                    alt={formatImageType(selectedCard.images[selectedImageIndex].image_type)}
                    className="w-full max-h-[60vh] object-contain"
                  />

                  {/* Navigation Arrows */}
                  {selectedCard.images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2"
                        onClick={previousImage}
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-6 w-6" />
                      </Button>
                    </>
                  )}

                  {/* Image Type Badge */}
                  <Badge
                    variant="secondary"
                    className="absolute bottom-4 left-4 bg-black/70 text-white"
                  >
                    {formatImageType(selectedCard.images[selectedImageIndex].image_type)}
                  </Badge>

                  {/* Image Counter */}
                  <Badge
                    variant="secondary"
                    className="absolute bottom-4 right-4 bg-black/70 text-white"
                  >
                    {selectedImageIndex + 1} / {selectedCard.images.length}
                  </Badge>
                </div>

                {/* Thumbnail Strip */}
                {selectedCard.images.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {selectedCard.images.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-20 h-28 rounded border-2 transition-all ${
                          index === selectedImageIndex
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-slate-300 dark:border-slate-600 hover:border-primary'
                        }`}
                      >
                        <img
                          src={getImageUrl(image.storage_path)}
                          alt={formatImageType(image.image_type)}
                          className="w-full h-full object-cover rounded"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
