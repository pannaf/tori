/*
  # Add original_crop_image_url column to inventory_items

  1. Schema Changes
    - Add `original_crop_image_url` column to store the original cropped image URL
    - This allows users to toggle between enhanced and original images

  2. Notes
    - The column is nullable since existing items may not have original images
    - New items will have both enhanced and original image URLs
*/

-- Add the original_crop_image_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'original_crop_image_url'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN original_crop_image_url TEXT;
  END IF;
END $$;