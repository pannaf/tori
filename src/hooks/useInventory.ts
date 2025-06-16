import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { InventoryItem, Room, Category } from '../types/inventory';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface User {
  id: string;
  email: string;
}

// Default rooms and categories
const defaultRooms: Room[] = [
  { id: '1', name: 'Living Room', icon: 'sofa', color: '#6366F1' },
  { id: '2', name: 'Kitchen', icon: 'chef-hat', color: '#EC4899' },
  { id: '3', name: 'Bedroom', icon: 'bed', color: '#8B5CF6' },
  { id: '4', name: 'Bathroom', icon: 'bath', color: '#14B8A6' },
  { id: '5', name: 'Office', icon: 'briefcase', color: '#EF4444' },
  { id: '6', name: 'Garage', icon: 'car', color: '#F59E0B' },
  { id: '7', name: 'Dining Room', icon: 'utensils', color: '#10B981' },
  { id: '8', name: 'Other', icon: 'package', color: '#6B7280' },
];

const defaultCategories: Category[] = [
  { id: '1', name: 'Electronics', icon: 'smartphone', color: '#6366F1' },
  { id: '2', name: 'Furniture', icon: 'armchair', color: '#EC4899' },
  { id: '3', name: 'Appliances', icon: 'refrigerator', color: '#8B5CF6' },
  { id: '4', name: 'Decorative', icon: 'picture-in-picture', color: '#14B8A6' },
  { id: '5', name: 'Sports', icon: 'dumbbell', color: '#F97316' },
  { id: '6', name: 'Tools', icon: 'hammer', color: '#F59E0B' },
  { id: '7', name: 'Other', icon: 'package', color: '#6B7280' },
];

export const useInventory = (user: User | null = null, authLoading: boolean = false) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [rooms] = useState<Room[]>(defaultRooms);
  const [categories] = useState<Category[]>(defaultCategories);
  const [loading, setLoading] = useState(true);

  // Load items from Supabase when user changes
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    loadItems();
  }, [user, authLoading]);

  const loadItems = async () => {
    try {
      if (!user) {
        setLoading(false);
        setItems([]);
        return;
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading items:', error);
        setItems([]); // Clear items on error
      } else {
        // Transform Supabase data to match our interface
        const transformedItems = data.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          room: item.room,
          description: item.description || '',
          imageUrl: item.crop_image_data || item.image_data,
          originalCropImageUrl: item.original_crop_image_url, // Add original image URL
          dateAdded: item.created_at,
          tags: item.tags || [],
          condition: item.condition || 'good',
          estimatedValue: item.estimated_value,
        }));
        setItems(transformedItems);
      }
    } catch (error) {
      console.error('Error in loadItems:', error);
      setItems([]); // Clear items on error
    } finally {
      setLoading(false);
    }
  };

  const saveItemToSupabase = async (item: InventoryItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const supabaseItem = {
        // Don't include id - let Supabase generate UUID
        name: item.name,
        category: item.category,
        room: item.room,
        description: item.description,
        estimated_value: item.estimatedValue,
        tags: item.tags,
        condition: item.condition,
        crop_image_data: item.imageUrl,
        original_crop_image_url: item.originalCropImageUrl, // Include original image URL
        original_full_image_url: item.originalFullImageUrl, // Include original full image URL
        user_id: user.id,
        ai_detected: false,
        detection_confidence: null,
      };

      const { data, error } = await supabase
        .from('inventory_items')
        .insert(supabaseItem)
        .select()
        .single();

      if (error) {
        console.error('Error saving to Supabase:', error);
        throw error;
      }

      // Update the item with the Supabase-generated UUID
      return data;
    } catch (error) {
      console.error('Error in saveItemToSupabase:', error);
      throw error;
    }
  };

  const addItem = async (item: Omit<InventoryItem, 'id' | 'dateAdded'>): Promise<string | null> => {
    try {
      // Create the item with a temporary ID for immediate UI update
      const tempItem: InventoryItem = {
        ...item,
        id: Date.now().toString(), // Temporary ID
        dateAdded: new Date().toISOString(),
      };

      // Save to Supabase first
      const supabaseItem = await saveItemToSupabase(tempItem);

      // Create the final item with Supabase UUID
      const finalItem: InventoryItem = {
        ...tempItem,
        id: supabaseItem.id, // Use Supabase-generated UUID
        dateAdded: supabaseItem.created_at,
        originalCropImageUrl: supabaseItem.original_crop_image_url, // Include original image URL
        originalFullImageUrl: supabaseItem.original_full_image_url, // Include original full image URL
      };

      // Update local state
      setItems(prevItems => [...prevItems, finalItem]);

      // Return the actual database ID for maintenance schedule creation
      return supabaseItem.id;
    } catch (error) {
      console.error('Failed to save item:', error);
      throw error; // Let the UI handle the error
    }
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    // Update local state immediately for responsive UI
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    );

    // Update database directly with Supabase
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          name: updates.name,
          category: updates.category,
          room: updates.room,
          description: updates.description,
          estimated_value: updates.estimatedValue,
          tags: updates.tags,
          condition: updates.condition,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update item in database:', error);
        throw error;
      }

      console.log('Successfully updated item:', data);
    } catch (error) {
      console.error('Error updating item:', error);
      // Revert local state on error
      await loadItems();
      throw error; // Let the UI handle the error
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error deleting from Supabase:', error);
          throw error;
        }
      }

      // Update local state
      setItems(prevItems => prevItems.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error in deleteItem:', error);
      throw error; // Let the UI handle the error
    }
  };

  const searchItems = (query: string, roomFilter?: string, categoryFilter?: string) => {
    return items.filter(item => {
      const matchesQuery = !query ||
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));

      const matchesRoom = !roomFilter || item.room === roomFilter;
      const matchesCategory = !categoryFilter || item.category === categoryFilter;

      return matchesQuery && matchesRoom && matchesCategory;
    });
  };

  return {
    items,
    rooms,
    categories,
    loading,
    addItem,
    updateItem,
    deleteItem,
    searchItems,
    refreshItems: loadItems,
  };
};