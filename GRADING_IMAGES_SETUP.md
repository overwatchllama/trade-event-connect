# Grading Images Setup Guide

This guide will help you set up the image grading feature for your personal collection, which allows you to upload and manage images of slabbed cards from PSA, CGC, Beckett, and other grading companies.

## Database Migration

### Step 1: Apply the Migration

Run the database migration to create the necessary tables:

```bash
# If using Supabase CLI
supabase db push

# Or apply manually in Supabase Dashboard
# Go to SQL Editor and run: supabase/migrations/20251216000002_add_card_images_support.sql
```

This creates:
- `card_images` table for storing image metadata
- Image count columns on `collection_items`
- Triggers to update image counts automatically
- Row Level Security policies

## Supabase Storage Setup

### Step 2: Create Storage Bucket

1. **Open Supabase Dashboard**
   - Go to your project at https://app.supabase.com
   - Navigate to **Storage** in the left sidebar

2. **Create New Bucket**
   - Click **New bucket**
   - Bucket name: `card-images`
   - **Public bucket**: ✅ Yes (check this box)
   - File size limit: 5MB (recommended)
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
   - Click **Create bucket**

### Step 3: Configure Storage Policies

After creating the bucket, set up the storage policies:

1. **Navigate to Storage Policies**
   - Click on the `card-images` bucket
   - Go to **Policies** tab
   - Click **New Policy**

2. **Create Upload Policy**
   ```sql
   -- Policy name: "Allow authenticated users to upload their own images"
   -- Target roles: authenticated
   -- For: INSERT

   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'card-images' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

3. **Create Update Policy**
   ```sql
   -- Policy name: "Allow users to update their own images"
   -- Target roles: authenticated
   -- For: UPDATE

   CREATE POLICY "Allow users to update own images"
   ON storage.objects FOR UPDATE
   TO authenticated
   USING (
     bucket_id = 'card-images' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

4. **Create Delete Policy**
   ```sql
   -- Policy name: "Allow users to delete their own images"
   -- Target roles: authenticated
   -- For: DELETE

   CREATE POLICY "Allow users to delete own images"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (
     bucket_id = 'card-images' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

5. **Create Public Read Policy**
   ```sql
   -- Policy name: "Public read access"
   -- Target roles: public, authenticated
   -- For: SELECT

   CREATE POLICY "Public read access"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'card-images');
   ```

### Alternative: Quick Setup via SQL

You can run all policies at once in the SQL Editor:

```sql
-- Create storage bucket (if not already created)
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-images', 'card-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'card-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'card-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'card-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'card-images');
```

## Features Overview

### Image Types Supported

The system supports 6 types of images per card:

1. **Front** - Front of the card
2. **Back** - Back of the card
3. **Slab** - Full photo of the grading slab/case
4. **Label** - Close-up of the grading label
5. **Case** - Card in protective case
6. **Other** - Any additional photos

### File Requirements

- **Maximum file size**: 5MB per image
- **Supported formats**: JPG, PNG, WebP
- **Recommended resolution**: 1200x1600px (3:4 aspect ratio)
- **Storage path pattern**: `{user_id}/{item_id}/{type}-{timestamp}.{ext}`

### Grading Companies Supported

- **PSA** (Professional Sports Authenticator)
- **BGS/Beckett** (Beckett Grading Services)
- **CGC** (Certified Guaranty Company)
- **SGC** (Sportscard Guaranty)
- **ACE** (ACE Grading)

## Using the Feature

### Adding a Graded Card with Images

1. **Create a Graded Card**
   - Navigate to `/my-collection`
   - Click "Add Card"
   - Fill in card details
   - Check "This card is graded"
   - Select grading company (PSA, BGS, CGC, etc.)
   - Enter grade score (1-10, half points allowed)
   - Enter certification number
   - Click "Add to Collection"

2. **Upload Images**
   - After saving, the image upload section appears
   - Click on each image slot to upload:
     - **Slab/Case**: Full photo of the graded slab
     - **Grade Label**: Close-up of PSA/BGS/CGC label
     - **Card Front**: Front of the card
     - **Card Back**: Back of the card
   - Images upload automatically
   - You can delete and re-upload as needed

3. **View Graded Cards Gallery**
   - Click "Graded Cards Gallery" button
   - Browse all your graded cards
   - Click any card to view full-size images
   - Navigate between images with arrow keys or buttons
   - See thumbnails of all images

### Best Practices for Photos

**For PSA Slabs:**
- Take photos in good lighting (avoid glare)
- Include the entire slab in frame
- Get a clear shot of the PSA label
- Capture the certification number clearly

**For BGS/Beckett Slabs:**
- Show the entire slab including all sub-grades
- Close-up of the label with all scores visible
- Front and back of the card through the case

**For CGC Slabs:**
- Full slab photo showing the CGC label
- Close-up of the grade and barcode
- Both sides of the card

**General Tips:**
- Use natural lighting when possible
- Avoid flash reflections on plastic cases
- Keep camera steady (use a tripod if available)
- Take multiple shots and pick the best one
- Higher resolution is better (but under 5MB)

## Storage Organization

Images are organized by user and card:

```
card-images/
  └── {user_id}/
      └── {collection_item_id}/
          ├── slab-1702345678901.jpg
          ├── label-1702345679123.jpg
          ├── front-1702345680456.jpg
          └── back-1702345681789.jpg
