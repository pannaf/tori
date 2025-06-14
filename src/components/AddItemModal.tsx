import React, { useState, useEffect } from 'react';
import { X, Camera, Plus, Check, Zap } from 'lucide-react';
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
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Add to Your Collection</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {formData.imageUrl && (
            <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden">
              <img
                src={formData.imageUrl.startsWith('data:') ? formData.imageUrl : `http://localhost:3000${formData.imageUrl}`}
                alt={`${formData.name || 'Captured item'}`}
                className="w-full h-full object-contain"
              />
              {aiDetected && (
                <div className="absolute top-3 left-3 bg-gradient-to-r from-indigo-500 to-purple-600 bg-opacity-95 text-white px-3 py-2 rounded-xl text-sm flex items-center gap-2 font-semibold">
                  <Check size={14} />
                  AI Detected!
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
          >
            <Camera size={22} />
            {formData.imageUrl ? 'Retake Photo' : 'Take Photo & Auto-Detect'}
            <Zap size={18} className="text-amber-300" />
          </button>

          {aiDetected && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4">
              <div className="flex items-center gap-3 text-indigo-700 mb-2">
                <Zap size={18} />
                <span className="font-bold">Tori's AI Detection Results:</span>
              </div>
              <p className="text-indigo-600 text-sm">
                {isProcessingLandingAi
                  ? "Processing with Landing AI..."
                  : `${currentObjectIndex + 1} of ${Math.min(detectedObjects.length, 3)} objects in this ${detectedRoom.toLowerCase()}`
                }
              </p>
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
              className={`w-full px-4 py-3 border rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
                }`}
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
              className={`w-full px-4 py-3 border rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
                }`}
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
              className={`w-full px-4 py-3 border rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
                }`}
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
              className={`w-full px-4 py-3 border rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
                }`}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              >
                <option value="excellent">Like new ✨</option>
                <option value="good">Pretty good 👍</option>
                <option value="fair">Okay 👌</option>
                <option value="poor">Seen better days 😅</option>
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
                className={`w-full px-4 py-3 border rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
                  }`}
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
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              placeholder="vintage, gift, favorite (comma separated)"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105"
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