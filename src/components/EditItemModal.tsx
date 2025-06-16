import React, { useState, useEffect } from 'react';
import { X, Save, Camera, Wrench, Calendar, Clock } from 'lucide-react';
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
    condition: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
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
    'Tools': [
      { title: 'Sharpen blades', description: 'Sharpen cutting edges and blades', intervalType: 'months', intervalValue: 6, priority: 'medium' },
      { title: 'Oil and lubricate', description: 'Oil moving parts and check for rust', intervalType: 'months', intervalValue: 3, priority: 'medium' },
    ],
    'Vehicles': [
      { title: 'Oil change', description: 'Change engine oil and filter', intervalType: 'months', intervalValue: 6, priority: 'high' },
      { title: 'Tire inspection', description: 'Check tire pressure and tread depth', intervalType: 'months', intervalValue: 3, priority: 'medium' },
    ],
  };

  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        name: item.name,
        category: item.category,
        room: item.room,
        description: item.description || '',
        condition: item.condition,
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
      condition: formData.condition,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Edit Item</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Where is it? *
            </label>
            <select
              required
              value={formData.room}
              onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
              className="w-full px-6 py-4 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none bg-white"
            >
              <option value="">Select a room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.name}>{room.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              What is it? *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-6 py-4 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              placeholder="e.g., MacBook Pro, Coffee Mug, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Category *
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-6 py-4 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none bg-white"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Tell me more about it
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-6 py-4 border border-gray-300 rounded-3xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
              rows={3}
              placeholder="Any details you want to remember..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as any }))}
                className="w-full px-4 py-4 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none bg-white"
              >
                <option value="excellent">Great</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Worth about ($)
              </label>
              <input
                type="number"
                value={formData.estimatedValue}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: e.target.value }))}
                className="w-full px-4 py-4 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-6 py-4 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              placeholder="vintage, gift, favorite (comma separated)"
            />
          </div>

          {/* Maintenance Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
                  <Wrench className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Maintenance Schedule</h3>
                  <p className="text-sm text-gray-600">
                    {existingSchedules.length > 0
                      ? `${existingSchedules.length} active schedule${existingSchedules.length > 1 ? 's' : ''}`
                      : 'Keep this item in perfect condition'
                    }
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMaintenanceSection(!showMaintenanceSection)}
                className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
              >
                {showMaintenanceSection ? 'Hide' : existingSchedules.length > 0 ? 'Manage' : 'Add'}
              </button>
            </div>

            {showMaintenanceSection && (
              <div className="space-y-4">
                {/* Existing Schedules */}
                {existingSchedules.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Maintenance Schedules</h4>
                    <div className="space-y-2">
                      {existingSchedules.map((schedule) => (
                        <div key={schedule.id} className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-blue-900">{schedule.title}</p>
                              <p className="text-sm text-blue-700">
                                Every {schedule.intervalValue} {schedule.intervalType} • {schedule.priority} priority
                              </p>
                              <p className="text-xs text-blue-600">
                                Next due: {new Date(schedule.nextDueDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                              <Wrench size={12} className="text-white" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Maintenance */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Calendar className="text-indigo-600 flex-shrink-0" size={20} />
                      <div className="min-w-0">
                        <p className="font-semibold text-indigo-900 text-sm">Add New Maintenance Schedule</p>
                        <p className="text-xs text-indigo-600">Create additional maintenance reminders</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewMaintenanceEnabled(!newMaintenanceEnabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ml-3 ${newMaintenanceEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${newMaintenanceEnabled ? 'translate-x-5' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>

                  {newMaintenanceEnabled && (
                    <div className="mt-4 space-y-4">
                      {/* Quick Suggestions */}
                      {formData.category && maintenanceSuggestions[formData.category] && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Quick Suggestions for {formData.category}
                          </label>
                          <div className="grid grid-cols-1 gap-2">
                            {maintenanceSuggestions[formData.category].map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setNewMaintenanceData(suggestion)}
                                className="text-left p-3 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                              >
                                <div className="font-semibold text-gray-900">{suggestion.title}</div>
                                <div className="text-sm text-gray-600">{suggestion.description}</div>
                                <div className="text-xs text-indigo-600 mt-1">
                                  Every {suggestion.intervalValue} {suggestion.intervalType}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom Maintenance */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Maintenance Task
                        </label>
                        <input
                          type="text"
                          value={newMaintenanceData.title}
                          onChange={(e) => setNewMaintenanceData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                          placeholder="e.g., Clean and dust, Oil change, Filter replacement"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Description
                        </label>
                        <textarea
                          value={newMaintenanceData.description}
                          onChange={(e) => setNewMaintenanceData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
                          rows={2}
                          placeholder="What needs to be done?"
                        />
                      </div>

                      {/* Mobile-friendly stacked layout */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Repeat Every
                          </label>
                          <div className="flex gap-3">
                            <input
                              type="number"
                              min="1"
                              value={newMaintenanceData.intervalValue}
                              onChange={(e) => setNewMaintenanceData(prev => ({ ...prev, intervalValue: parseInt(e.target.value) || 1 }))}
                              className="w-20 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-center"
                            />
                            <select
                              value={newMaintenanceData.intervalType}
                              onChange={(e) => setNewMaintenanceData(prev => ({ ...prev, intervalType: e.target.value as any }))}
                              className="flex-1 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none bg-white"
                            >
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                              <option value="months">Months</option>
                              <option value="years">Years</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Priority
                          </label>
                          <select
                            value={newMaintenanceData.priority}
                            onChange={(e) => setNewMaintenanceData(prev => ({ ...prev, priority: e.target.value as any }))}
                            className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none bg-white"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>

                      {/* Preview */}
                      {newMaintenanceData.title && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="text-green-600" size={16} />
                            <span className="font-semibold text-green-900">New Maintenance Preview</span>
                          </div>
                          <p className="text-sm text-green-800">
                            <strong>{newMaintenanceData.title}</strong> will be scheduled every{' '}
                            <strong>{newMaintenanceData.intervalValue} {newMaintenanceData.intervalType}</strong>{' '}
                            with <strong>{newMaintenanceData.priority}</strong> priority.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-full font-bold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-full font-bold hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};