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

            // Load all stats data in parallel
            const [statsData, roomData, categoryData, recentData, maintenanceData] = await Promise.all([
                getItemStats(),
                getRoomDistribution(),
                getCategoryDistribution(),
                getRecentItems(),
                getAllItemsForMaintenance()
            ]);

            setStats({
                ...statsData,
                totalRooms: roomData.length
            });
            setRoomDistribution(roomData);
            setCategoryDistribution(categoryData);
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