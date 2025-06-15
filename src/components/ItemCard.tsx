import React from 'react';
import { MapPin, Tag, DollarSign } from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { env } from '../config/env';

interface ItemCardProps {
  item: InventoryItem;
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (id: string) => void;
  onClick?: (item: InventoryItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onEdit, onDelete, onClick }) => {
  const conditionColors = {
    excellent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    good: 'bg-blue-100 text-blue-800 border-blue-200',
    fair: 'bg-amber-100 text-amber-800 border-amber-200',
    poor: 'bg-red-100 text-red-800 border-red-200',
  };

  // Smart number formatting function
  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}m`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
    } else {
      return `${value.toFixed(0)}`;
    }
  };

  const conditionLabels = {
    excellent: 'Great',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  };

  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      onClick={handleClick}
    >
      {item.imageUrl && (
        <div className="relative aspect-square bg-gray-100">
          <img
            src={
              item.imageUrl.startsWith('data:') ? item.imageUrl :
                item.imageUrl.startsWith('http') ? item.imageUrl :
                  `${env.API_URL}${item.imageUrl}`
            }
            alt={item.name}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">{item.name}</h3>
        </div>

        {/* Location and Category stacked vertically */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin size={14} />
            <span>{item.room}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Tag size={14} />
            <span>{item.category}</span>
          </div>
        </div>

        {/* Price and Condition Badge */}
        <div className="flex items-center justify-between">
          {item.estimatedValue && (
            <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
              <DollarSign size={14} />
              <span>{formatValue(item.estimatedValue)}</span>
            </div>
          )}

          {/* Condition pill badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${conditionColors[item.condition]}`}>
            {conditionLabels[item.condition]}
          </div>
        </div>
      </div>
    </div>
  );
};