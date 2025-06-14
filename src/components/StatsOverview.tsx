import React from 'react';
import { TrendingUp, Package, Home, DollarSign } from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface StatsOverviewProps {
  items: InventoryItem[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ items }) => {
  const totalItems = items.length;
  const totalRooms = new Set(items.map(item => item.room)).size;
  const totalValue = items.reduce((sum, item) => sum + (item.estimatedValue || 0), 0);
  const recentItems = items.filter(item => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(item.dateAdded) > weekAgo;
  }).length;

  const stats = [
    {
      label: 'Total Items',
      value: totalItems.toString(),
      icon: Package,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      change: `+${recentItems} this week`,
    },
    {
      label: 'Rooms',
      value: totalRooms.toString(),
      icon: Home,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      change: 'Across home',
    },
    {
      label: 'Total Value',
      value: `$${totalValue.toFixed(0)}`,
      icon: DollarSign,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      change: 'Estimated',
    },
    {
      label: 'Growth',
      value: recentItems > 0 ? `+${recentItems}` : '0',
      icon: TrendingUp,
      color: 'bg-gradient-to-r from-pink-500 to-pink-600',
      change: 'This week',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`${stat.color} p-2 rounded-lg`}>
              <stat.icon className="text-white" size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm font-medium text-gray-900">{stat.label}</p>
            <p className="text-xs text-gray-500">{stat.change}</p>
          </div>
        </div>
      ))}
    </div>
  );
};