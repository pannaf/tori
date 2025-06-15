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

  // Smart number formatting for all variants
  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}m`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  const stats = [
    {
      label: totalItems === 1 ? 'Total Item' : 'Total Items',
      value: totalItems.toString(),
      icon: Package,
      gradient: 'from-indigo-500 to-purple-600',
      subtitle: variant === 'default' ? `+${recentItems} this week` : undefined,
    },
    {
      label: totalRooms === 1 ? 'Room' : 'Rooms',
      value: totalRooms.toString(),
      icon: Home,
      gradient: 'from-emerald-500 to-teal-600',
      subtitle: variant === 'default' ? 'Across home' : undefined,
    },
    {
      label: 'Total Value',
      value: formatValue(totalValue), // Now uses abbreviated format for all variants
      icon: DollarSign,
      gradient: 'from-purple-500 to-pink-600',
      subtitle: variant === 'default' ? 'Estimated' : undefined,
    },
    {
      label: recentItems === 1 ? 'New Item' : 'New Items',
      value: recentItems > 0 ? `+${recentItems}` : '0',
      icon: TrendingUp,
      gradient: 'from-orange-500 to-red-600',
      subtitle: variant === 'default' ? 'This week' : undefined,
    },
  ];

  if (variant === 'compact') {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="grid grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, gradient }) => (
            <div key={label} className="text-center">
              <div className={`bg-gradient-to-br ${gradient} w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm`}>
                <Icon size={14} className="text-white" />
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-xs font-medium text-gray-700">{label}</p>
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
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:scale-105"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`bg-gradient-to-r ${stat.gradient} p-3 rounded-xl shadow-lg`}>
              <stat.icon className="text-white" size={20} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm font-semibold text-gray-900">{stat.label}</p>
            {stat.subtitle && (
              <p className="text-xs text-gray-500">{stat.subtitle}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};