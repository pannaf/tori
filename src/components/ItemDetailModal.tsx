import React from 'react';
import { X, MapPin, Tag, DollarSign, Calendar, Edit3, Trash2, Share } from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface ItemDetailModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (id: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !item) return null;

  const conditionColors = {
    excellent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    good: 'bg-blue-100 text-blue-800 border-blue-200',
    fair: 'bg-amber-100 text-amber-800 border-amber-200',
    poor: 'bg-red-100 text-red-800 border-red-200',
  };

  const conditionEmojis = {
    excellent: '✨',
    good: '👍',
    fair: '👌',
    poor: '😅',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(item);
    }
    onClose();
  };

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this item?')) {
      onDelete(item.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="relative">
          {item.imageUrl && (
            <div className="aspect-square bg-gray-100 rounded-t-3xl overflow-hidden">
              <img
                src={item.imageUrl.startsWith('data:') ? item.imageUrl : `http://localhost:3000${item.imageUrl}`}
                alt={item.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          
          {/* Close button overlay */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white bg-opacity-90 backdrop-blur-sm text-gray-600 hover:text-gray-800 rounded-full p-2 transition-colors shadow-lg"
          >
            <X size={20} />
          </button>

          {/* Condition badge overlay */}
          <div className={`absolute top-4 left-4 px-3 py-2 rounded-xl text-sm font-semibold border ${conditionColors[item.condition]} backdrop-blur-sm`}>
            <span className="mr-1">{conditionEmojis[item.condition]}</span>
            {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title and Value */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.name}</h1>
            {item.estimatedValue && (
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl px-4 py-2">
                <DollarSign size={18} className="text-emerald-600" />
                <span className="text-xl font-bold text-emerald-700">${item.estimatedValue.toFixed(0)}</span>
              </div>
            )}
          </div>

          {/* Location and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 text-center">
              <MapPin className="mx-auto mb-2 text-indigo-600" size={20} />
              <p className="text-sm font-semibold text-indigo-700">Location</p>
              <p className="text-indigo-900 font-bold">{item.room}</p>
            </div>
            
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-4 text-center">
              <Tag className="mx-auto mb-2 text-violet-600" size={20} />
              <p className="text-sm font-semibold text-violet-700">Category</p>
              <p className="text-violet-900 font-bold">{item.category}</p>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-900 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-sm rounded-full font-medium border border-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Date Added */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-slate-600" size={20} />
              <div>
                <p className="text-sm font-semibold text-slate-700">Added to inventory</p>
                <p className="text-slate-900 font-bold">{formatDate(item.dateAdded)}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              onClick={handleEdit}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-2xl font-semibold hover:shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105"
            >
              <Edit3 size={16} />
              Edit
            </button>
            
            <button
              onClick={() => {
                // Share functionality - could copy to clipboard or open share dialog
                if (navigator.share) {
                  navigator.share({
                    title: item.name,
                    text: `Check out my ${item.name} in my home inventory!`,
                  });
                } else {
                  // Fallback - copy to clipboard
                  navigator.clipboard.writeText(`${item.name} - ${item.room} - $${item.estimatedValue || 0}`);
                }
              }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-2xl font-semibold hover:shadow-xl hover:shadow-emerald-500/25 transition-all duration-300 hover:scale-105"
            >
              <Share size={16} />
              Share
            </button>
            
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 rounded-2xl font-semibold hover:shadow-xl hover:shadow-red-500/25 transition-all duration-300 hover:scale-105"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};