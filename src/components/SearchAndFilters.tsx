import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Room, Category } from '../types/inventory';

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedRoom: string;
  onRoomChange: (room: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  rooms: Room[];
  categories: Category[];
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedRoom,
  onRoomChange,
  selectedCategory,
  onCategoryChange,
  rooms,
  categories,
}) => {
  const clearFilters = () => {
    onSearchChange('');
    onRoomChange('');
    onCategoryChange('');
  };

  const hasActiveFilters = searchQuery || selectedRoom || selectedCategory;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors shadow-sm"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
          >
            <X size={16} />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select
          value={selectedRoom}
          onChange={(e) => onRoomChange(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-sm appearance-none"
        >
          <option value="">All rooms</option>
          {rooms.map(room => (
            <option key={room.id} value={room.name}>{room.name}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-sm appearance-none"
        >
          <option value="">All categories</option>
          {categories.map(category => (
            <option key={category.id} value={category.name}>{category.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};