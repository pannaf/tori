/*
  # Update RLS policies for user authentication

  1. Security Changes
    - Remove permissive development policies
    - Add proper user-based RLS policies
    - Ensure users can only access their own data

  2. Policy Updates
    - Users can only see their own inventory items
    - Users can only see their own analysis sessions
    - Users can insert/update/delete their own data
*/

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all for development" ON analysis_sessions;
DROP POLICY IF EXISTS "Allow all for development" ON inventory_items;

-- Analysis Sessions Policies
CREATE POLICY "Users can view own analysis sessions"
  ON analysis_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis sessions"
  ON analysis_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis sessions"
  ON analysis_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis sessions"
  ON analysis_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Inventory Items Policies
CREATE POLICY "Users can view own inventory items"
  ON inventory_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory items"
  ON inventory_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory items"
  ON inventory_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory items"
  ON inventory_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);