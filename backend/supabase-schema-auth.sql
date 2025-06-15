-- First, drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS analysis_sessions CASCADE;

-- Create analysis_sessions table with proper auth.users reference
CREATE TABLE analysis_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    total_estimated_value_usd DECIMAL(10,2) NOT NULL,
    room VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_items table with proper auth.users reference
CREATE TABLE inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    room VARCHAR(100) NOT NULL,
    description TEXT,
    condition VARCHAR(100),
    estimated_value DECIMAL(10,2) NOT NULL,
    tags TEXT[],
    image_data TEXT,
    crop_image_data TEXT,
    ai_detected BOOLEAN DEFAULT true,
    detection_confidence DECIMAL(5,4),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_inventory_items_session_id ON inventory_items(session_id);
CREATE INDEX idx_inventory_items_room ON inventory_items(room);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_items_user_id ON inventory_items(user_id);
CREATE INDEX idx_inventory_items_ai_detected ON inventory_items(ai_detected);
CREATE INDEX idx_analysis_sessions_created_at ON analysis_sessions(created_at);
CREATE INDEX idx_analysis_sessions_user_id ON analysis_sessions(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies that use auth.uid() to match the logged-in user
CREATE POLICY "Users can only see their own analysis sessions" 
ON analysis_sessions FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only see their own inventory items" 
ON inventory_items FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Allow anonymous users to create sessions and items (for users not logged in)
CREATE POLICY "Allow anonymous operations" 
ON analysis_sessions FOR ALL 
USING (user_id IS NULL) 
WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow anonymous operations on items" 
ON inventory_items FOR ALL 
USING (user_id IS NULL) 
WITH CHECK (user_id IS NULL);

-- Create storage policies for the images bucket
-- Note: You might need to run these separately if the bucket doesn't exist yet
/*
-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations" ON storage.objects;

-- Create comprehensive storage policy
CREATE POLICY "Allow all storage operations for images bucket" 
ON storage.objects FOR ALL 
USING (bucket_id = 'images');
*/ 