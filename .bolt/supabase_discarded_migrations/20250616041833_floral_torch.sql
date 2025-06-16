/*
  # Add original_crop_image_url column to inventory_items

  1. New Column
    - Add `original_crop_image_url` to store the original cropped image URL
    - This allows users to toggle between enhanced and original images

  2. Data Migration
    - For existing items, the original_crop_image_url will be NULL
    - New items will have both enhanced and original image URLs
*/

-- Add the original_crop_image_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' 
    AND column_name = 'original_crop_image_url'
  ) THEN
    ALTER TABLE inventory_items 
    ADD COLUMN original_crop_image_url TEXT;
    
    -- Add a comment to explain the column
    COMMENT ON COLUMN inventory_items.original_crop_image_url IS 'URL to the original cropped image before AI enhancement';
  END IF;
END $$;