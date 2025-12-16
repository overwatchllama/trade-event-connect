import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon, Camera, FileImage } from 'lucide-react';

export interface CardImage {
  id?: string;
  image_type: 'front' | 'back' | 'slab' | 'label' | 'case' | 'other';
  storage_path?: string;
  file?: File;
  preview?: string;
}

interface CardImageUploadProps {
  collectionItemId?: string;
  images: CardImage[];
  onImagesChange: (images: CardImage[]) => void;
  maxImages?: number;
  showLabels?: boolean;
}

export const CardImageUpload: React.FC<CardImageUploadProps> = ({
  collectionItemId,
  images,
  onImagesChange,
  maxImages = 6,
  showLabels = true,
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRefs = {
    front: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
    slab: useRef<HTMLInputElement>(null),
    label: useRef<HTMLInputElement>(null),
    case: useRef<HTMLInputElement>(null),
    other: useRef<HTMLInputElement>(null),
  };

  const imageTypeLabels = {
    front: { label: 'Card Front', icon: ImageIcon, description: 'Front of the card' },
    back: { label: 'Card Back', icon: ImageIcon, description: 'Back of the card' },
    slab: { label: 'Slab/Case', icon: Camera, description: 'Full slab or case photo' },
    label: { label: 'Grade Label', icon: FileImage, description: 'Close-up of grading label' },
    case: { label: 'In Case', icon: Camera, description: 'Card in protective case' },
    other: { label: 'Other', icon: ImageIcon, description: 'Additional photos' },
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageType: CardImage['image_type']
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image must be less than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);

    // Add to images array, replacing existing image of same type
    const newImages = images.filter(img => img.image_type !== imageType);
    newImages.push({
      image_type: imageType,
      file,
      preview,
    });

    onImagesChange(newImages);

    // If collectionItemId exists, upload immediately
    if (collectionItemId) {
      await uploadImage(file, imageType, collectionItemId);
    }
  };

  const uploadImage = async (
    file: File,
    imageType: CardImage['image_type'],
    itemId: string
  ) => {
    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${itemId}/${imageType}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('card-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('card-images')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('card_images')
        .upsert({
          collection_item_id: itemId,
          user_id: user.id,
          image_type: imageType,
          storage_path: fileName,
          file_size: file.size,
          mime_type: file.type,
        }, {
          onConflict: 'collection_item_id,image_type',
        });

      if (dbError) throw dbError;

      toast({
        title: 'Image Uploaded',
        description: `${imageTypeLabels[imageType].label} uploaded successfully.`,
      });

      // Update images with storage path
      const updatedImages = images.map(img =>
        img.image_type === imageType
          ? { ...img, storage_path: fileName, preview: publicUrl }
          : img
      );
      onImagesChange(updatedImages);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (imageType: CardImage['image_type']) => {
    const image = images.find(img => img.image_type === imageType);
    if (!image) return;

    // If image is in storage, delete it
    if (image.storage_path && collectionItemId) {
      try {
        // Delete from storage
        await supabase.storage
          .from('card-images')
          .remove([image.storage_path]);

        // Delete from database
        await supabase
          .from('card_images')
          .delete()
          .eq('collection_item_id', collectionItemId)
          .eq('image_type', imageType);

        toast({
          title: 'Image Removed',
          description: `${imageTypeLabels[imageType].label} has been removed.`,
        });
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    // Remove from local state
    const newImages = images.filter(img => img.image_type !== imageType);
    onImagesChange(newImages);

    // Revoke preview URL
    if (image.preview) {
      URL.revokeObjectURL(image.preview);
    }
  };

  const getImageForType = (type: CardImage['image_type']) => {
    return images.find(img => img.image_type === type);
  };

  const renderImageSlot = (type: CardImage['image_type']) => {
    const image = getImageForType(type);
    const config = imageTypeLabels[type];
    const Icon = config.icon;

    return (
      <div key={type} className="space-y-2">
        {showLabels && (
          <Label className="text-sm font-medium">{config.label}</Label>
        )}
        <Card className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary transition-colors">
          <CardContent className="p-4">
            {image ? (
              <div className="relative group">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={image.preview || (image.storage_path ?
                      supabase.storage.from('card-images').getPublicUrl(image.storage_path).data.publicUrl :
                      '')}
                    alt={config.label}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(type)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Badge
                  variant="secondary"
                  className="absolute bottom-2 left-2"
                >
                  {config.label}
                </Badge>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRefs[type].current?.click()}
                className="w-full aspect-[3/4] flex flex-col items-center justify-center text-slate-400 hover:text-primary transition-colors"
                disabled={uploading}
              >
                <Icon className="h-8 w-8 mb-2" />
                <p className="text-sm font-medium">{config.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {config.description}
                </p>
                <Upload className="h-4 w-4 mt-2" />
              </button>
            )}
            <input
              ref={fileInputRefs[type]}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, type)}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Card Images</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload images of your card and grading slab
          </p>
        </div>
        <Badge variant="outline">
          {images.length} / {maxImages}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Priority images for graded cards */}
        {renderImageSlot('slab')}
        {renderImageSlot('label')}
        {renderImageSlot('front')}
        {renderImageSlot('back')}
        {renderImageSlot('case')}
        {renderImageSlot('other')}
      </div>

      {uploading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
            Uploading...
          </span>
        </div>
      )}

      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p>• Maximum file size: 5MB per image</p>
        <p>• Supported formats: JPG, PNG, WebP</p>
        <p>• For graded cards, include photos of the full slab and grading label</p>
      </div>
    </div>
  );
};
