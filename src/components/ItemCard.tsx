import React from 'react';
import { MoreVertical, MapPin, Tag, DollarSign } from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface ItemCardProps {
  item: InventoryItem;
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (id: string) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onEdit, onDelete }) => {
  const conditionColors = {
    excellent: 'bg-green-100 text-green-800',
    good: 'bg-blue-100 text-blue-800',
    fair: 'bg-yellow-100 text-yellow-800',
    poor: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      {item.imageUrl && (
        <div className="aspect-square bg-gray-100">
          <img
            src={item.imageUrl.startsWith('data:') ? item.imageUrl : `http://localhost:3000${item.imageUrl}`}
            alt={item.name}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">{item.name}</h3>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>

        {item.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
        )}

        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin size={14} />
            <span>{item.room}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Tag size={14} />
            <span>{item.category}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${conditionColors[item.condition]}`}>
            {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
          </span>

          {item.estimatedValue && (
            <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
              <DollarSign size={14} />
              <span>{item.estimatedValue.toFixed(0)}</span>
            </div>
          )}
        </div>

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {item.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};