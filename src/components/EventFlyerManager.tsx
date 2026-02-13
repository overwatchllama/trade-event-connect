import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, MapPin, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type Event = Database['public']['Tables']['events']['Row'];

interface EventFlyerManagerProps {
  event: Event;
  onEventUpdate: (event: Event) => void;
}

export const EventFlyerManager = ({ event, onEventUpdate }: EventFlyerManagerProps) => {
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [addingFloorPlan, setAddingFloorPlan] = useState(false);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [viewSide, setViewSide] = useState<'front' | 'back'>('front');

  const uploadFile = async (file: File, side: 'front' | 'back') => {
    const setter = side === 'front' ? setUploadingFront : setUploadingBack;
    setter(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${event.id}-${side}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('event-flyers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-flyers')
        .getPublicUrl(fileName);

      const updateField = side === 'front' ? 'flyer_url' : 'flyer_back_url';
      const { error: updateError } = await supabase
        .from('events')
        .update({ [updateField]: publicUrl })
        .eq('id', event.id);

      if (updateError) throw updateError;

      onEventUpdate({ ...event, [updateField]: publicUrl });
      if (side === 'front') setFrontFile(null);
      else setBackFile(null);
      toast.success(`Flyer ${side} uploaded successfully!`);
    } catch (error) {
      console.error(`Error uploading flyer ${side}:`, error);
      toast.error(`Failed to upload flyer ${side}`);
    } finally {
      setter(false);
    }
  };

  const addFloorPlanToFlyer = async () => {
    if (!event.layout_json) {
      toast.error('No floor plan exists yet. Create one in the Floor Plan tab first.');
      return;
    }

    setAddingFloorPlan(true);
    try {
      // Export the floor plan canvas to an image
      const fabricModule = await import('fabric');
      const tempCanvas = new fabricModule.Canvas(null as any, { width: 800, height: 600 });

      await tempCanvas.loadFromJSON(event.layout_json as Record<string, any>);
      tempCanvas.renderAll();

      const dataUrl = tempCanvas.toDataURL({ format: 'png', multiplier: 2 });

      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${event.id}-floorplan-${Date.now()}.png`, { type: 'image/png' });

      // Upload as the back of the flyer
      const fileName = `${event.id}-floorplan-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('event-flyers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-flyers')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('events')
        .update({ flyer_back_url: publicUrl })
        .eq('id', event.id);

      if (updateError) throw updateError;

      onEventUpdate({ ...event, flyer_back_url: publicUrl });
      setViewSide('back');
      toast.success('Floor plan added as flyer back!');
      tempCanvas.dispose();
    } catch (error) {
      console.error('Error adding floor plan:', error);
      toast.error('Failed to add floor plan to flyer');
    } finally {
      setAddingFloorPlan(false);
    }
  };

  const frontUrl = event.flyer_url;
  const backUrl = (event as any).flyer_back_url;
  const currentUrl = viewSide === 'front' ? frontUrl : backUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Flyer</CardTitle>
        <CardDescription>
          Upload front and back images for your event flyer. You can also add your floor plan as the back.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview with flip toggle */}
        {(frontUrl || backUrl) && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Button
                variant={viewSide === 'front' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewSide('front')}
              >
                Front
              </Button>
              <Button
                variant={viewSide === 'back' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewSide('back')}
              >
                Back
              </Button>
            </div>
            <div className="aspect-[9/16] rounded-lg overflow-hidden border border-border max-w-md mx-auto bg-muted flex items-center justify-center">
              {currentUrl ? (
                <img
                  src={currentUrl}
                  alt={`Flyer ${viewSide}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <p className="text-muted-foreground text-sm">No {viewSide} image uploaded</p>
              )}
            </div>
          </div>
        )}

        {/* Upload sections */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Front upload */}
          <div className="space-y-3">
            <Label htmlFor="flyer-front" className="font-semibold">Front Image</Label>
            <Input
              id="flyer-front"
              type="file"
              accept="image/*"
              onChange={(e) => setFrontFile(e.target.files?.[0] || null)}
            />
            <Button
              onClick={() => frontFile && uploadFile(frontFile, 'front')}
              disabled={!frontFile || uploadingFront}
              className="w-full"
            >
              {uploadingFront ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Upload Front</>
              )}
            </Button>
          </div>

          {/* Back upload */}
          <div className="space-y-3">
            <Label htmlFor="flyer-back" className="font-semibold">Back Image</Label>
            <Input
              id="flyer-back"
              type="file"
              accept="image/*"
              onChange={(e) => setBackFile(e.target.files?.[0] || null)}
            />
            <Button
              onClick={() => backFile && uploadFile(backFile, 'back')}
              disabled={!backFile || uploadingBack}
              className="w-full"
            >
              {uploadingBack ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Upload Back</>
              )}
            </Button>
          </div>
        </div>

        {/* Floor plan to flyer button */}
        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Use your floor plan layout as the back of the flyer.
          </p>
          <Button
            variant="outline"
            onClick={addFloorPlanToFlyer}
            disabled={addingFloorPlan || !event.layout_json}
          >
            {addingFloorPlan ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding Floor Plan...</>
            ) : (
              <><MapPin className="h-4 w-4 mr-2" /> Add Floor Plan as Back</>
            )}
          </Button>
          {!event.layout_json && (
            <p className="text-xs text-muted-foreground mt-1">
              Create a floor plan in the Floor Plan tab first.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
