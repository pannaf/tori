import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { InventoryItem, Room, Category } from '../types/inventory';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const STORAGE_KEY = 'home-inventory';

const defaultRooms: Room[] = [
  { id: '1', name: 'Living Room', icon: 'sofa', color: '#6366F1' },
  { id: '2', name: 'Kitchen', icon: 'chef-hat', color: '#EC4899' },
  { id: '3', name: 'Bedroom', icon: 'bed', color: '#8B5CF6' },
  { id: '4', name: 'Bathroom', icon: 'bath', color: '#14B8A6' },
  { id: '5', name: 'Garage', icon: 'car', color: '#F59E0B' },
  { id: '6', name: 'Office', icon: 'briefcase', color: '#EF4444' },
];

const defaultCategories: Category[] = [
  { id: '1', name: 'Electronics', icon: 'smartphone', color: '#6366F1' },
  { id: '2', name: 'Furniture', icon: 'armchair', color: '#EC4899' },
  { id: '3', name: 'Appliances', icon: 'refrigerator', color: '#8B5CF6' },
  { id: '4', name: 'Clothing', icon: 'shirt', color: '#14B8A6' },
  { id: '5', name: 'Books', icon: 'book', color: '#F59E0B' },
  { id: '6', name: 'Kitchen', icon: 'utensils', color: '#EF4444' },
  { id: '7', name: 'Decorative', icon: 'picture-in-picture', color: '#10B981' },
  { id: '8', name: 'Sports', icon: 'dumbbell', color: '#F97316' },
];

export const useInventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [rooms] = useState<Room[]>(defaultRooms);
  const [categories] = useState<Category[]>(defaultCategories);
  const [loading, setLoading] = useState(true);

  // Load items from Supabase
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading items:', error);
        // Fallback to localStorage if Supabase fails
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setItems(JSON.parse(saved));
        }
      } else {
        // Transform Supabase data to match our interface
        const transformedItems = data.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          room: item.room,
          description: item.description || '',
          imageUrl: item.crop_image_data || item.image_data,
          dateAdded: item.created_at,
          tags: item.tags || [],
          condition: item.condition || 'good',
          estimatedValue: item.estimated_value,
        }));
        setItems(transformedItems);
        // Also save to localStorage as backup
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transformedItems));
      }
    } catch (error) {
      console.error('Error in loadItems:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
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
        id: item.id,
        name: item.name,
        category: item.category,
        room: item.room,
        description: item.description,
        estimated_value: item.estimatedValue,
        tags: item.tags,
        condition: item.condition,
        crop_image_data: item.imageUrl,
        user_id: user.id,
        ai_detected: false,
        detection_confidence: null,
      };

      const { error } = await supabase
        .from('inventory_items')
        .upsert(supabaseItem);

      if (error) {
        console.error('Error saving to Supabase:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in saveItemToSupabase:', error);
      // Continue with localStorage save even if Supabase fails
    }
  };

  const saveItems = async (newItems: InventoryItem[]) => {
    setItems(newItems);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  };

  const addItem = async (item: Omit<InventoryItem, 'id' | 'dateAdded'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString(),
    };
    
    const updatedItems = [...items, newItem];
    await saveItems(updatedItems);
    
    // Try to save to Supabase
    await saveItemToSupabase(newItem);
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    await saveItems(updatedItems);
    
    // Try to save to Supabase
    const updatedItem = updatedItems.find(item => item.id === id);
    if (updatedItem) {
      await saveItemToSupabase(updatedItem);
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
        }
      }
    } catch (error) {
      console.error('Error in deleteItem:', error);
    }
    
    const updatedItems = items.filter(item => item.id !== id);
    await saveItems(updatedItems);
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