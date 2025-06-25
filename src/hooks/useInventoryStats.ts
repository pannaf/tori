import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { InventoryItem } from '../types/inventory';
import { env } from '../config/env';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Placeholder image for development mode
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmM2Y0ZjYiLz4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iMjUiIGZpbGw9IiNkMWQ1ZGIiLz4KICA8cmVjdCB4PSI3NSIgeT0iMTIwIiB3aWR0aD0iNTAiIGhlaWdodD0iMzAiIHJ4PSI1IiBmaWxsPSIjZDFkNWRiIi8+CiAgPHRleHQgeD0iMTAwIiB5PSIxNzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5Y2EzYWYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';

interface User {
    id: string;
    email: string;
}

interface ItemStats {
    totalCount: number;
    totalValue: number;
    recentCount: number;
    totalRooms: number;
}

interface RoomDistribution {
    room: string;
    count: number;
    percentage: number;
}

interface CategoryDistribution {
    category: string;
    count: number;
    percentage: number;
}

export const useInventoryStats = (user: User | null) => {
    const [allItems, setAllItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    // Load ALL data once and cache it
    const loadAllData = async () => {
        try {
            setLoading(true);

            if (!user) {
                setAllItems([]);
                setLoading(false);
                return;
            }

            // Development mode bypass
            if (env.IS_DEVELOPMENT) {
                console.log('🚀 Development Mode: Using mock data for stats');
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
                        dateAdded: new Date(Date.now() - 86400000).toISOString(),
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
                        dateAdded: new Date(Date.now() - 172800000).toISOString(),
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
                        dateAdded: new Date(Date.now() - 259200000).toISOString(),
                        imageUrl: PLACEHOLDER_IMAGE
                    },
                    {
                        id: '4',
                        name: 'Smart TV',
                        category: 'Electronics',
                        room: 'Living Room',
                        description: '55 inch OLED TV',
                        condition: 'excellent' as const,
                        estimatedValue: 899,
                        tags: ['tv', 'smart', 'entertainment'],
                        dateAdded: new Date(Date.now() - 345600000).toISOString(),
                        imageUrl: PLACEHOLDER_IMAGE
                    }
                ];
                setAllItems(mockItems);
                setLastRefresh(new Date());
                setLoading(false);
                return;
            }

            // Single efficient query - load metadata only (NO images to avoid timeouts)
            // Images will be loaded separately only when needed
            const { data, error } = await supabase
                .from('inventory_items')
                .select('id, name, category, room, description, condition, estimated_value, tags, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading inventory data:', error);
                setAllItems([]);
            } else {
                const transformedItems = data.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    category: item.category,
                    room: item.room,
                    description: item.description || '',
                    imageUrl: PLACEHOLDER_IMAGE, // Use placeholder - images loaded separately when needed
                    dateAdded: item.created_at,
                    tags: item.tags || [],
                    condition: item.condition || 'good',
                    estimatedValue: item.estimated_value,
                }));

                setAllItems(transformedItems);
                setLastRefresh(new Date());
            }
        } catch (error) {
            console.error('Error in loadAllData:', error);
            setAllItems([]);
        } finally {
            setLoading(false);
        }
    };

    // Load data once when user changes
    useEffect(() => {
        loadAllData();
    }, [user]);

    // Calculate all stats from the single dataset using useMemo for efficiency
    const stats = useMemo((): ItemStats => {
        const totalCount = allItems.length;
        const totalValue = allItems.reduce((sum, item) => sum + (item.estimatedValue || 0), 0);

        // Count items added in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentCount = allItems.filter(item =>
            new Date(item.dateAdded) > sevenDaysAgo
        ).length;

        // Count unique rooms
        const uniqueRooms = new Set(allItems.map(item => item.room));
        const totalRooms = uniqueRooms.size;

        return { totalCount, totalValue, recentCount, totalRooms };
    }, [allItems]);

    const roomDistribution = useMemo((): RoomDistribution[] => {
        if (allItems.length === 0) return [];

        const roomCounts: { [key: string]: number } = {};
        allItems.forEach(item => {
            roomCounts[item.room] = (roomCounts[item.room] || 0) + 1;
        });

        return Object.entries(roomCounts).map(([room, count]) => ({
            room,
            count,
            percentage: (count / allItems.length) * 100
        }));
    }, [allItems]);

    const categoryDistribution = useMemo((): CategoryDistribution[] => {
        if (allItems.length === 0) return [];

        const categoryCounts: { [key: string]: number } = {};
        allItems.forEach(item => {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        });

        return Object.entries(categoryCounts).map(([category, count]) => ({
            category,
            count,
            percentage: (count / allItems.length) * 100
        }));
    }, [allItems]);

    const recentItems = useMemo(() => {
        return allItems
            .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
            .slice(0, 4); // Take top 4 most recent
    }, [allItems]);

    // Load images only for recent items (small set, safe to fetch)
    const [recentItemsWithImages, setRecentItemsWithImages] = useState<InventoryItem[]>([]);

    useEffect(() => {
        const loadRecentImages = async () => {
            if (!user || recentItems.length === 0) {
                setRecentItemsWithImages([]);
                return;
            }

            if (env.IS_DEVELOPMENT) {
                setRecentItemsWithImages(recentItems); // Use placeholders in dev
                return;
            }

            try {
                const recentIds = recentItems.map(item => item.id);
                const { data, error } = await supabase
                    .from('inventory_items')
                    .select('id, crop_image_data')
                    .in('id', recentIds);

                if (!error && data) {
                    const itemsWithImages = recentItems.map(item => {
                        const imageData = data.find(d => d.id === item.id);
                        return {
                            ...item,
                            imageUrl: imageData?.crop_image_data || PLACEHOLDER_IMAGE
                        };
                    });
                    setRecentItemsWithImages(itemsWithImages);
                } else {
                    setRecentItemsWithImages(recentItems); // Fallback to placeholders
                }
            } catch (error) {
                console.error('Error loading recent item images:', error);
                setRecentItemsWithImages(recentItems); // Fallback to placeholders
            }
        };

        loadRecentImages();
    }, [recentItems, user]);

    const allItemsForMaintenance = useMemo(() => {
        // For maintenance, we don't need images, so return items with placeholders
        return allItems.map(item => ({
            ...item,
            imageUrl: PLACEHOLDER_IMAGE // Use placeholder for maintenance to keep it lightweight
        }));
    }, [allItems]);

    // Refresh function that can be called when data changes
    const refreshStats = async () => {
        await loadAllData();
    };

    return {
        stats,
        roomDistribution,
        categoryDistribution,
        recentItems: recentItemsWithImages, // Return items with actual images
        allItemsForMaintenance,
        loading,
        refreshStats,
        lastRefresh,
        // Expose the raw data for other hooks if needed
        allItems,
    };
}; 