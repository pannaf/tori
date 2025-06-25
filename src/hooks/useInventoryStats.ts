import { useState, useEffect } from 'react';
import { useInventory } from './useInventory';

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
    const { getItemStats, getRoomDistribution, getCategoryDistribution, getRecentItems, getAllItemsForMaintenance } = useInventory(user);

    const [stats, setStats] = useState<ItemStats>({ totalCount: 0, totalValue: 0, recentCount: 0, totalRooms: 0 });
    const [roomDistribution, setRoomDistribution] = useState<RoomDistribution[]>([]);
    const [categoryDistribution, setCategoryDistribution] = useState<CategoryDistribution[]>([]);
    const [recentItems, setRecentItems] = useState<any[]>([]);
    const [allItemsForMaintenance, setAllItemsForMaintenance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setStats({ totalCount: 0, totalValue: 0, recentCount: 0, totalRooms: 0 });
            setRoomDistribution([]);
            setCategoryDistribution([]);
            setRecentItems([]);
            setAllItemsForMaintenance([]);
            setLoading(false);
            return;
        }

        loadStats();
    }, [user]);

    const loadStats = async () => {
        try {
            setLoading(true);

            // Stagger requests to avoid rate limiting - load essential data first
            const statsData = await getItemStats();
            setStats({
                ...statsData,
                totalRooms: 0 // Will update when room data loads
            });

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

            // Load room and category data with slight delay
            const [roomData, categoryData] = await Promise.all([
                getRoomDistribution(),
                getCategoryDistribution()
            ]);

            setStats(prev => ({
                ...prev,
                totalRooms: roomData.length
            }));
            setRoomDistribution(roomData);
            setCategoryDistribution(categoryData);

            // Another small delay
            await new Promise(resolve => setTimeout(resolve, 100));

            // Load remaining data
            const [recentData, maintenanceData] = await Promise.all([
                getRecentItems(),
                getAllItemsForMaintenance()
            ]);

            setRecentItems(recentData);
            setAllItemsForMaintenance(maintenanceData);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return {
        stats,
        roomDistribution,
        categoryDistribution,
        recentItems,
        allItemsForMaintenance,
        loading,
        refreshStats: loadStats,
    };
}; 