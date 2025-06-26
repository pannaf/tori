import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { InventoryItem, Room, Category } from '../types/inventory';
import { env } from '../config/env';

// Placeholder image for development mode
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmM2Y0ZjYiLz4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iMjUiIGZpbGw9IiNkMWQ1ZGIiLz4KICA8cmVjdCB4PSI3NSIgeT0iMTIwIiB3aWR0aD0iNTAiIGhlaWdodD0iMzAiIHJ4PSI1IiBmaWxsPSIjZDFkNWRiIi8+CiAgPHRleHQgeD0iMTAwIiB5PSIxNzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5Y2EzYWYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';

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
  { id: '2', name: 'Appliances', icon: 'refrigerator', color: '#8B5CF6' },
  { id: '3', name: 'Furniture', icon: 'armchair', color: '#EC4899' },
  { id: '4', name: 'Kitchenware', icon: 'chef-hat', color: '#F59E0B' },
  { id: '5', name: 'Tools', icon: 'hammer', color: '#EF4444' },
  { id: '6', name: 'Sports & Recreation', icon: 'dumbbell', color: '#F97316' },
  { id: '7', name: 'Books & Media', icon: 'book-open', color: '#10B981' },
  { id: '8', name: 'Clothing & Accessories', icon: 'shirt', color: '#14B8A6' },
  { id: '9', name: 'Decorations', icon: 'picture-in-picture', color: '#84CC16' },
  { id: '10', name: 'Personal Care', icon: 'heart', color: '#F43F5E' },
  { id: '11', name: 'Collectibles & Mementos', icon: 'star', color: '#A855F7' },
  { id: '12', name: 'Other', icon: 'package', color: '#6B7280' },
];

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalCount: number;
  hasMore: boolean;
}

interface SearchFilters {
  query?: string;
  room?: string;
  category?: string;
}

