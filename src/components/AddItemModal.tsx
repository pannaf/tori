import React, { useState, useEffect } from 'react';
import { X, Camera, Plus, Sparkles, Check, Zap } from 'lucide-react';
import { Room, Category, InventoryItem } from '../types/inventory';
import { CameraCapture } from './CameraCapture';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<InventoryItem, 'id' | 'dateAdded'>) => void;
  rooms: Room[];
  categories: Category[];
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  rooms,
  categories,
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [aiDetected, setAiDetected] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    room: '',
    description: '',
    condition: 'good' as const,
    estimatedValue: '',
    tags: '',
    imageUrl: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        category: '',
        room: '',
        description: '',
        condition: 'good',
        estimatedValue: '',
        tags: '',
        imageUrl: '',
      });
      setShowCamera(false);
      setAiDetected(false);
    }
  }, [isOpen]);

  const handleCameraCapture = (imageData: string, recognitionData: any) => {
    // Auto-fill form with AI detection results
    setFormData(prev => ({
      ...prev,
      imageUrl: imageData,
      room: recognitionData.room,
      name: recognitionData.suggestedName || recognitionData.objects[0]?.name || '',
      category: recognitionData.suggestedCategory || recognitionData.objects[0]?.category || '',
      description: recognitionData.objects.length > 1 
        ? `Detected: ${recognitionData.objects.map((obj: any) => obj.name).join(', ')}`
        : `AI detected: ${recognitionData.objects[0]?.name || 'Unknown item'}`,
    }));
    setShowCamera(false);
    setAiDetected(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newItem = {
      ...formData,
      estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    };

    onAdd(newItem);
    onClose();
  };

  if (!isOpen) return null;

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Add to Your Collection</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formData.imageUrl && (
            <div className="relative">
              <img
                src={formData.imageUrl}
                alt="Captured item"
                className="w-full h-32 object-cover rounded-xl"
              />
              {aiDetected && (
                <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                  <Check size={12} />
                  AI Detected!
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, imageUrl: '' }));
                  setAiDetected(false);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Camera size={20} />
            {formData.imageUrl ? 'Retake Photo' : 'Take Photo & Auto-Detect'}
            <Sparkles size={16} className="text-yellow-300" />
          </button>

          {aiDetected && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <Zap size={16} />
                <span className="font-medium">Tori's AI Detection Results:</span>
              </div>
              <p className="text-green-600 text-sm">
                Automatically filled in the details below! Feel free to edit anything that doesn't look right.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What is it? *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                aiDetected ? 'border-green-300 bg-green-50' : 'border-gray-300'
              }`}
              placeholder="e.g., MacBook Pro, Coffee Mug, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Which room? *
              </label>
              <select
                required
                value={formData.room}
                onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  aiDetected ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
              >
                <option value="">Pick a room</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.name}>{room.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  aiDetected ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
              >
                <option value="">What type?</option>
                {categories.map(category => (
                  <option key={category.id} value={category.name}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tell me more about it
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                aiDetected ? 'border-green-300 bg-green-50' : 'border-gray-300'
              }`}
              rows={3}
              placeholder="Any details you want to remember..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as any }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              >
                <option value="excellent">Like new ✨</option>
                <option value="good">Pretty good 👍</option>
                <option value="fair">Okay 👌</option>
                <option value="poor">Seen better days 😅</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Worth about ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.estimatedValue}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (separate with commas)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              placeholder="work, expensive, gift, vintage..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add to Tori
          </button>
        </form>
      </div>
    </div>
  );
};