```

This structure:
- Keeps each user's images separate
- Groups all images for a card together
- Allows easy cleanup when cards are deleted
- Enables efficient access control via RLS

## Troubleshooting

### Upload Fails

**Error: "Failed to upload image"**
- Check file size (must be < 5MB)
- Verify file type (JPG, PNG, WebP only)
- Ensure you're authenticated
- Check storage bucket exists

**Error: "User not authenticated"**
- Sign out and sign back in
- Check browser console for auth errors

### Images Not Displaying

**Blank image slots**
- Check storage policies are configured
- Verify bucket is public
- Check browser console for 403/404 errors

**Images show broken link icon**
- Storage bucket may not be public
- Check the storage path in database matches uploaded file
- Verify file wasn't manually deleted from storage

### Performance Issues

**Slow upload**
- Reduce image size before uploading
- Check internet connection
- Try uploading one image at a time

**Gallery loads slowly**
- Images are auto-resized on display
- Consider compressing images before upload
- Limit concurrent image loads

## Security Considerations

### Row Level Security (RLS)

All tables have RLS enabled:
- Users can only view/edit their own images
- Storage folders are user-specific
- No cross-user access possible

### Storage Security

- Images organized by user ID
- Bucket policies enforce user boundaries
- Public read for sharing (images are not sensitive)
- Authenticated write only

### Best Practices

1. **Never upload sensitive information**
   - Card images should be fine to share publicly
   - Don't include personal information in photos
   - Certification numbers are fine (they're public records)

2. **Monitor storage usage**
   - Each user limited to reasonable storage
   - Delete unused images regularly
   - Supabase free tier: 1GB storage

3. **Backup important images**
   - Export your collection data
   - Download images before deleting cards
   - Keep local copies of valuable card photos

## Future Enhancements

Planned features:
- **OCR for grading labels** - Auto-fill grade info from photos
- **Image compression** - Automatic resizing and optimization
- **Bulk upload** - Upload multiple images at once
- **Image editing** - Crop, rotate, adjust brightness
- **Watermarking** - Add optional watermarks for sharing
- **Print layouts** - Generate printable collection sheets
- **Insurance documentation** - Export images with values for insurance

## Support

For issues or questions:
- Check database migration logs
- Verify storage bucket configuration
- Review browser console for errors
- Check Supabase dashboard for storage policies

---

**Quick Checklist:**
- [ ] Database migration applied
- [ ] Storage bucket created (`card-images`)
- [ ] Bucket set to public
- [ ] All 4 storage policies created
- [ ] Test upload with a sample card
- [ ] Verify images display in gallery
- [ ] Test delete functionality

Once complete, you're ready to start uploading images of your graded cards! 🎉
