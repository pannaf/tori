/*
  # Add Foreign Key Constraints to Auth Users

  1. Foreign Keys
    - Link `analysis_sessions.user_id` to `auth.users.id`
    - Link `inventory_items.user_id` to `auth.users.id`
  
  2. Benefits
    - Ensures data integrity
    - Shows relationships in schema visualizer
    - Prevents orphaned records
    - Automatic cleanup when users are deleted
*/

-- Add foreign key constraint for analysis_sessions.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'analysis_sessions_user_id_fkey'
  ) THEN
    ALTER TABLE analysis_sessions 
    ADD CONSTRAINT analysis_sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for inventory_items.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_items_user_id_fkey'
  ) THEN
    ALTER TABLE inventory_items 
    ADD CONSTRAINT inventory_items_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;