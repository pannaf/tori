import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables first
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
}

// Regular client for database operations with RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client for backend operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Database types for TypeScript
export interface InventoryItem {
    id?: string;
    name: string;
    category: string;
    room: string;
    description?: string;
    condition?: string;
    estimated_value: number;
    tags?: string[];
    image_data?: string;
    crop_image_data?: string;
    original_crop_image_url?: string;
    original_full_image_url?: string;
    ai_detected?: boolean;
    detection_confidence?: number;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
}

// AnalysisSession interface removed - no longer using sessions table 