import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, X, GripVertical } from 'lucide-react';

interface SponsorTier {
  tier: string;
  cost: string;
  slots: string;
  unlimitedSlots: boolean;
  description: string;
}

interface DraggableSponsorTiersProps {
  sponsorTiers: SponsorTier[];
  setSponsorTiers: React.Dispatch<React.SetStateAction<SponsorTier[]>>;
  noSponsors: boolean;
  idPrefix?: string;
}

const DraggableSponsorTiers = ({ 
  sponsorTiers, 
  setSponsorTiers, 
  noSponsors,
  idPrefix = ''
}: DraggableSponsorTiersProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const addSponsorTier = () => {
    setSponsorTiers(prev => [...prev, { tier: '', cost: '', slots: '', unlimitedSlots: false, description: '' }]);
  };

  const removeSponsorTier = (index: number) => {
    if (sponsorTiers.length > 1) {
      setSponsorTiers(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSponsorTier = (index: number, field: string, value: string | boolean) => {
    setSponsorTiers(prev => prev.map((tier, i) => 
      i === index ? { ...tier, [field]: value } : tier
    ));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (noSponsors) return;
    setDraggedIndex(index);
    dragNode.current = e.currentTarget;
    e.currentTarget.classList.add('opacity-50');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
    dragNode.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== null && draggedIndex !== index) {
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';
      setDragOverIndex(index);
      setDropPosition(position);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }

    setSponsorTiers(prev => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      // Adjust drop index based on position and whether we're moving up or down
      let adjustedIndex = dropIndex;
      if (dropPosition === 'after') {
        adjustedIndex = draggedIndex < dropIndex ? dropIndex : dropIndex + 1;
      } else {
        adjustedIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
      }
      updated.splice(adjustedIndex, 0, draggedItem);
      return updated;
    });

    setDragOverIndex(null);
    setDropPosition(null);
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Sponsor Tiers (Optional)</Label>
      <div className="space-y-2">
        {sponsorTiers.map((tier, index) => (
          <div key={`wrapper-${index}`} className="relative">
            {/* Drop indicator line - before */}
            {dragOverIndex === index && dropPosition === 'before' && draggedIndex !== index && (
              <div className="absolute -top-1 left-0 right-0 z-10 flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary shadow-lg" />
                <div className="flex-1 h-0.5 bg-primary rounded-full shadow-lg" />
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary shadow-lg" />
              </div>
            )}
            <div
              draggable={!noSponsors && sponsorTiers.length > 1}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`border rounded p-2 space-y-2 bg-background
                transition-all duration-300 ease-out
                ${draggedIndex === index 
                  ? 'opacity-60 scale-95 shadow-xl rotate-1 cursor-grabbing border-muted' 
                  : 'border-border'
                }
                ${draggedIndex !== null && draggedIndex !== index
                  ? 'opacity-90'
                  : ''
                }
                ${!noSponsors && sponsorTiers.length > 1 ? 'hover:shadow-md hover:border-primary/50' : ''}
              `}
              style={{
                transform: draggedIndex === index 
                  ? 'scale(0.95) rotate(1deg)' 
                  : 'translateY(0) scale(1)',
              }}
            >
            <div className="flex gap-2 items-end">
              {!noSponsors && sponsorTiers.length > 1 && (
                <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground self-center pb-1">
                  <GripVertical className="w-4 h-4" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Tier Name</Label>
                <Input 
                  placeholder="e.g., Platinum" 
                  value={tier.tier} 
                  onChange={(e) => updateSponsorTier(index, 'tier', e.target.value)} 
                  disabled={noSponsors} 
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Cost ($)</Label>
                <Input 
                  type="number" 
                  placeholder="5000" 
                  value={tier.cost} 
                  onChange={(e) => updateSponsorTier(index, 'cost', e.target.value)} 
                  disabled={noSponsors} 
                />
              </div>
              {sponsorTiers.length > 1 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeSponsorTier(index)} 
                  disabled={noSponsors}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Input 
              placeholder="Benefits description" 
              value={tier.description} 
              onChange={(e) => updateSponsorTier(index, 'description', e.target.value)} 
              disabled={noSponsors} 
            />
            <div className="flex items-center gap-3">
              <Input 
                type="number" 
                placeholder="Slots" 
                value={tier.slots} 
                onChange={(e) => updateSponsorTier(index, 'slots', e.target.value)} 
                disabled={tier.unlimitedSlots || noSponsors} 
                className="w-24" 
              />
              <div className="flex items-center space-x-2">
                <Switch 
                  id={`${idPrefix}unlimited-${index}`} 
                  checked={tier.unlimitedSlots} 
                  onCheckedChange={(checked) => updateSponsorTier(index, 'unlimitedSlots', checked)} 
                  disabled={noSponsors} 
                />
                <Label htmlFor={`${idPrefix}unlimited-${index}`} className="text-xs">Unlimited</Label>
              </div>
              </div>
            </div>
            
            {/* Drop indicator line - after */}
            {dragOverIndex === index && dropPosition === 'after' && draggedIndex !== index && (
              <div className="absolute -bottom-1 left-0 right-0 z-10 flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary shadow-lg" />
                <div className="flex-1 h-0.5 bg-primary rounded-full shadow-lg" />
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary shadow-lg" />
              </div>
            )}
          </div>
        ))}
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={addSponsorTier} 
          className="w-full" 
          disabled={noSponsors}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Sponsor Tier
        </Button>
      </div>
      
      {!noSponsors && sponsorTiers.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Drag and drop to reorder tiers
        </p>
      )}
    </div>
  );
};

export default DraggableSponsorTiers;
