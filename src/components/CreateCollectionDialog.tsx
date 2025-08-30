import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Star, 
  Sparkles, 
  Package,
  ArrowLeft,
  Check
} from 'lucide-react';

interface CreateCollectionDialogProps {
  onCollectionCreated: () => void;
  children: React.ReactNode;
}

type TCGType = 'pokemon' | 'mtg' | 'lorcana' | 'onepiece';

interface TCGOption {
  id: TCGType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  features: string[];
}

const tcgOptions: TCGOption[] = [
  {
    id: 'pokemon',
    name: 'Pokémon TCG',
    description: 'The world\'s most popular trading card game featuring pocket monsters',
    icon: Star,
    gradient: 'from-yellow-400 to-red-500',
    features: ['25+ years of sets', 'Competitive play', 'Collectible artwork']
  },
  {
    id: 'mtg',
    name: 'Magic: The Gathering',
    description: 'The original and most strategic trading card game',
    icon: Sparkles,
    gradient: 'from-purple-500 to-blue-600',
    features: ['Complex strategies', '30+ year history', 'Multiple formats']
  },
  {
    id: 'lorcana',
    name: 'Disney Lorcana',
    description: 'Disney\'s enchanting new trading card game',
    icon: Star,
    gradient: 'from-pink-400 to-purple-600',
    features: ['Disney characters', 'Beautiful artwork', 'Family friendly']
  },
  {
    id: 'onepiece',
    name: 'One Piece TCG',
    description: 'Set sail with Luffy and the Straw Hat Pirates',
    icon: Package,
    gradient: 'from-orange-400 to-red-600',
    features: ['Anime artwork', 'Adventure themes', 'Character abilities']
  }
];

export const CreateCollectionDialog: React.FC<CreateCollectionDialogProps> = ({ 
  onCollectionCreated, 
  children 
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'select' | 'create'>('select');
  const [selectedTCG, setSelectedTCG] = useState<TCGType | null>(null);
  const [collectionName, setCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleTCGSelect = (tcgId: TCGType) => {
    setSelectedTCG(tcgId);
    const selectedOption = tcgOptions.find(option => option.id === tcgId);
    if (selectedOption) {
      setCollectionName(`My ${selectedOption.name} Collection`);
      setCollectionDescription(`Track your ${selectedOption.name} cards and sets`);
    }
    setStep('create');
  };

  const handleCreateCollection = async () => {
    if (!user || !selectedTCG || !collectionName.trim()) return;

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('collections')
        .insert({
          name: collectionName.trim(),
          description: collectionDescription.trim() || null,
          category: selectedTCG,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: 'Collection Created',
        description: `Your ${collectionName} collection has been created successfully.`,
      });

      // Reset form and close dialog
      setStep('select');
      setSelectedTCG(null);
      setCollectionName('');
      setCollectionDescription('');
      setIsOpen(false);
      
      // Notify parent to refresh
      onCollectionCreated();
    } catch (error: any) {
      toast({
        title: 'Creation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedTCG(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('select');
    setSelectedTCG(null);
    setCollectionName('');
    setCollectionDescription('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) handleClose();
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Choose Your TCG</DialogTitle>
              <DialogDescription>
                Select the trading card game you want to create a collection for
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {tcgOptions.map((tcg) => {
                const IconComponent = tcg.icon;
                return (
                  <Card 
                    key={tcg.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 group"
                    onClick={() => handleTCGSelect(tcg.id)}
                  >
                    <CardHeader className="pb-4">
                      <div className={`w-full h-20 bg-gradient-to-r ${tcg.gradient} rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                        <IconComponent className="h-10 w-10 text-white" />
                      </div>
                      <CardTitle className="text-lg">{tcg.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-4">
                        {tcg.description}
                      </p>
                      <div className="space-y-2">
                        {tcg.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-primary" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleBack}
                  className="p-1 h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle className="text-2xl font-bold">Create Collection</DialogTitle>
                  <DialogDescription>
                    Set up your new {tcgOptions.find(t => t.id === selectedTCG)?.name} collection
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              {selectedTCG && (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  {(() => {
                    const selectedOption = tcgOptions.find(t => t.id === selectedTCG)!;
                    const IconComponent = selectedOption.icon;
                    return (
                      <>
                        <div className={`w-12 h-12 bg-gradient-to-r ${selectedOption.gradient} rounded-lg flex items-center justify-center`}>
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">{selectedOption.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedOption.description}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="collection-name">Collection Name</Label>
                  <Input
                    id="collection-name"
                    placeholder="Enter collection name"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="collection-description">Description (Optional)</Label>
                  <Textarea
                    id="collection-description"
                    placeholder="Describe your collection goals or focus areas..."
                    value={collectionDescription}
                    onChange={(e) => setCollectionDescription(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <Button 
                  variant="outline" 
                  onClick={handleBack}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleCreateCollection}
                  disabled={!collectionName.trim() || isCreating}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Collection
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};