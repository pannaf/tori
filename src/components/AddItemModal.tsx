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

interface LandingAiObject {
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface DetectedObject {
  name: string;
  category: string;
  estimatedValue?: number;
  landingAiObjects?: LandingAiObject[];
  imageUrl?: string;
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
  const [detectedRoom, setDetectedRoom] = useState('');
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [currentObjectIndex, setCurrentObjectIndex] = useState(0);
  const [isProcessingLandingAi, setIsProcessingLandingAi] = useState(false);
  const [imageData, setImageData] = useState('');
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
      setDetectedObjects([]);
      setCurrentObjectIndex(0);
      setDetectedRoom('');
      setIsProcessingLandingAi(false);
    }
  }, [isOpen]);

  const processWithLandingAi = async (imageData: string, objectName: string): Promise<any> => {
    try {
      // Create form data for the Landing AI API
      const formData = new FormData();
      // Convert base64 to blob
      const base64Data = imageData.split(',')[1];
      const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());
      formData.append('image', blob);
      formData.append('object_name', objectName);

      const response = await fetch('http://localhost:3000/api/detect-object', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process with Landing AI');
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing with Landing AI:', error);
      return null;
    }
  };

  const handleCameraCapture = async (capturedImageData: string, recognitionData: any) => {
    setImageData(capturedImageData); // Store the original image data
    // Auto-fill form with AI detection results
    const objects = recognitionData.objects.map((obj: {
      name: string;
      category: string;
      description: string;
      estimated_cost_usd: number;
      imageUrl?: string;
    }) => ({
      name: obj.name,
      category: obj.category,
      description: obj.description,
      estimatedValue: obj.estimated_cost_usd,
      imageUrl: obj.imageUrl
    }));

    // Take only the first 3 objects
    const firstThreeObjects = objects.slice(0, 3);

    // Normalize room name to match our data model (e.g., "living room" -> "Living Room")
    const normalizedRoom = recognitionData.room.split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    setDetectedObjects(firstThreeObjects);
    setDetectedRoom(normalizedRoom);
    setFormData(prev => ({
      ...prev,
      imageUrl: firstThreeObjects[0]?.imageUrl || capturedImageData,
      room: normalizedRoom,
      name: firstThreeObjects[0]?.name || '',
      category: firstThreeObjects[0]?.category || '',
      description: firstThreeObjects[0]?.description || '',
      estimatedValue: firstThreeObjects[0]?.estimatedValue?.toString() || '',
      tags: `detected, ${firstThreeObjects[0]?.category?.toLowerCase() || ''}`
    }));
    setShowCamera(false);
    setAiDetected(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const currentObject = detectedObjects[currentObjectIndex];
    const newItem = {
      ...formData,
      // Use the cropped image URL from the current object if available
      imageUrl: currentObject?.imageUrl || formData.imageUrl,
      estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      // Add any Landing AI detection results as tags
      ...(currentObject?.landingAiObjects?.length && {
        tags: [
          ...formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          ...currentObject.landingAiObjects.map((obj: LandingAiObject) => `detected:${obj.label}`)
        ]
      })
    };

    onAdd(newItem);

    // If there are more objects to add, prepare the form for the next one
    if (currentObjectIndex < Math.min(detectedObjects.length - 1, 2)) { // Only process up to 3 objects
      const nextObject = detectedObjects[currentObjectIndex + 1];
      setCurrentObjectIndex(prev => prev + 1);
      setFormData(prev => ({
        ...prev,
        // Use the cropped image URL for the next object
        imageUrl: nextObject.imageUrl || imageData,
        name: nextObject.name || '',
        category: nextObject.category || '',
        estimatedValue: nextObject.estimatedValue?.toString() || '',
        description: nextObject.landingAiObjects?.length
          ? `AI detected: ${nextObject.landingAiObjects.map((obj: LandingAiObject) => `${obj.label} (${Math.round(obj.confidence * 100)}% confidence)`).join(', ')}`
          : `Detected: ${nextObject.name || ''}`
      }));
    } else {
      onClose();
    }
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
            <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
              <img
                src={formData.imageUrl.startsWith('data:') ? formData.imageUrl : `http://localhost:3000${formData.imageUrl}`}
                alt={`${formData.name || 'Captured item'}`}
                className="w-full h-full object-contain"
              />
              {aiDetected && (
                <div className="absolute top-2 left-2 bg-green-500 bg-opacity-90 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                  <Check size={12} />
                  AI Detected!
                </div>
              )}
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
                {isProcessingLandingAi
                  ? "Processing with Landing AI..."
                  : `${currentObjectIndex + 1} of ${Math.min(detectedObjects.length, 3)} objects in this ${detectedRoom.toLowerCase()}`
                }
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Where is it? *
            </label>
            <select
              required
              value={formData.room}
              onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
            >
              <option value="">Select a room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.name}>{room.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What is it? *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
              placeholder="e.g., MacBook Pro, Coffee Mug, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tell me more about it
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-green-300 bg-green-50' : 'border-gray-300'
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
                value={formData.estimatedValue}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: e.target.value }))}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-green-300 bg-green-50' : 'border-gray-300'
                  }`}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              placeholder="vintage, gift, favorite (comma separated)"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors mt-6"
          >
            {currentObjectIndex < Math.min(detectedObjects.length - 1, 2)
              ? `Add Item (${currentObjectIndex + 1}/${Math.min(detectedObjects.length, 3)})`
              : 'Add Item'}
          </button>
        </form>
      </div>
    </div>
  );
};