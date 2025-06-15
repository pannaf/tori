import { supabase, InventoryItem, AnalysisSession } from './supabase.js';

/**
 * Create a new analysis session
 * @param sessionData - Analysis session data
 * @returns Promise with the created session or error
 */
export async function createAnalysisSession(sessionData: Omit<AnalysisSession, 'id' | 'created_at' | 'updated_at'>): Promise<AnalysisSession> {
    try {
        const { data, error } = await supabase
            .from('analysis_sessions')
            .insert([sessionData])
            .select()
            .single();

        if (error) {
            console.error('Database error creating analysis session:', error);
            throw new Error(`Failed to create analysis session: ${error.message}`);
        }

        console.log('Successfully created analysis session:', data.id);
        return data;
    } catch (error) {
        console.error('Error creating analysis session:', error);
        throw error;
    }
}

/**
 * Create inventory items
 * @param items - Array of inventory items
 * @param sessionId - ID of the analysis session
 * @returns Promise with the created items or error
 */
export async function createInventoryItems(items: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>[], sessionId?: string): Promise<InventoryItem[]> {
    try {
        // Add session_id to each item if provided
        const itemsWithSession = sessionId
            ? items.map(item => ({ ...item, session_id: sessionId }))
            : items;

        const { data, error } = await supabase
            .from('inventory_items')
            .insert(itemsWithSession)
            .select();

        if (error) {
            console.error('Database error creating inventory items:', error);
            throw new Error(`Failed to create inventory items: ${error.message}`);
        }

        console.log(`Successfully created ${data.length} inventory items`);
        return data;
    } catch (error) {
        console.error('Error creating inventory items:', error);
        throw error;
    }
}

/**
 * Get all inventory items
 * @param sessionId - Optional session ID to filter by
 * @param userId - Optional user ID to filter by
 * @returns Promise with inventory items or error
 */
export async function getInventoryItems(sessionId?: string, userId?: string): Promise<InventoryItem[]> {
    try {
        let query = supabase
            .from('inventory_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (sessionId) {
            query = query.eq('session_id', sessionId);
        }

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Database error fetching inventory items:', error);
            throw new Error(`Failed to fetch inventory items: ${error.message}`);
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching inventory items:', error);
        throw error;
    }
}

/**
 * Get analysis sessions
 * @param limit - Number of sessions to fetch (default: 10)
 * @param userId - Optional user ID to filter by
 * @returns Promise with analysis sessions or error
 */
export async function getAnalysisSessions(limit: number = 10, userId?: string): Promise<AnalysisSession[]> {
    try {
        let query = supabase
            .from('analysis_sessions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Database error fetching analysis sessions:', error);
            throw new Error(`Failed to fetch analysis sessions: ${error.message}`);
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching analysis sessions:', error);
        throw error;
    }
}

/**
 * Update an inventory item
 * @param itemId - ID of the item to update
 * @param updates - Partial item data to update
 * @returns Promise with updated item or error
 */
export async function updateInventoryItem(itemId: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
        const { data, error } = await supabase
            .from('inventory_items')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', itemId)
            .select()
            .single();

        if (error) {
            console.error('Database error updating inventory item:', error);
            throw new Error(`Failed to update inventory item: ${error.message}`);
        }

        console.log('Successfully updated inventory item:', itemId);
        return data;
    } catch (error) {
        console.error('Error updating inventory item:', error);
        throw error;
    }
}

/**
 * Delete an inventory item
 * @param itemId - ID of the item to delete
 * @returns Promise with success status
 */
export async function deleteInventoryItem(itemId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('inventory_items')
            .delete()
            .eq('id', itemId);

        if (error) {
            console.error('Database error deleting inventory item:', error);
            return false;
        }

        console.log('Successfully deleted inventory item:', itemId);
        return true;
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        return false;
    }
}

/**
 * Get inventory items by category
 * @param category - Category to filter by
 * @param userId - Optional user ID to filter by
 * @returns Promise with inventory items or error
 */
export async function getInventoryItemsByCategory(category: string, userId?: string): Promise<InventoryItem[]> {
    try {
        let query = supabase
            .from('inventory_items')
            .select('*')
            .eq('category', category)
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Database error fetching inventory items by category:', error);
            throw new Error(`Failed to fetch inventory items by category: ${error.message}`);
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching inventory items by category:', error);
        throw error;
    }
}

/**
 * Get inventory items by room
 * @param room - Room to filter by
 * @param userId - Optional user ID to filter by
 * @returns Promise with inventory items or error
 */
export async function getInventoryItemsByRoom(room: string, userId?: string): Promise<InventoryItem[]> {
    try {
        let query = supabase
            .from('inventory_items')
            .select('*')
            .eq('room', room)
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Database error fetching inventory items by room:', error);
            throw new Error(`Failed to fetch inventory items by room: ${error.message}`);
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching inventory items by room:', error);
        throw error;
    }
} 