import React, { useState, useCallback, useRef } from 'react';
import { Plus, Wrench, Home, Search, BarChart3, Zap, LogOut, User } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useMaintenanceDB } from './hooks/useMaintenanceDB';
import { useInventoryStats } from './hooks/useInventoryStats';
import { AddItemModal } from './components/AddItemModal';
import { ItemCard } from './components/ItemCard';
import { ItemDetailModal } from './components/ItemDetailModal';
import { EditItemModal } from './components/EditItemModal';
import { SearchAndFilters } from './components/SearchAndFilters';
import { MaintenanceInterface } from './components/MaintenanceInterface';
import { StatsOverview } from './components/StatsOverview';
import { AuthModal } from './components/AuthModal';
import { InventoryItem } from './types/inventory';
import { createClient } from '@supabase/supabase-js';
import { env } from './config/env';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Placeholder images for different states  
const LOADING_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+CiAgPCEtLSBCYWNrZ3JvdW5kIC0tPgogIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjhmYWZjIi8+CiAgCiAgPCEtLSBNYWluIGltYWdlIHBsYWNlaG9sZGVyIC0tPgogIDxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSI3NSIgcng9IjEyIiBmaWxsPSIjZTJlOGYwIiBzdHJva2U9IiNjYmQ1ZTEiIHN0cm9rZS13aWR0aD0iMiIvPgogIAogIDwhLS0gSW1hZ2UgaWNvbiAtLT4KICA8Y2lyY2xlIGN4PSI3NSIgY3k9IjgwIiByPSI4IiBmaWxsPSIjOTRhM2I4Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSI5MCw5NSAxMTAsNzUgMTMwLDg1IDE0MCw3NSAxNDAsMTA1IDkwLDEwNSIgZmlsbD0iIzk0YTNiOCIvPgogIAogIDwhLS0gQW5pbWF0ZWQgc2hpbW1lciBlZmZlY3QgLS0+CiAgPHJlY3QgeD0iNTAiIHk9IjUwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9Ijc1IiByeD0iMTIiIGZpbGw9InVybCgjc2hpbW1lcikiIG9wYWNpdHk9IjAuNyI+CiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJvcGFjaXR5IiB2YWx1ZXM9IjAuMzswLjg7MC4zIiBkdXI9IjEuNXMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIi8+CiAgPC9yZWN0PgogIAogIDwhLS0gR3JhZGllbnQgZGVmaW5pdGlvbiAtLT4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ic2hpbW1lciIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjFmNWY5O3N0b3Atb3BhY2l0eTowIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZTJlOGYwO3N0b3Atb3BhY2l0eToxIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6I2YxZjVmOTtzdG9wLW9wYWNpdHk6MCIvPgogICAgICA8YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPSJncmFkaWVudFRyYW5zZm9ybSIgdHlwZT0idHJhbnNsYXRlIiB2YWx1ZXM9Ii0yMDAgMDsyMDAgMDstMjAwIDAiIGR1cj0iMnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICAKICA8IS0tIExvYWRpbmcgdGV4dCAtLT4KICA8dGV4dCB4PSIxMDAiIHk9IjE2MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY0NzQ4YiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iNTAwIj5Mb2FkaW5nIGltYWdlLi4uPC90ZXh0Pgo8L3N2Zz4K';

const NO_IMAGE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmM2Y0ZjYiLz4KICA8cmVjdCB4PSI2MCIgeT0iNjAiIHdpZHRoPSI4MCIgaGVpZ2h0PSI2MCIgcng9IjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2QxZDVkYiIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgPGxpbmUgeDE9Ijc1IiB5MT0iNzUiIHgyPSIxMjUiIHkyPSIxMDUiIHN0cm9rZT0iI2QxZDVkYiIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPGNpcmNsZSBjeD0iODUiIGN5PSI4NSIgcj0iNCIgZmlsbD0iI2QxZDVkYiIvPgogIDx0ZXh0IHg9IjEwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4=';

