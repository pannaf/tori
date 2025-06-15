import React from 'react';
import { TrendingUp, Package, Home, DollarSign } from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface StatsOverviewProps {
  items: InventoryItem[];
  variant?: 'default' | 'compact';
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ items, variant = 'default' }) => {
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
      gradient: 'from-indigo-500 to-purple-600',
      change: `+${recentItems} this week`,
    },
    {
      label: 'Rooms',
      value: totalRooms.toString(),
      icon: Home,
      gradient: 'from-emerald-500 to-teal-600',
      change: 'Across home',
    },
    {
      label: 'Total Value',
      value: `$${totalValue.toFixed(0)}`,
      icon: DollarSign,
      gradient: 'from-purple-500 to-pink-600',
      change: 'Estimated',
    },
    {
      label: 'Growth',
      value: recentItems > 0 ? `+${recentItems}` : '0',
      icon: TrendingUp,
      gradient: 'from-orange-500 to-red-600',
      change: 'This week',
    },
  ];

  if (variant === 'compact') {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-4 gap-6">
          {stats.map(({ label, value, icon: Icon, gradient, change }) => (
            <div key={label} className="text-center">
              <div className={`bg-gradient-to-br ${gradient} w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                <Icon size={20} className="text-white" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm font-semibold text-gray-700">{label}</p>
                <p className="text-xs text-gray-500">{change}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:scale-105"
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`bg-gradient-to-r ${stat.gradient} p-3 rounded-xl shadow-lg`}>
              <stat.icon className="text-white" size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm font-semibold text-gray-900">{stat.label}</p>
            <p className="text-xs text-gray-500">{stat.change}</p>
          </div>
        </div>
      ))}
    </div>
  );
};