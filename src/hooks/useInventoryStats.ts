import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { InventoryItem } from '../types/inventory';
import { env } from '../config/env';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Placeholder images for different states
const LOADING_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+CiAgPCEtLSBCYWNrZ3JvdW5kIC0tPgogIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjhmYWZjIi8+CiAgCiAgPCEtLSBNYWluIGltYWdlIHBsYWNlaG9sZGVyIC0tPgogIDxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSI3NSIgcng9IjEyIiBmaWxsPSIjZTJlOGYwIiBzdHJva2U9IiNjYmQ1ZTEiIHN0cm9rZS13aWR0aD0iMiIvPgogIAogIDwhLS0gSW1hZ2UgaWNvbiAtLT4KICA8Y2lyY2xlIGN4PSI3NSIgY3k9IjgwIiByPSI4IiBmaWxsPSIjOTRhM2I4Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSI5MCw5NSAxMTAsNzUgMTMwLDg1IDE0MCw3NSAxNDAsMTA1IDkwLDEwNSIgZmlsbD0iIzk0YTNiOCIvPgogIAogIDwhLS0gQW5pbWF0ZWQgc2hpbW1lciBlZmZlY3QgLS0+CiAgPHJlY3QgeD0iNTAiIHk9IjUwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9Ijc1IiByeD0iMTIiIGZpbGw9InVybCgjc2hpbW1lcikiIG9wYWNpdHk9IjAuNyI+CiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJvcGFjaXR5IiB2YWx1ZXM9IjAuMzswLjg7MC4zIiBkdXI9IjEuNXMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIi8+CiAgPC9yZWN0PgogIAogIDwhLS0gR3JhZGllbnQgZGVmaW5pdGlvbiAtLT4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ic2hpbW1lciIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjFmNWY5O3N0b3Atb3BhY2l0eTowIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZTJlOGYwO3N0b3Atb3BhY2l0eToxIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6I2YxZjVmOTtzdG9wLW9wYWNpdHk6MCIvPgogICAgICA8YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPSJncmFkaWVudFRyYW5zZm9ybSIgdHlwZT0idHJhbnNsYXRlIiB2YWx1ZXM9Ii0yMDAgMDsyMDAgMDstMjAwIDAiIGR1cj0iMnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICAKICA8IS0tIExvYWRpbmcgdGV4dCAtLT4KICA8dGV4dCB4PSIxMDAiIHk9IjE2MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY0NzQ4YiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iNTAwIj5Mb2FkaW5nIGltYWdlLi4uPC90ZXh0Pgo8L3N2Zz4K';

const NO_IMAGE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmM2Y0ZjYiLz4KICA8cmVjdCB4PSI2MCIgeT0iNjAiIHdpZHRoPSI4MCIgaGVpZ2h0PSI2MCIgcng9IjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2QxZDVkYiIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgPGxpbmUgeDE9Ijc1IiB5MT0iNzUiIHgyPSIxMjUiIHkyPSIxMDUiIHN0cm9rZT0iI2QxZDVkYiIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPGNpcmNsZSBjeD0iODUiIGN5PSI4NSIgcj0iNCIgZmlsbD0iI2QxZDVkYiIvPgogIDx0ZXh0IHg9IjEwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4=';

// For backwards compatibility, use loading image as default
const PLACEHOLDER_IMAGE = LOADING_IMAGE;

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
                    imageUrl: LOADING_IMAGE, // Use loading placeholder - images loaded separately when needed
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

        // Count unique rooms, excluding "Uncategorized" from actual room count
        const uniqueRooms = new Set(allItems
            .map(item => item.room && item.room.trim() ? item.room : null)
            .filter(room => room !== null)
        );
        const totalRooms = uniqueRooms.size;

        return { totalCount, totalValue, recentCount, totalRooms };
    }, [allItems]);

    const roomDistribution = useMemo((): RoomDistribution[] => {
        if (allItems.length === 0) return [];

        const roomCounts: { [key: string]: number } = {};
        allItems.forEach(item => {
            // Handle empty, null, or undefined room values as "Uncategorized"
            const room = item.room && item.room.trim() ? item.room : 'Uncategorized';
            roomCounts[room] = (roomCounts[room] || 0) + 1;
        });

        return Object.entries(roomCounts)
            .map(([room, count]) => ({
                room,
                count,
                percentage: (count / allItems.length) * 100
            }))
            .sort((a, b) => {
                // Always put "Uncategorized" at the bottom
                if (a.room === 'Uncategorized') return 1;
                if (b.room === 'Uncategorized') return -1;
                // Sort others alphabetically
                return a.room.localeCompare(b.room);
            });
    }, [allItems]);

    const categoryDistribution = useMemo((): CategoryDistribution[] => {
        if (allItems.length === 0) return [];

        const categoryCounts: { [key: string]: number } = {};
        allItems.forEach(item => {
            // Handle empty, null, or undefined category values as "Uncategorized"
            const category = item.category && item.category.trim() ? item.category : 'Uncategorized';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });

        return Object.entries(categoryCounts)
            .map(([category, count]) => ({
                category,
                count,
                percentage: (count / allItems.length) * 100
            }))
            .sort((a, b) => {
                // Always put "Uncategorized" at the bottom
                if (a.category === 'Uncategorized') return 1;
                if (b.category === 'Uncategorized') return -1;
                // Sort others alphabetically
                return a.category.localeCompare(b.category);
            });
    }, [allItems]);

    const recentItems = useMemo(() => {
        return allItems
            .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
            .slice(0, 4); // Take top 4 most recent
    }, [allItems]);

    // Optimistic loading for recent items - show immediately, load images progressively
    const [recentItemsWithImages, setRecentItemsWithImages] = useState<InventoryItem[]>([]);

    useEffect(() => {
        // Show items immediately with placeholders for instant UI
        setRecentItemsWithImages(recentItems);

        // Load images progressively in background
        const loadRecentImagesProgressively = async () => {
            if (!user || recentItems.length === 0) {
                return;
            }

            if (env.IS_DEVELOPMENT) {
                return; // Use placeholders in dev
            }

            // Load images one by one to avoid blocking
            for (const item of recentItems) {
                try {
                    const { data, error } = await supabase
                        .from('inventory_items')
                        .select('id, crop_image_data')
                        .eq('id', item.id)
                        .single();

                    if (!error && data?.crop_image_data) {
                        // Update with actual image
                        setRecentItemsWithImages(current =>
                            current.map(currentItem =>
                                currentItem.id === item.id
                                    ? { ...currentItem, imageUrl: data.crop_image_data }
                                    : currentItem
                            )
                        );
                    } else {
                        // No image available - update to "No Image" placeholder
                        setRecentItemsWithImages(current =>
                            current.map(currentItem =>
                                currentItem.id === item.id
                                    ? { ...currentItem, imageUrl: NO_IMAGE_PLACEHOLDER }
                                    : currentItem
                            )
                        );
                    }
                } catch (error) {
                    console.error('Error loading image for recent item:', item.id, error);
                    // Update to "No Image" placeholder on error
                    setRecentItemsWithImages(current =>
                        current.map(currentItem =>
                            currentItem.id === item.id
                                ? { ...currentItem, imageUrl: NO_IMAGE_PLACEHOLDER }
                                : currentItem
                        )
                    );
                }
            }
        };

        loadRecentImagesProgressively();
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