// Default rooms and categories
const defaultRooms = [
  { id: '1', name: 'Living Room', icon: 'sofa', color: '#6366F1' },
  { id: '2', name: 'Kitchen', icon: 'chef-hat', color: '#EC4899' },
  { id: '3', name: 'Bedroom', icon: 'bed', color: '#8B5CF6' },
  { id: '4', name: 'Bathroom', icon: 'bath', color: '#14B8A6' },
  { id: '5', name: 'Office', icon: 'briefcase', color: '#EF4444' },
  { id: '6', name: 'Garage', icon: 'car', color: '#F59E0B' },
  { id: '7', name: 'Dining Room', icon: 'utensils', color: '#10B981' },
  { id: '8', name: 'Other', icon: 'package', color: '#6B7280' },
];

const defaultCategories = [
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

type TabType = 'home' | 'search' | 'stats' | 'care';

function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Single source of truth for all inventory data
  const {
    stats,
    roomDistribution,
    categoryDistribution,
    recentItems,
    allItemsForMaintenance,
    loading: statsLoading,
    refreshStats,
    allItems // Raw data for search/filtering
  } = useInventoryStats(user);

  const { createMaintenanceSchedule } = useMaintenanceDB(user);

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [itemsAddedInSession, setItemsAddedInSession] = useState(0);

  // Get rooms and categories that exist in the data, with default fallback for new ones
  // Always show all rooms and categories for consistency in both dev and production
  const roomsWithData = new Set(roomDistribution.map(dist => dist.room).filter(Boolean));
  const rooms = defaultRooms; // Always show all rooms

  // Always show all categories for consistency
  const categoriesWithData = new Set(categoryDistribution.map(dist => dist.category).filter(Boolean));
  const categories = defaultCategories; // Always show all categories

  // Search state
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [displayedItems, setDisplayedItems] = useState<InventoryItem[]>([]);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialSearchComplete, setInitialSearchComplete] = useState(false);

  // Debounce timer for search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter items based on search criteria
  const filterItems = useCallback((query: string, room: string, category: string) => {
    let filtered = [...allItems];

    if (query) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        (item.description || '').toLowerCase().includes(searchLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (room) {
      filtered = filtered.filter(item => item.room === room);
    }

    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }

    return filtered;
  }, [allItems]);

  // Optimistic loading for search results - show immediately, load images progressively
  const updateDisplayedItems = useCallback(async (filtered: InventoryItem[], loadImages = true, isInitialLoad = false) => {
    const initialItems = filtered.slice(0, 8);

    // Always show items immediately for instant UI feedback (with loading placeholders)
    const itemsWithLoadingPlaceholders = initialItems.map(item => ({
      ...item,
      imageUrl: (item.imageUrl && item.imageUrl.includes('f3f4f6')) ? LOADING_IMAGE : (item.imageUrl || LOADING_IMAGE)
    }));
    setDisplayedItems(itemsWithLoadingPlaceholders);
    setShowLoadMore(filtered.length > 8);
    if (isInitialLoad) setInitialSearchComplete(true);

    // Skip image loading if not needed
    if (!loadImages || initialItems.length === 0 || !user) {
      return;
    }

    // Load images progressively in background without blocking UI
    for (const item of initialItems) {
      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('id, crop_image_data')
          .eq('id', item.id)
          .single();

        if (!error && data?.crop_image_data) {
          // Update with actual image
          setDisplayedItems(currentItems =>
            currentItems.map(currentItem =>
              currentItem.id === item.id
                ? { ...currentItem, imageUrl: data.crop_image_data }
                : currentItem
            )
          );
        } else {
          // No image available - update to "No Image" placeholder
          setDisplayedItems(currentItems =>
            currentItems.map(currentItem =>
              currentItem.id === item.id
                ? { ...currentItem, imageUrl: NO_IMAGE_PLACEHOLDER }
                : currentItem
            )
          );
        }
      } catch (error) {
        console.error('Error loading image for item:', item.id, error);
        // Update to "No Image" placeholder on error
        setDisplayedItems(currentItems =>
          currentItems.map(currentItem =>
            currentItem.id === item.id
              ? { ...currentItem, imageUrl: NO_IMAGE_PLACEHOLDER }
              : currentItem
          )
        );
      }
    }
  }, [user]);

  // Handle search with debouncing
  const handleSearch = useCallback((query: string, room?: string, category?: string) => {
    setSearchQuery(query);
    setSelectedRoom(room || '');
    setSelectedCategory(category || '');

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearchLoading(true);

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(async () => {
      const filtered = filterItems(query, room || '', category || '');
      setFilteredItems(filtered);

      // Update displayed items with images
      await updateDisplayedItems(filtered, true, false);
      setSearchLoading(false);
    }, 500);
  }, [filterItems, updateDisplayedItems]);

  // Immediate search for Enter key press
  const handleSearchSubmit = useCallback(async (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setSearchLoading(true);
    const filtered = filterItems(query, selectedRoom, selectedCategory);
    setFilteredItems(filtered);
    await updateDisplayedItems(filtered, true, false);
    setSearchLoading(false);
  }, [filterItems, selectedRoom, selectedCategory, updateDisplayedItems]);

  // Clear all filters
  const handleClearFilters = useCallback(async () => {
    setSearchQuery('');
    setSelectedRoom('');
    setSelectedCategory('');

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearchLoading(true);
    setInitialSearchComplete(false);
    const filtered = filterItems('', '', '');
    setFilteredItems(filtered);
    await updateDisplayedItems(filtered, true, true);
    setSearchLoading(false);
  }, [filterItems, updateDisplayedItems]);

  // Optimistic load more - show items immediately, load images progressively
  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    const nextItems = filteredItems.slice(displayedItems.length, displayedItems.length + 8);

    // Show items immediately with loading placeholders
    const nextItemsWithLoadingPlaceholders = nextItems.map(item => ({
      ...item,
      imageUrl: LOADING_IMAGE
    }));
    setDisplayedItems(prev => [...prev, ...nextItemsWithLoadingPlaceholders]);
    setShowLoadMore(filteredItems.length > displayedItems.length + nextItems.length);
    setLoadingMore(false);

    // Load images progressively in background
    if (user) {
      for (const item of nextItems) {
        try {
          const { data, error } = await supabase
            .from('inventory_items')
            .select('id, crop_image_data')
            .eq('id', item.id)
            .single();

          if (!error && data?.crop_image_data) {
            // Update with actual image
            setDisplayedItems(current =>
              current.map(currentItem =>
                currentItem.id === item.id
                  ? { ...currentItem, imageUrl: data.crop_image_data }
                  : currentItem
              )
            );
          } else {
            // No image available - update to "No Image" placeholder
            setDisplayedItems(current =>
              current.map(currentItem =>
                currentItem.id === item.id
                  ? { ...currentItem, imageUrl: NO_IMAGE_PLACEHOLDER }
                  : currentItem
              )
            );
          }
        } catch (error) {
          console.error('Error loading image for load more item:', item.id, error);
          // Update to "No Image" placeholder on error
          setDisplayedItems(current =>
            current.map(currentItem =>
              currentItem.id === item.id
                ? { ...currentItem, imageUrl: NO_IMAGE_PLACEHOLDER }
                : currentItem
            )
          );
        }
      }
    }
  }, [filteredItems, displayedItems.length, user]);

  // Initialize filtered items when allItems changes, but only when on search tab
  React.useEffect(() => {
    if (allItems.length > 0 && activeTab === 'search') {
      setInitialSearchComplete(false);
      const filtered = filterItems(searchQuery, selectedRoom, selectedCategory);
      setFilteredItems(filtered);
      updateDisplayedItems(filtered, true, true);
    }
  }, [allItems, filterItems, searchQuery, selectedRoom, selectedCategory, updateDisplayedItems, activeTab]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Scroll to top when changing tabs
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Get item details (for viewing/editing individual items)
  const getItemDetails = async (itemId: string): Promise<InventoryItem | null> => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', itemId)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error loading item details:', error);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        category: data.category,
        room: data.room,
        description: data.description || '',
        imageUrl: data.crop_image_data || data.image_data || '',
        originalCropImageUrl: data.original_crop_image_url,
        originalFullImageUrl: data.original_full_image_url,
        dateAdded: data.created_at,
        tags: data.tags || [],
        condition: data.condition || 'good',
        estimatedValue: data.estimated_value,
      };
    } catch (error) {
      console.error('Error in getItemDetails:', error);
      return null;
    }
  };

  // Add item
  const addItem = async (item: Omit<InventoryItem, 'id' | 'dateAdded'>): Promise<string | null> => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('User not authenticated');

      const supabaseItem = {
        name: item.name,
        category: item.category,
        room: item.room,
        description: item.description,
        estimated_value: item.estimatedValue,
        tags: item.tags,
        condition: item.condition,
        crop_image_data: item.imageUrl,
        original_crop_image_url: item.originalCropImageUrl,
        original_full_image_url: item.originalFullImageUrl,
        user_id: currentUser.id,
        ai_detected: false,
        detection_confidence: null,
      };

      const { data, error } = await supabase
        .from('inventory_items')
        .insert(supabaseItem)
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Failed to save item:', error);
      throw error;
    }
  };

  // Update item
  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const { error } = await supabase
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
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  };

  // Delete item
  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  };

  const handleItemClick = async (item: InventoryItem) => {
    // Show modal immediately with existing data for snappy UX
    setSelectedItem(item);
    setShowItemDetail(true);

    // Load full details in background (for image switching features)
    getItemDetails(item.id).then(fullItem => {
      if (fullItem) {
        setSelectedItem(fullItem);
      }
    }).catch(error => {
      console.error('Error loading full item details:', error);
      // Modal still works with basic data
    });
  };

  const handleItemEdit = async (item: InventoryItem) => {
    // Show edit modal immediately with existing data for snappy UX
    setSelectedItem(item);
    setShowItemDetail(false);
    setShowEditModal(true);

    // Load full details in background (for image previews if needed)
    getItemDetails(item.id).then(fullItem => {
      if (fullItem) {
        setSelectedItem(fullItem);
      }
    }).catch(error => {
      console.error('Error loading full item details:', error);
      // Modal still works with basic data
    });
  };

  const handleItemDelete = async (id: string) => {
    await deleteItem(id);
    refreshStats(); // Refresh the single source of truth
    setShowItemDetail(false);
  };

  const handleSaveEdit = async (id: string, updates: Partial<InventoryItem>) => {
    await updateItem(id, updates);
    refreshStats(); // Refresh the single source of truth
    setShowEditModal(false);
    setSelectedItem(null);
  };

  const handleSignIn = async (email: string, password: string) => {
    await signIn(email, password);
    setShowAuthModal(false);
    // scroll up after signing in
    window.scrollTo(0, 0);
  };

  const handleSignUp = async (email: string, password: string) => {
    await signUp(email, password);
    setShowAuthModal(false);
  };

  const handleSignOut = () => {
    signOut();
    setShowUserMenu(false);
  };

  const handleAddItemWithMaintenance = async (
    item: Omit<InventoryItem, 'id' | 'dateAdded'>,
    maintenanceData?: {
      title: string;
      description: string;
      intervalType: 'days' | 'weeks' | 'months' | 'years';
      intervalValue: number;
      priority: 'low' | 'medium' | 'high' | 'urgent';
    }
  ) => {
    try {
      // Add the item first and get its ID
      const itemId = await addItem(item);

      // If maintenance is enabled and we have maintenance data, create the schedule
      if (itemId && maintenanceData && maintenanceData.title && user) {
        // Calculate the next due date
        const nextDueDate = new Date();
        switch (maintenanceData.intervalType) {
          case 'days':
            nextDueDate.setDate(nextDueDate.getDate() + maintenanceData.intervalValue);
            break;
          case 'weeks':
            nextDueDate.setDate(nextDueDate.getDate() + (maintenanceData.intervalValue * 7));
            break;
          case 'months':
            nextDueDate.setMonth(nextDueDate.getMonth() + maintenanceData.intervalValue);
            break;
          case 'years':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + maintenanceData.intervalValue);
            break;
        }

        await createMaintenanceSchedule(itemId, {
          title: maintenanceData.title,
          description: maintenanceData.description,
          intervalType: maintenanceData.intervalType,
          intervalValue: maintenanceData.intervalValue,
          nextDueDate: nextDueDate.toISOString().split('T')[0],
          priority: maintenanceData.priority,
          isActive: true,
        });
      }

      // Track that an item was added in this session
      setItemsAddedInSession(prev => prev + 1);

      // Only refresh immediately if this is likely a single manual addition
      // For AI mode with multiple items, defer refresh until modal closes
      if (itemsAddedInSession === 0) {
        // This is the first item in the session - likely manual addition
        console.log('🔄 Manual item added, refreshing stats after short delay...');
        // Add a small delay to ensure database transaction is fully committed
        setTimeout(() => {
          console.log('🔄 Executing stats refresh for manual item...');
          refreshStats();
        }, 200);
      }
      // For subsequent items (AI mode), let the modal close handler refresh once
    } catch (error) {
      console.error('Error adding item with maintenance:', error);
      // Let the UI handle the error
      throw error;
    }
  };

  // Show loading screen only for auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-bold mb-6 shadow-lg shadow-indigo-500/25">
            <Zap size={20} />
            Tori
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth modal if not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center relative">
        {/* Bolt.new badge - positioned absolutely in top right */}
        <div className="absolute top-6 right-6">
          <a
            href="https://bolt.new/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-12 h-12 sm:w-16 sm:h-16 hover:scale-110 transition-transform duration-200"
            title="Built with Bolt.new"
          >
            <img
              src="/black_circle_360x360.png"
              alt="Built with Bolt.new"
              className="w-full h-full object-contain"
            />
          </a>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-bold mb-6 shadow-lg shadow-indigo-500/25">
            <Zap size={20} />
            Tori
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Tori</h1>
          <p className="text-gray-600 mb-8">Your AI-powered home inventory</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-full font-bold hover:shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105"
          >
            Get Started
          </button>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* Header with clean layout */}
            <div className="relative text-center py-6">
              {/* User menu button - top left */}
              <div className="absolute top-0 left-0">
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-8 h-8 bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-full flex items-center justify-center text-indigo-600 hover:bg-gradient-to-r hover:from-indigo-200 hover:to-purple-200 transition-all duration-200"
                  >
                    <User size={14} />
                  </button>

                  {/* Dropdown menu */}
                  {showUserMenu && (
                    <div className="absolute left-0 top-10 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 min-w-48 z-10">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">Signed in as</p>
                        <p className="text-sm text-gray-600 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bolt.new badge - top right */}
              <div className="absolute top-0 right-0">
                <a
                  href="https://bolt.new/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-20 h-20 sm:w-24 sm:h-24 hover:scale-110 transition-transform duration-200"
                  title="Built with Bolt.new"
                >
                  <img
                    src="/black_circle_360x360.png"
                    alt="Built with Bolt.new"
                    className="w-full h-full object-contain"
                  />
                </a>
              </div>

              {/* Centered Tori branding */}
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-bold mb-4 shadow-lg shadow-indigo-500/25">
                <Zap size={20} />
                Tori
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-0 leading-tight">
                Home Inventory
              </h1>

              {stats.totalCount === 0 && !statsLoading && (
                <p className="text-gray-600 leading-relaxed">
                  Let's get started by adding your first item with AI-powered photo recognition
                </p>
              )}

              {/* Stats right after header with minimal spacing */}
              {!statsLoading && stats.totalCount > 0 && (
                <div className="mt-4">
                  <StatsOverview
                    totalCount={stats.totalCount}
                    totalValue={stats.totalValue}
                    recentCount={stats.recentCount}
                    totalRooms={stats.totalRooms}
                    variant="compact"
                  />
                </div>
              )}
            </div>

            {/* Click outside to close user menu */}
            {showUserMenu && (
              <div
                className="fixed inset-0 z-5"
                onClick={() => setShowUserMenu(false)}
              />
            )}

            {statsLoading ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Recent Additions</h2>
                </div>
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm">Loading your inventory...</p>
                </div>
              </div>
            ) : allItems.length === 0 ? (
              <div className="text-center py-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-full font-bold hover:shadow-xl hover:shadow-emerald-500/25 transition-all duration-300 hover:scale-105 mb-6"
                >
                  Add Your First Item
                </button>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Ready to get organized?</h3>
                <p className="text-gray-600 max-w-sm mx-auto leading-relaxed">
                  Snap a photo and let Tori's AI catalog everything for you
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Recent Additions</h2>
                  {recentItems.length > 0 && (
                    <button
                      onClick={() => setActiveTab('search')}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors font-semibold"
                    >
                      View all →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {recentItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEdit={handleItemEdit}
                      onDelete={handleItemDelete}
                      onClick={handleItemClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'search':
        return (
          <div className="space-y-6 relative">
            {/* Bolt.new badge - positioned absolutely in top right */}
            <div className="absolute top-0 right-0">
              <a
                href="https://bolt.new/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-12 h-12 sm:w-16 sm:h-16 hover:scale-110 transition-transform duration-200"
                title="Built with Bolt.new"
              >
                <img
                  src="/black_circle_360x360.png"
                  alt="Built with Bolt.new"
                  className="w-full h-full object-contain"
                />
              </a>
            </div>

            <div className="text-center py-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Home Search</h1>
              <p className="text-gray-600">Find items in your inventory</p>
            </div>

            <SearchAndFilters
              searchQuery={searchQuery}
              onSearchChange={(query) => handleSearch(query, selectedRoom, selectedCategory)}
              selectedRoom={selectedRoom}
              onRoomChange={(room) => handleSearch(searchQuery, room, selectedCategory)}
              selectedCategory={selectedCategory}
              onCategoryChange={(category) => handleSearch(searchQuery, selectedRoom, category)}
              onSearchSubmit={handleSearchSubmit}
              onClearFilters={handleClearFilters}
              rooms={rooms}
              categories={categories}
            />

            {/* Results area with localized loading */}
            {searchLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600 text-sm">Searching...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {displayedItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEdit={handleItemEdit}
                      onDelete={handleItemDelete}
                      onClick={handleItemClick}
                    />
                  ))}
                </div>

                {/* Load more button - only show after initial search is complete */}
                {showLoadMore && initialSearchComplete && (
                  <div className="text-center py-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                    >
                      {loadingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          Load more ({filteredItems.length - displayedItems.length} remaining)
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Loading indicator for initial search */}
                {!initialSearchComplete && displayedItems.length > 0 && (
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                      <span className="text-sm">Loading images...</span>
                    </div>
                  </div>
                )}

                {filteredItems.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="mx-auto mb-4 text-gray-400" size={48} />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Nothing found</h3>
                    <p className="text-gray-600">
                      Try a different search term or adjust your filters
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-6 relative">
            {/* Bolt.new badge - positioned absolutely in top right */}
            <div className="absolute top-0 right-0">
              <a
                href="https://bolt.new/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-12 h-12 sm:w-16 sm:h-16 hover:scale-110 transition-transform duration-200"
                title="Built with Bolt.new"
              >
                <img
                  src="/black_circle_360x360.png"
                  alt="Built with Bolt.new"
                  className="w-full h-full object-contain"
                />
              </a>
            </div>

            <div className="text-center py-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Home Stats</h1>
              <p className="text-gray-600">See how organized you are!</p>
            </div>

            <StatsOverview
              totalCount={stats.totalCount}
              totalValue={stats.totalValue}
              recentCount={stats.recentCount}
              totalRooms={stats.totalRooms}
            />

            {stats.totalCount > 0 && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Distribution</h3>
                  <div className="space-y-3">
                    {roomDistribution.map(({ room, count, percentage }) => (
                      <div key={room} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{room}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
                  <div className="space-y-3">
                    {categoryDistribution.map(({ category, count, percentage }) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'care':
        return (
          <div className="space-y-6 relative">
            {/* Bolt.new badge - positioned absolutely in top right */}
            <div className="absolute top-0 right-0">
              <a
                href="https://bolt.new/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-12 h-12 sm:w-16 sm:h-16 hover:scale-110 transition-transform duration-200"
                title="Built with Bolt.new"
              >
                <img
                  src="/black_circle_360x360.png"
                  alt="Built with Bolt.new"
                  className="w-full h-full object-contain"
                />
              </a>
            </div>

            <div className="text-center py-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Home Care</h1>
              <p className="text-gray-600">Keep things in perfect condition</p>
            </div>

            <MaintenanceInterface
              items={allItemsForMaintenance}
              user={user}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-md mx-auto bg-white min-h-screen relative shadow-xl shadow-slate-200/50">
        {/* Main Content */}
        <div className="pb-24">
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* Unified Floating Pill Navigation */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-white/95 backdrop-blur-xl rounded-full shadow-2xl shadow-gray-900/10 border border-gray-200/50 p-2">
            <div className="flex items-center">
              {/* Left Navigation Items */}
              {[
                { key: 'home', icon: Home, label: 'Home' },
                { key: 'stats', icon: BarChart3, label: 'Stats' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as TabType)}
                  className={`relative flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${activeTab === key
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon size={20} />
                  {activeTab === key && (
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {label}
                    </span>
                  )}
                </button>
              ))}

              {/* Center Add Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center w-14 h-14 mx-2 bg-white border-2 border-gray-300 text-gray-600 rounded-full hover:border-gray-400 hover:text-gray-800 hover:shadow-lg hover:scale-110 transition-all duration-300 shadow-sm"
                title="Add new item"
              >
                <Plus size={24} />
              </button>

              {/* Right Navigation Items */}
              {[
                { key: 'search', icon: Search, label: 'Search' },
                { key: 'care', icon: Wrench, label: 'Care' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as TabType)}
                  className={`relative flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${activeTab === key
                    ? key === 'care'
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-500/25'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon size={20} />
                  {activeTab === key && (
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modals */}
        <AddItemModal
          isOpen={showAddModal}
          onClose={() => {
            // Refresh stats if any items were added in this session
            if (itemsAddedInSession > 0) {
              console.log('🔄 AI session completed, refreshing stats after delay for', itemsAddedInSession, 'items...');
              // Add a delay to ensure the last database transaction is fully committed
              setTimeout(() => {
                console.log('🔄 Executing stats refresh for AI session...');
                refreshStats();
              }, 100);
            }
            setItemsAddedInSession(0);
            setShowAddModal(false);
          }}
          onAdd={handleAddItemWithMaintenance}
          rooms={rooms}
          categories={categories}
          user={user}
        />

        <ItemDetailModal
          item={selectedItem}
          isOpen={showItemDetail}
          onClose={() => setShowItemDetail(false)}
          onEdit={handleItemEdit}
          onDelete={handleItemDelete}
        />

        <EditItemModal
          item={selectedItem}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
          rooms={rooms}
          categories={categories}
          user={user}
        />
      </div>
    </div>
  );
}

export default App;