export const useInventory = (user: User | null = null, authLoading: boolean = false) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [rooms] = useState<Room[]>(defaultRooms);
  const [categories] = useState<Category[]>(defaultCategories);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 0,
    itemsPerPage: 8, // Reduced from 20 to 8 for better performance with images
    totalCount: 0,
    hasMore: true
  });

  // Current search filters
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});

  // Load items from Supabase when user changes
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    // Reset pagination and load first page
    setPagination(prev => ({ ...prev, currentPage: 0 }));
    setCurrentFilters({});
    loadItems(0, {});
  }, [user, authLoading]);

  const loadItems = async (page: number = 0, filters: SearchFilters = {}, append: boolean = false) => {
    try {
      if (!user) {
        setLoading(false);
        setItems([]);
        return;
      }

      if (!append) setLoading(true);
      setSearchLoading(true);

      // Skip database queries in development to avoid Supabase timeouts
      if (env.IS_DEVELOPMENT) {
        console.log('🚀 Development Mode: Using mock inventory data');

        // Mock inventory data
        const mockItems: InventoryItem[] = [
          {
            id: '1',
            name: 'MacBook Pro 13"',
            category: 'Electronics',
            room: 'Office',
            description: 'M2 MacBook Pro for work',
            condition: 'excellent' as const,
            estimatedValue: 1299,
            tags: ['laptop', 'apple', 'work'],
            dateAdded: new Date().toISOString(),
            imageUrl: PLACEHOLDER_IMAGE
          },
          {
            id: '2',
            name: 'Coffee Maker',
            category: 'Appliances',
            room: 'Kitchen',
            description: 'Breville espresso machine',
            condition: 'good' as const,
            estimatedValue: 299,
            tags: ['appliance', 'coffee'],
            dateAdded: new Date().toISOString(),
            imageUrl: PLACEHOLDER_IMAGE
          },
          {
            id: '3',
            name: 'Desk Chair',
            category: 'Furniture',
            room: 'Office',
            description: 'Ergonomic office chair',
            condition: 'good' as const,
            estimatedValue: 199,
            tags: ['furniture', 'office'],
            dateAdded: new Date().toISOString(),
            imageUrl: PLACEHOLDER_IMAGE
          }
        ];

        setItems(mockItems);
        setPagination(prev => ({
          ...prev,
          currentPage: page,
          totalCount: mockItems.length,
          hasMore: false
        }));

        setLoading(false);
        setSearchLoading(false);
        return;
      }

      // Build query - fetch images for smaller result sets (8 items per page)
      // This should be safe with the reduced page size
      const selectFields = 'id, name, category, room, description, condition, estimated_value, tags, created_at, crop_image_data';

      let query = supabase
        .from('inventory_items')
        .select(selectFields, { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(page * pagination.itemsPerPage, (page + 1) * pagination.itemsPerPage - 1);

      // Apply search filters at database level
      if (filters.query) {
        query = query.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%,tags.cs.{${filters.query}}`);
      }
      if (filters.room) {
        query = query.eq('room', filters.room);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error loading items:', error);
        if (!append) setItems([]);
      } else {
        // Transform Supabase data to match our interface
        // With reduced page size (8 items), we can safely show real images
        const transformedItems = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          room: item.room,
          description: item.description || '',
          imageUrl: item.crop_image_data || PLACEHOLDER_IMAGE,
          dateAdded: item.created_at,
          tags: item.tags || [],
          condition: item.condition || 'good',
          estimatedValue: item.estimated_value,
        }));

        if (append) {
          setItems(prevItems => [...prevItems, ...transformedItems]);
        } else {
          setItems(transformedItems);
        }

        // Update pagination state
        setPagination(prev => ({
          ...prev,
          currentPage: page,
          totalCount: count || 0,
          hasMore: (page + 1) * prev.itemsPerPage < (count || 0)
        }));
      }
    } catch (error) {
      console.error('Error in loadItems:', error);
      if (!append) setItems([]);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  // Load more items for infinite scroll
  const loadMore = async () => {
    if (!pagination.hasMore || searchLoading) return;

    const nextPage = pagination.currentPage + 1;
    await loadItems(nextPage, currentFilters, true);
  };

  // Search with server-side filtering
  const searchItems = async (query: string, roomFilter?: string, categoryFilter?: string) => {
    const filters: SearchFilters = {
      query: query || undefined,
      room: roomFilter || undefined,
      category: categoryFilter || undefined
    };

    setCurrentFilters(filters);
    setPagination(prev => ({ ...prev, currentPage: 0 }));
    await loadItems(0, filters, false);
  };

  // Get item details with full image data (only when needed)
  const getItemDetails = async (itemId: string): Promise<InventoryItem | null> => {
    try {
      // For single item details, we can safely fetch image data since it's only one item
      const selectFields = '*';

      const { data, error } = await supabase
        .from('inventory_items')
        .select(selectFields)
        .eq('id', itemId)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error loading item details:', error);
        return null;
      }

      return {
        id: (data as any).id,
        name: (data as any).name,
        category: (data as any).category,
        room: (data as any).room,
        description: (data as any).description || '',
        imageUrl: (data as any).crop_image_data || (data as any).image_data || PLACEHOLDER_IMAGE,
        originalCropImageUrl: (data as any).original_crop_image_url,
        originalFullImageUrl: (data as any).original_full_image_url,
        dateAdded: (data as any).created_at,
        tags: (data as any).tags || [],
        condition: (data as any).condition || 'good',
        estimatedValue: (data as any).estimated_value,
      };
    } catch (error) {
      console.error('Error in getItemDetails:', error);
      return null;
    }
  };

  // Get summary stats without loading full item details
  const getItemStats = async () => {
    try {
      if (!user) return { totalCount: 0, totalValue: 0, recentCount: 0 };

      // Skip database queries in development to avoid Supabase timeouts
      if (env.IS_DEVELOPMENT) {
        console.log('🚀 Development Mode: Skipping stats query');
        return {
          totalCount: 14,
          totalValue: 8750,
          recentCount: 3
        };
      }

      // Get total count and sum of estimated values
      const { data, error } = await supabase
        .from('inventory_items')
        .select('estimated_value, created_at')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading stats:', error);
        return { totalCount: 0, totalValue: 0, recentCount: 0 };
      }

      const totalCount = data.length;
      const totalValue = data.reduce((sum, item) => sum + (item.estimated_value || 0), 0);

      // Count items added in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentCount = data.filter(item =>
        new Date(item.created_at) > sevenDaysAgo
      ).length;

      return { totalCount, totalValue, recentCount };
    } catch (error) {
      console.error('Error in getItemStats:', error);
      return { totalCount: 0, totalValue: 0, recentCount: 0 };
    }
  };

  // Get room distribution for stats
  const getRoomDistribution = async () => {
    try {
      if (!user) return [];

      // Skip database queries in development to avoid Supabase timeouts
      if (env.IS_DEVELOPMENT) {
        console.log('🚀 Development Mode: Skipping room distribution query');
        return [
          { room: 'Living Room', count: 5, percentage: 35 },
          { room: 'Kitchen', count: 4, percentage: 28 },
          { room: 'Bedroom', count: 3, percentage: 21 },
          { room: 'Office', count: 2, percentage: 14 }
        ];
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .select('room')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading room distribution:', error);
        return [];
      }

      // Count items per room
      const roomCounts: { [key: string]: number } = {};
      data.forEach(item => {
        // Handle empty, null, or undefined room values as "Uncategorized"
        const room = item.room && item.room.trim() ? item.room : 'Uncategorized';
        roomCounts[room] = (roomCounts[room] || 0) + 1;
      });

      return Object.entries(roomCounts)
        .map(([room, count]) => ({
          room,
          count,
          percentage: data.length > 0 ? (count / data.length) * 100 : 0
        }))
        .sort((a, b) => {
          // Always put "Uncategorized" at the bottom
          if (a.room === 'Uncategorized') return 1;
          if (b.room === 'Uncategorized') return -1;
          // Sort others alphabetically
          return a.room.localeCompare(b.room);
        });
    } catch (error) {
      console.error('Error in getRoomDistribution:', error);
      return [];
    }
  };

  // Get category distribution for stats
  const getCategoryDistribution = async () => {
    try {
      if (!user) return [];

      // Skip database queries in development to avoid Supabase timeouts
      if (env.IS_DEVELOPMENT) {
        console.log('🚀 Development Mode: Skipping category distribution query');
        return [
          { category: 'Electronics', count: 8, percentage: 35 },
          { category: 'Appliances', count: 5, percentage: 22 },
          { category: 'Furniture', count: 4, percentage: 17 },
          { category: 'Kitchenware', count: 3, percentage: 13 },
          { category: 'Tools', count: 2, percentage: 9 },
          { category: 'Other', count: 1, percentage: 4 }
        ];
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .select('category')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading category distribution:', error);
        return [];
      }

      // Count items per category
      const categoryCounts: { [key: string]: number } = {};
      data.forEach(item => {
        // Handle empty, null, or undefined category values as "Uncategorized"
        const category = item.category && item.category.trim() ? item.category : 'Uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

      return Object.entries(categoryCounts)
        .map(([category, count]) => ({
          category,
          count,
          percentage: data.length > 0 ? (count / data.length) * 100 : 0
        }))
        .sort((a, b) => {
          // Always put "Uncategorized" at the bottom
          if (a.category === 'Uncategorized') return 1;
          if (b.category === 'Uncategorized') return -1;
          // Sort others alphabetically
          return a.category.localeCompare(b.category);
        });
    } catch (error) {
      console.error('Error in getCategoryDistribution:', error);
      return [];
    }
  };

  // Get recent items for home page (separate from main paginated items)
  const getRecentItems = async () => {
    try {
      if (!user) return [];

      // Development mode bypass - return mock data
      if (env.IS_DEVELOPMENT) {
        console.log('🚀 Development Mode: Using mock recent items data');
        return [
          {
            id: 'recent-1',
            name: 'MacBook Pro',
            category: 'Electronics',
            room: 'Office',
            description: '13-inch laptop for work',
            imageUrl: PLACEHOLDER_IMAGE,
            dateAdded: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            tags: ['work', 'computer'],
            condition: 'excellent' as const,
            estimatedValue: 1200,
          },
          {
            id: 'recent-2',
            name: 'Coffee Maker',
            category: 'Appliances',
            room: 'Kitchen',
            description: 'Automatic drip coffee maker',
            imageUrl: PLACEHOLDER_IMAGE,
            dateAdded: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            tags: ['appliance'],
            condition: 'good' as const,
            estimatedValue: 80,
          },
          {
            id: 'recent-3',
            name: 'Desk Chair',
            category: 'Furniture',
            room: 'Office',
            description: 'Ergonomic office chair',
            imageUrl: PLACEHOLDER_IMAGE,
            dateAdded: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
            tags: ['furniture', 'office'],
            condition: 'good' as const,
            estimatedValue: 150,
          },
        ];
      }

      // Fetch recent items with images - limited to 4 items for performance
      const selectFields = 'id, name, category, room, description, condition, estimated_value, tags, created_at, crop_image_data';

      const { data, error } = await supabase
        .from('inventory_items')
        .select(selectFields)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4); // Reduced from 6 to 4 for better performance

      if (error) {
        console.error('Error loading recent items:', error);
        return [];
      }

      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        room: item.room,
        description: item.description || '',
        imageUrl: item.crop_image_data || PLACEHOLDER_IMAGE, // Show real images for recent items
        dateAdded: item.created_at,
        tags: item.tags || [],
        condition: item.condition || 'good',
        estimatedValue: item.estimated_value,
      }));
    } catch (error) {
      console.error('Error in getRecentItems:', error);
      return [];
    }
  };

  // Get all items for maintenance (without heavy image data)
  const getAllItemsForMaintenance = async () => {
    try {
      if (!user) return [];

      // Development mode bypass - return mock data
      if (env.IS_DEVELOPMENT) {
        console.log('🚀 Development Mode: Using mock maintenance items data');
        return [
          {
            id: 'maint-1',
            name: 'MacBook Pro',
            category: 'Electronics',
            room: 'Office',
            description: '13-inch laptop for work',
            imageUrl: PLACEHOLDER_IMAGE,
            dateAdded: new Date(Date.now() - 86400000).toISOString(),
            tags: ['work', 'computer'],
            condition: 'excellent' as const,
            estimatedValue: 1200,
          },
          {
            id: 'maint-2',
            name: 'Coffee Maker',
            category: 'Appliances',
            room: 'Kitchen',
            description: 'Automatic drip coffee maker',
            imageUrl: PLACEHOLDER_IMAGE,
            dateAdded: new Date(Date.now() - 172800000).toISOString(),
            tags: ['appliance'],
            condition: 'good' as const,
            estimatedValue: 80,
          },
        ];
      }

      // Exclude large image data from maintenance query to prevent timeouts
      const selectFields = 'id, name, category, room, description, condition, estimated_value, tags, created_at';

      const { data, error } = await supabase
        .from('inventory_items')
        .select(selectFields)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading items for maintenance:', error);
        return [];
      }

      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        room: item.room,
        description: item.description || '',
        imageUrl: PLACEHOLDER_IMAGE, // Always use placeholder in list views
        dateAdded: item.created_at,
        tags: item.tags || [],
        condition: item.condition || 'good',
        estimatedValue: item.estimated_value,
      }));
    } catch (error) {
      console.error('Error in getAllItemsForMaintenance:', error);
      return [];
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

  return {
    items,
    rooms,
    categories,
    loading,
    searchLoading,
    pagination,
    addItem,
    updateItem,
    deleteItem,
    searchItems,
    refreshItems: () => loadItems(0, {}),
    loadMore,
    getItemDetails,
    getItemStats,
    getRoomDistribution,
    getCategoryDistribution,
    getRecentItems,
    getAllItemsForMaintenance,
  };
};