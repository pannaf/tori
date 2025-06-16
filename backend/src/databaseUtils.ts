import { supabase, InventoryItem } from './supabase.js';

/**
 * Create inventory items
 * @param items - Array of inventory items
 * @returns Promise with the created items or error
 */
export async function createInventoryItems(items: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>[]): Promise<InventoryItem[]> {
    try {
        const { data, error } = await supabase
            .from('inventory_items')
            .insert(items)
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
 * @param userId - Optional user ID to filter by
 * @returns Promise with inventory items or error
 */
export async function getInventoryItems(userId?: string): Promise<InventoryItem[]> {
    try {
        let query = supabase
            .from('inventory_items')
            .select('*')
            .order('created_at', { ascending: false });

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
 * Update an inventory item
 * @param itemId - ID of the item to update
 * @param updates - Partial item data to update
 * @param userId - Optional user ID to ensure proper access control
 * @returns Promise with updated item or error
 */
export async function updateInventoryItem(itemId: string, updates: Partial<InventoryItem>, userId?: string): Promise<InventoryItem> {
    try {
        console.log('=== DATABASE UPDATE DEBUG ===');
        console.log('Item ID:', itemId);
        console.log('User ID:', userId);
        console.log('Updates to apply:', updates);

        // First check if the item exists (with user filter if provided)
        console.log('Checking if item exists...');
        let checkQuery = supabase
            .from('inventory_items')
            .select('*')
            .eq('id', itemId);

        if (userId) {
            checkQuery = checkQuery.eq('user_id', userId);
        }

        const { data: existingItem, error: checkError } = await checkQuery.single();

        console.log('Existing item check:');
        console.log('- Data:', existingItem);
        console.log('- Error:', checkError);

        if (checkError) {
            console.error('Item does not exist for update:', checkError);
            throw new Error(`Item not found: ${checkError.message}`);
        }

        // Prepare the update data
        const updateData = {
            ...updates,
            updated_at: new Date().toISOString()
        };
        console.log('Prepared update data:', updateData);

        // Perform the update (with user filter if provided)
        console.log('Performing update...');
        let updateQuery = supabase
            .from('inventory_items')
            .update(updateData)
            .eq('id', itemId);

        if (userId) {
            updateQuery = updateQuery.eq('user_id', userId);
        }

        const { data, error } = await updateQuery.select().single();

        console.log('Update result:');
        console.log('- Data:', data);
        console.log('- Error:', error);

        if (error) {
            console.error('Database error updating inventory item:', error);
            throw new Error(`Failed to update inventory item: ${error.message}`);
        }

        console.log('Successfully updated inventory item:', itemId);
        console.log('=== END DATABASE UPDATE DEBUG ===');
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