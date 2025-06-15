import React from 'react';
import { MapPin, Tag, DollarSign } from 'lucide-react';
import { InventoryItem } from '../types/inventory';

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
            src={item.imageUrl.startsWith('data:') ? item.imageUrl : `http://localhost:3000${item.imageUrl}`}
            alt={item.name}
            className="w-full h-full object-contain"
          />
          {/* Condition badge with white border */}
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-semibold border-2 border-white ${conditionColors[item.condition]}`}>
            {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
          </div>
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

        {/* Price */}
        {item.estimatedValue && (
          <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
            <DollarSign size={14} />
            <span>{item.estimatedValue.toFixed(0)}</span>
          </div>
        )}
      </div>
    </div>
  );
};