-- First, drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS analysis_sessions CASCADE;

-- Create analysis_sessions table
CREATE TABLE analysis_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    total_estimated_value_usd DECIMAL(10,2) NOT NULL,
    room VARCHAR(100) NOT NULL,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_items table
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
    user_id UUID,
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

-- Create VERY permissive policies for development (allow everything)
CREATE POLICY "Allow all for development" ON analysis_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON inventory_items FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket (you'll need to run this in Supabase dashboard or separately)
-- This is just for reference:
/*
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true) 
ON CONFLICT (id) DO NOTHING;
*/ 