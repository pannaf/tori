import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Camera, Wrench, Calendar, Clock, Sparkles } from 'lucide-react';
import { Room, Category, InventoryItem } from '../types/inventory';
import { env } from '../config/env';
import { useMaintenanceDB } from '../hooks/useMaintenanceDB';

interface EditItemModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<InventoryItem>) => void;
  rooms: Room[];
  categories: Category[];
  user?: { id: string; email: string } | null;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  rooms,
  categories,
  user,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    room: '',
    description: '',
    condition: '' as '' | 'excellent' | 'good' | 'fair' | 'poor',
    estimatedValue: '',
    tags: '',
  });

  // Maintenance state
  const [showMaintenanceSection, setShowMaintenanceSection] = useState(false);
  const [existingSchedules, setExistingSchedules] = useState<any[]>([]);
  const [newMaintenanceEnabled, setNewMaintenanceEnabled] = useState(false);
  const [newMaintenanceData, setNewMaintenanceData] = useState({
    title: '',
    description: '',
    intervalType: 'months' as 'days' | 'weeks' | 'months' | 'years',
    intervalValue: 6,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  const maintenanceRef = useRef<HTMLDivElement>(null);
  const { createMaintenanceSchedule, getItemMaintenanceSchedules } = useMaintenanceDB(user);

  // Predefined maintenance suggestions by category
  const maintenanceSuggestions: Record<string, { title: string; description: string; intervalType: 'days' | 'weeks' | 'months' | 'years'; intervalValue: number; priority: 'low' | 'medium' | 'high' | 'urgent' }[]> = {
    'Electronics': [
      { title: 'Clean and dust', description: 'Clean dust and check connections', intervalType: 'months', intervalValue: 3, priority: 'medium' },
      { title: 'Software updates', description: 'Update software and security patches', intervalType: 'months', intervalValue: 1, priority: 'medium' },
    ],
    'Appliances': [
      { title: 'Filter replacement', description: 'Replace or clean filters', intervalType: 'months', intervalValue: 3, priority: 'medium' },
      { title: 'Deep clean', description: 'Deep clean and descale', intervalType: 'months', intervalValue: 6, priority: 'medium' },
    ],
    'Furniture': [
      { title: 'Polish and condition', description: 'Polish wood and condition leather', intervalType: 'months', intervalValue: 6, priority: 'low' },
      { title: 'Inspect and tighten', description: 'Check for wear and tighten joints', intervalType: 'years', intervalValue: 1, priority: 'low' },
    ],
    'Kitchenware': [
      { title: 'Deep clean', description: 'Deep clean and sanitize', intervalType: 'weeks', intervalValue: 2, priority: 'medium' },
      { title: 'Sharpen knives', description: 'Sharpen and maintain cutting tools', intervalType: 'months', intervalValue: 3, priority: 'medium' },
    ],
    'Tools': [
      { title: 'Sharpen blades', description: 'Sharpen cutting edges and blades', intervalType: 'months', intervalValue: 6, priority: 'medium' },
      { title: 'Oil and lubricate', description: 'Oil moving parts and check for rust', intervalType: 'months', intervalValue: 3, priority: 'medium' },
    ],
    'Sports & Recreation': [
      { title: 'Equipment check', description: 'Inspect for wear and safety', intervalType: 'months', intervalValue: 3, priority: 'medium' },
      { title: 'Clean and sanitize', description: 'Clean and disinfect equipment', intervalType: 'weeks', intervalValue: 1, priority: 'medium' },
    ],
    'Clothing & Accessories': [
      { title: 'Seasonal storage', description: 'Clean and store seasonal items', intervalType: 'months', intervalValue: 6, priority: 'low' },
      { title: 'Condition check', description: 'Check for repairs needed', intervalType: 'months', intervalValue: 3, priority: 'low' },
    ],
    'Personal Care': [
      { title: 'Expiration check', description: 'Check expiration dates', intervalType: 'months', intervalValue: 3, priority: 'medium' },
      { title: 'Inventory check', description: 'Check stock levels', intervalType: 'months', intervalValue: 1, priority: 'low' },
    ],
    'Collectibles & Mementos': [
      { title: 'Condition check', description: 'Check for damage or deterioration', intervalType: 'months', intervalValue: 6, priority: 'low' },
      { title: 'Climate control', description: 'Check storage conditions', intervalType: 'months', intervalValue: 3, priority: 'medium' },
    ],
  };

  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        name: item.name,
        category: item.category,
        room: item.room,
        description: item.description || '',
        condition: item.condition || '',
        estimatedValue: item.estimatedValue?.toString() || '',
        tags: item.tags.join(', '),
      });

      // Load existing maintenance schedules
      loadExistingSchedules();
    }
  }, [item, isOpen]);

  // Auto-suggest maintenance when category changes
  useEffect(() => {
    if (formData.category && maintenanceSuggestions[formData.category]) {
      const suggestion = maintenanceSuggestions[formData.category][0];
      if (suggestion && !newMaintenanceData.title) {
        setNewMaintenanceData({
          title: suggestion.title,
          description: suggestion.description,
          intervalType: suggestion.intervalType,
          intervalValue: suggestion.intervalValue,
          priority: suggestion.priority,
        });
      }
    }
  }, [formData.category]);

  const loadExistingSchedules = async () => {
    if (!item || !user) return;

    try {
      const schedules = await getItemMaintenanceSchedules(item.id);
      setExistingSchedules(schedules);
    } catch (error) {
      console.error('Error loading maintenance schedules:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const updates = {
      name: formData.name,
      category: formData.category,
      room: formData.room,
      description: formData.description,
      condition: formData.condition || 'good',
      estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    };

    // Create new maintenance schedule if enabled
    if (newMaintenanceEnabled && newMaintenanceData.title && user) {
      try {
        const nextDueDate = new Date();
        switch (newMaintenanceData.intervalType) {
          case 'days':
            nextDueDate.setDate(nextDueDate.getDate() + newMaintenanceData.intervalValue);
            break;
          case 'weeks':
            nextDueDate.setDate(nextDueDate.getDate() + (newMaintenanceData.intervalValue * 7));
            break;
          case 'months':
            nextDueDate.setMonth(nextDueDate.getMonth() + newMaintenanceData.intervalValue);
            break;
          case 'years':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + newMaintenanceData.intervalValue);
            break;
        }

        await createMaintenanceSchedule(item.id, {
          title: newMaintenanceData.title,
          description: newMaintenanceData.description,
          intervalType: newMaintenanceData.intervalType,
          intervalValue: newMaintenanceData.intervalValue,
          nextDueDate: nextDueDate.toISOString().split('T')[0],
          isActive: true,
          priority: newMaintenanceData.priority,
        });
      } catch (error) {
        console.error('Error creating maintenance schedule:', error);
      }
    }

    onSave(item.id, updates);
    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:w-full sm:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl safe-area-inset overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white rounded-t-3xl">
          <h2 className="text-xl font-bold text-gray-900">Edit Item</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {/* Image Preview */}
            {item.imageUrl && (
              <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden">
                <img
                  src={
                    item.imageUrl.startsWith('data:') ? item.imageUrl :
                      item.imageUrl.startsWith('http') ? item.imageUrl :
                        `${env.API_URL}${item.imageUrl}`
                  }
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    className="bg-white text-gray-700 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors"
                  >
                    <Camera size={16} />
                    Change Photo
                  </button>
                </div>
              </div>
            )}

            {/* Item Name */}
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-full focus:border-indigo-500 focus:outline-none transition-colors text-base"
              placeholder="Item Name"
            />

            {/* Category & Room in a row */}
            <div className="grid grid-cols-2 gap-3">
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className={`w-full px-3 py-3 border border-gray-300 rounded-full focus:border-indigo-500 focus:outline-none transition-colors appearance-none bg-white text-base ${!formData.category ? 'text-gray-400' : 'text-gray-900'}`}
              >
                <option value="" disabled className="text-gray-400">Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name} className="text-gray-900">{category.name}</option>
                ))}
              </select>

              <select
                required
                value={formData.room}
                onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                className={`w-full px-3 py-3 border border-gray-300 rounded-full focus:border-indigo-500 focus:outline-none transition-colors appearance-none bg-white text-base ${!formData.room ? 'text-gray-400' : 'text-gray-900'}`}
              >
                <option value="" disabled className="text-gray-400">Location</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.name} className="text-gray-900">{room.name}</option>
                ))}
              </select>
            </div>

            {/* Value & Condition in a row */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={formData.estimatedValue}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: e.target.value }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-full focus:border-indigo-500 focus:outline-none transition-colors text-base"
                placeholder="Estimated Value"
                step="0.01"
                min="0"
              />

              <select
                value={formData.condition}
                onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as any }))}
                className={`w-full px-3 py-3 border border-gray-300 rounded-full focus:border-indigo-500 focus:outline-none transition-colors appearance-none text-base ${!formData.condition ? 'text-gray-400' : 'text-gray-900'} bg-white`}
              >
                <option value="" disabled className="text-gray-400">Condition</option>
                <option value="excellent" className="text-gray-900">Excellent</option>
                <option value="good" className="text-gray-900">Good</option>
                <option value="fair" className="text-gray-900">Fair</option>
                <option value="poor" className="text-gray-900">Poor</option>
              </select>
            </div>

            {/* Tags */}
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-full focus:border-indigo-500 focus:outline-none transition-colors text-base"
              placeholder="Tags (vintage, gift, favorite...)"
            />

            {/* Description - Optional, collapsible */}
            <details className="group">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                Add description (optional)
              </summary>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full mt-2 px-3 py-3 border border-gray-300 rounded-2xl focus:border-indigo-500 focus:outline-none transition-colors resize-none text-base"
                rows={2}
                placeholder="Description (optional)"
              />
            </details>

            {/* Maintenance Section - Smooth Toggle */}
            <div ref={maintenanceRef} className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <Wrench size={16} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Maintenance Care</h4>
                    <p className="text-xs text-gray-600">
                      {existingSchedules.length > 0
                        ? `${existingSchedules.length} active schedule${existingSchedules.length > 1 ? 's' : ''}`
                        : 'Keep it in perfect condition'
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowMaintenanceSection(!showMaintenanceSection);
                    // Scroll to show bottom of maintenance section when enabled
                    if (!showMaintenanceSection) {
                      setTimeout(() => {
                        maintenanceRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'end'
                        });
                      }, 600); // Wait for expand animation to complete
                    }
                  }}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500/20 ${showMaintenanceSection
                    ? 'bg-gradient-to-r from-orange-500 to-red-500'
                    : 'bg-gray-300'
                    }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${showMaintenanceSection ? 'left-6' : 'left-0.5'
                    }`} />
                </button>
              </div>

              {/* Maintenance Fields - Smooth Expand */}
              <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showMaintenanceSection
                ? 'max-h-[800px] opacity-100'
                : 'max-h-0 opacity-0'
                }`}>
                <div className="space-y-3 pt-1">
                  {/* Existing Schedules */}
                  {existingSchedules.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Clock size={12} className="text-orange-500" />
                        Current Schedules
                      </p>
                      {existingSchedules.map((schedule) => (
                        <div key={schedule.id} className="p-3 bg-white/70 border border-orange-200 rounded-xl backdrop-blur-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-orange-900 text-sm">{schedule.title}</p>
                              <p className="text-xs text-orange-700">
                                Every {schedule.intervalValue} {schedule.intervalType} • {schedule.priority} priority
                              </p>
                              <p className="text-xs text-orange-600">
                                Next due: {new Date(schedule.nextDueDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center">
                              <Clock size={12} className="text-white" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Suggestions */}
                  {formData.category && maintenanceSuggestions[formData.category] && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700 flex items-center gap-1 mt-2">
                        <Sparkles size={12} className="text-orange-500" />
                        Suggested for {formData.category}
                      </p>
                      <div className="flex flex-wrap gap-2 pl-2">
                        {maintenanceSuggestions[formData.category].map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setNewMaintenanceData(suggestion)}
                            className="text-xs px-3 py-1.5 bg-white border border-orange-200 rounded-full hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 hover:scale-105 flex items-center gap-1 max-w-full flex-shrink min-w-0"
                          >
                            <Clock size={10} className="text-orange-500 flex-shrink-0" />
                            <span className="truncate">{suggestion.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Maintenance Toggle */}
                  <div className="flex items-center justify-between p-3 bg-white/70 rounded-xl border border-orange-200 backdrop-blur-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Calendar className="text-orange-600 flex-shrink-0" size={16} />
                      <div className="min-w-0">
                        <p className="font-semibold text-orange-900 text-sm">Add New Schedule</p>
                        <p className="text-xs text-orange-600">Create maintenance reminder</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewMaintenanceEnabled(!newMaintenanceEnabled);
                        // Scroll to show bottom of maintenance section when enabled
                        if (!newMaintenanceEnabled) {
                          setTimeout(() => {
                            maintenanceRef.current?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'end'
                            });
                          }, 600); // Wait for expand animation to complete
                        }
                      }}
                      className={`relative w-10 h-5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 flex-shrink-0 ml-2 ${newMaintenanceEnabled ? 'bg-orange-500' : 'bg-gray-300'
                        }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${newMaintenanceEnabled ? 'left-5' : 'left-0.5'
                        }`} />
                    </button>
                  </div>

                  {/* New Maintenance Form */}
                  {newMaintenanceEnabled && (
                    <div className="space-y-3 pt-1">
                      {/* Maintenance Title */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Task Name
                        </label>
                        <input
                          type="text"
                          value={newMaintenanceData.title}
                          onChange={(e) => setNewMaintenanceData({ ...newMaintenanceData, title: e.target.value })}
                          className="w-full px-3 py-2.5 border border-orange-200 rounded-full focus:border-orange-500 focus:outline-none transition-colors text-base bg-white/70 backdrop-blur-sm"
                          placeholder="Clean and dust, Oil change, Filter replacement..."
                        />
                      </div>

                      {/* Interval */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Repeat Every
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={newMaintenanceData.intervalValue}
                            onChange={(e) => setNewMaintenanceData({ ...newMaintenanceData, intervalValue: parseInt(e.target.value) || 1 })}
                            className="px-3 py-2.5 border border-orange-200 rounded-full focus:border-orange-500 focus:outline-none transition-colors text-base bg-white/70 backdrop-blur-sm"
                            min="1"
                            placeholder="How many?"
                          />
                          <select
                            value={newMaintenanceData.intervalType}
                            onChange={(e) => setNewMaintenanceData({ ...newMaintenanceData, intervalType: e.target.value as any })}
                            className="px-3 py-2.5 border border-orange-200 rounded-full focus:border-orange-500 focus:outline-none transition-colors text-base bg-white/70 backdrop-blur-sm appearance-none"
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                            <option value="years">Years</option>
                          </select>
                        </div>
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Priority Level
                        </label>
                        <div className="flex gap-2">
                          {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                            <button
                              key={priority}
                              type="button"
                              onClick={() => setNewMaintenanceData({ ...newMaintenanceData, priority })}
                              className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all duration-200 border ${newMaintenanceData.priority === priority
                                ? priority === 'low' ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/25' :
                                  priority === 'medium' ? 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/25' :
                                    priority === 'high' ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25' :
                                      'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25'
                                : 'bg-white/70 text-gray-600 border-orange-200 hover:border-orange-300 hover:bg-white'
                                }`}
                            >
                              {priority.charAt(0).toUpperCase() + priority.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Instructions (Optional)
                        </label>
                        <textarea
                          value={newMaintenanceData.description}
                          onChange={(e) => setNewMaintenanceData({ ...newMaintenanceData, description: e.target.value })}
                          className="w-full px-3 py-2.5 border border-orange-200 rounded-2xl focus:border-orange-500 focus:outline-none transition-colors text-base bg-white/70 backdrop-blur-sm resize-none"
                          rows={2}
                          placeholder="Any specific steps or notes for this maintenance task..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Bottom Actions */}
        <div className="p-4 border-t border-gray-100 bg-white rounded-b-3xl">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-full font-bold transition-all duration-300 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};