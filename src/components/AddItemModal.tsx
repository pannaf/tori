import React, { useState, useEffect } from 'react';
import { X, Camera, Plus, Check, Zap, Wrench, Calendar, Clock } from 'lucide-react';
import { Room, Category, InventoryItem } from '../types/inventory';
import { CameraCapture } from './CameraCapture';
import { env } from '../config/env';
import { useMaintenanceDB } from '../hooks/useMaintenanceDB';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    item: Omit<InventoryItem, 'id' | 'dateAdded'>,
    maintenanceData?: {
      title: string;
      description: string;
      intervalType: 'days' | 'weeks' | 'months' | 'years';
      intervalValue: number;
      priority: 'low' | 'medium' | 'high' | 'urgent';
    }
  ) => void;
  rooms: Room[];
  categories: Category[];
  user?: { id: string; email: string } | null;
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
  originalCropImageUrl?: string;
  originalFullImageUrl?: string;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  rooms,
  categories,
  user,
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [aiDetected, setAiDetected] = useState(false);
  const [detectedRoom, setDetectedRoom] = useState('');
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [currentObjectIndex, setCurrentObjectIndex] = useState(0);
  const [isProcessingLandingAi, setIsProcessingLandingAi] = useState(false);
  const [imageData, setImageData] = useState('');

  // Maintenance state
  const [showMaintenanceSection, setShowMaintenanceSection] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState({
    title: '',
    description: '',
    intervalType: 'months' as 'days' | 'weeks' | 'months' | 'years',
    intervalValue: 6,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  const { createMaintenanceSchedule } = useMaintenanceDB(user);

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
      setShowMaintenanceSection(false);
      setMaintenanceEnabled(false);
      setMaintenanceData({
        title: '',
        description: '',
        intervalType: 'months',
        intervalValue: 6,
        priority: 'medium',
      });
    }
  }, [isOpen]);

  // Auto-suggest maintenance when category changes
  useEffect(() => {
    if (formData.category && maintenanceSuggestions[formData.category]) {
      const suggestion = maintenanceSuggestions[formData.category][0];
      if (suggestion && !maintenanceData.title) {
        setMaintenanceData({
          title: suggestion.title,
          description: suggestion.description,
          intervalType: suggestion.intervalType,
          intervalValue: suggestion.intervalValue,
          priority: suggestion.priority,
        });
      }
    }
  }, [formData.category]);

  const processWithLandingAi = async (imageData: string, objectName: string): Promise<any> => {
    try {
      // Create form data for the Landing AI API
      const formData = new FormData();
      // Convert base64 to blob
      const base64Data = imageData.split(',')[1];
      const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());
      formData.append('image', blob);
      formData.append('object_name', objectName);

      const response = await fetch(`${env.API_URL}/api/detect-object`, {
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
      originalCropImageUrl?: string;
      originalFullImageUrl?: string;
    }) => ({
      name: obj.name,
      category: obj.category,
      description: obj.description,
      estimatedValue: obj.estimated_cost_usd,
      imageUrl: obj.imageUrl,
      originalCropImageUrl: obj.originalCropImageUrl,
      originalFullImageUrl: obj.originalFullImageUrl
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

  const handleSkipItem = () => {
    // If there are more objects to process, move to the next one
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const currentObject = detectedObjects[currentObjectIndex];
    const newItem = {
      ...formData,
      // Use the cropped image URL from the current object if available
      imageUrl: currentObject?.imageUrl || formData.imageUrl,
      originalCropImageUrl: currentObject?.originalCropImageUrl, // Include original cropped image URL
      originalFullImageUrl: currentObject?.originalFullImageUrl, // Include original full image URL
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

    // Pass maintenance data to the onAdd function
    onAdd(
      newItem,
      maintenanceEnabled && maintenanceData.title ? maintenanceData : undefined
    );

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
                src={
                  formData.imageUrl.startsWith('data:') ? formData.imageUrl :
                    formData.imageUrl.startsWith('http') ? formData.imageUrl :
                      `${env.API_URL}${formData.imageUrl}`
                }
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

          {!formData.imageUrl && (
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-full font-bold hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
            >
              <Camera size={22} />
              Take Photo & Auto-Detect
              <Zap size={18} className="text-amber-300" />
            </button>
          )}

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
              className={`w-full px-6 py-4 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none bg-white ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
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
              className={`w-full px-6 py-4 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
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
              className={`w-full px-6 py-4 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none bg-white ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
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
              className={`w-full px-6 py-4 border rounded-3xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
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
                className={`w-full px-4 py-4 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
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
                  <p className="text-sm text-gray-600">Keep this item in perfect condition</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMaintenanceSection(!showMaintenanceSection)}
                className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
              >
                {showMaintenanceSection ? 'Hide' : 'Add Maintenance'}
              </button>
            </div>

            {showMaintenanceSection && (
              <div className="space-y-4">
                {/* Enable Maintenance Toggle */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-indigo-600" size={20} />
                    <div>
                      <p className="font-semibold text-indigo-900">Enable Maintenance Reminders</p>
                      <p className="text-sm text-indigo-600">Get notified when maintenance is due</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaintenanceEnabled(!maintenanceEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>

                {maintenanceEnabled && (
                  <div className="space-y-4">
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
                              onClick={() => setMaintenanceData(suggestion)}
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
                        value={maintenanceData.title}
                        onChange={(e) => setMaintenanceData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                        placeholder="e.g., Clean and dust, Oil change, Filter replacement"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Description
                      </label>
                      <textarea
                        value={maintenanceData.description}
                        onChange={(e) => setMaintenanceData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
                        rows={2}
                        placeholder="What needs to be done?"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Repeat Every
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            value={maintenanceData.intervalValue}
                            onChange={(e) => setMaintenanceData(prev => ({ ...prev, intervalValue: parseInt(e.target.value) || 1 }))}
                            className="w-20 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                          />
                          <select
                            value={maintenanceData.intervalType}
                            onChange={(e) => setMaintenanceData(prev => ({ ...prev, intervalType: e.target.value as any }))}
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
                          value={maintenanceData.priority}
                          onChange={(e) => setMaintenanceData(prev => ({ ...prev, priority: e.target.value as any }))}
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
                    {maintenanceData.title && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="text-green-600" size={16} />
                          <span className="font-semibold text-green-900">Maintenance Preview</span>
                        </div>
                        <p className="text-sm text-green-800">
                          <strong>{maintenanceData.title}</strong> will be scheduled every{' '}
                          <strong>{maintenanceData.intervalValue} {maintenanceData.intervalType}</strong>{' '}
                          with <strong>{maintenanceData.priority}</strong> priority.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {/* Skip button - only show when there are more objects to process */}
            {aiDetected && currentObjectIndex < Math.min(detectedObjects.length - 1, 2) && (
              <button
                type="button"
                onClick={handleSkipItem}
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-full font-bold hover:bg-gray-200 transition-colors"
              >
                Skip Item
              </button>
            )}

            <button
              type="submit"
              className={`${aiDetected && currentObjectIndex < Math.min(detectedObjects.length - 1, 2) ? 'flex-1' : 'w-full'} bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105`}
            >
              {currentObjectIndex < Math.min(detectedObjects.length - 1, 2)
                ? `Add Item (${currentObjectIndex + 1}/${Math.min(detectedObjects.length, 3)})`
                : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};