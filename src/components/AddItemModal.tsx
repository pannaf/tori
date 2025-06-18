import React, { useState, useEffect } from 'react';
import { X, Camera, Plus, Check, Zap, Wrench, Calendar, Clock, Package } from 'lucide-react';
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
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    room: '',
    description: '',
    estimatedValue: '',
    condition: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
    tags: [] as string[],
    imageUrl: ''
  });

  const [showCamera, setShowCamera] = useState(false);
  const [imageData, setImageData] = useState<string>('');
  const [aiDetected, setAiDetected] = useState(false);
  const [isProcessingLandingAi, setIsProcessingLandingAi] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<any[]>([]);
  const [detectedRoom, setDetectedRoom] = useState('');
  const [currentObjectIndex, setCurrentObjectIndex] = useState(0);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState({
    title: '',
    description: '',
    intervalType: 'months' as 'days' | 'weeks' | 'months' | 'years',
    intervalValue: 6,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  // New state for streaming workflow
  const [itemQueue, setItemQueue] = useState<any[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { createMaintenanceSchedule } = useMaintenanceDB(user);

  // Helper function to find the best matching room
  const findMatchingRoom = (detectedRoom: string): string => {
    if (!detectedRoom || !rooms.length) return '';

    const detectedLower = detectedRoom.toLowerCase().trim();

    // First try exact match
    const exactMatch = rooms.find(room => room.name.toLowerCase() === detectedLower);
    if (exactMatch) return exactMatch.name;

    // Then try partial match
    const partialMatch = rooms.find(room =>
      room.name.toLowerCase().includes(detectedLower) ||
      detectedLower.includes(room.name.toLowerCase())
    );
    if (partialMatch) return partialMatch.name;

    // If no match found, return the detected room anyway (user can change it)
    return detectedRoom;
  };

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

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      room: '',
      description: '',
      estimatedValue: '',
      condition: 'good',
      tags: [],
      imageUrl: ''
    });
    setShowCamera(false);
    setImageData('');
    setAiDetected(false);
    setIsProcessingLandingAi(false);
    setDetectedObjects([]);
    setDetectedRoom('');
    setCurrentObjectIndex(0);
    setMaintenanceEnabled(false);
    setMaintenanceData({
      title: '',
      description: '',
      intervalType: 'months',
      intervalValue: 6,
      priority: 'medium',
    });

    // Reset streaming state
    setItemQueue([]);
    setCurrentQueueIndex(0);
    setIsStreaming(false);
    setCompletedItems([]);
    setProcessingId(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Poll for processing updates when we have a processing ID
  useEffect(() => {
    if (!processingId || !isStreaming) return;

    const pollForUpdates = async () => {
      try {
        const response = await fetch(`${env.API_URL}/api/processing-status/${processingId}`);
        if (!response.ok) return;

        const data = await response.json();

        if (data.objects && data.objects.length > 0) {
          // Update the queue with latest status
          const updatedObjects = data.objects.map((obj: any) => ({
            name: obj.name,
            category: obj.category,
            description: obj.description,
            estimatedValue: obj.estimated_cost_usd,
            imageUrl: obj.imageUrl,
            originalCropImageUrl: obj.originalCropImageUrl,
            originalFullImageUrl: obj.originalFullImageUrl,
            status: obj.status,
            ready: obj.status === 'complete' || obj.status === 'no_detection'
          }));

          setItemQueue(updatedObjects);

          // If all processing is done, stop streaming
          if (data.status === 'complete') {
            setIsStreaming(false);
            setProcessingId(null);
          }
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    };

    const interval = setInterval(pollForUpdates, 2000); // Poll every 2 seconds during modal review
    pollForUpdates(); // Poll immediately

    return () => clearInterval(interval);
  }, [processingId, isStreaming]);

  const handleCameraCapture = async (capturedImageData: string, recognitionData: any) => {
    setImageData(capturedImageData);

    if (recognitionData.objects && recognitionData.objects.length > 0) {
      // Handle new streaming format
      const processedObjects = recognitionData.objects.map((obj: any) => ({
        name: obj.name,
        category: obj.category,
        description: obj.description,
        estimatedValue: obj.estimated_cost_usd,
        imageUrl: obj.imageUrl,
        originalCropImageUrl: obj.originalCropImageUrl,
        originalFullImageUrl: obj.originalFullImageUrl,
        status: obj.status,
        ready: obj.status === 'complete' || obj.status === 'no_detection'
      }));

      setItemQueue(processedObjects);
      setDetectedObjects(processedObjects);
      setDetectedRoom(recognitionData.room || '');

      // Find first ready item or start with first item if streaming
      const firstReadyIndex = processedObjects.findIndex((obj: any) => obj.ready);
      const startIndex = firstReadyIndex >= 0 ? firstReadyIndex : 0;

      setCurrentQueueIndex(startIndex);

      // Set up form with first available item
      const firstItem = processedObjects[startIndex];
      if (firstItem) {
        setFormData(prev => ({
          ...prev,
          imageUrl: firstItem.imageUrl || capturedImageData,
          room: findMatchingRoom(recognitionData.room || ''),
          name: firstItem.name || '',
          category: firstItem.category || '',
          description: firstItem.description || '',
          estimatedValue: firstItem.estimatedValue?.toString() || '',
          tags: ['detected', firstItem.category?.toLowerCase() || ''].filter(Boolean)
        }));
      }

      setAiDetected(true);
      setIsStreaming(recognitionData.isStreaming || !processedObjects.every((obj: any) => obj.ready));

      // If we have a processing ID, start polling for updates
      if (recognitionData.processingId) {
        setProcessingId(recognitionData.processingId);
      }
    }

    setShowCamera(false);
  };

  const moveToNextItem = () => {
    // Mark current item as completed
    const currentItem = itemQueue[currentQueueIndex];
    if (currentItem) {
      setCompletedItems(prev => [...prev, currentItem.name]);
    }

    // Find next available item
    let nextIndex = currentQueueIndex + 1;
    while (nextIndex < itemQueue.length &&
      (completedItems.includes(itemQueue[nextIndex]?.name) ||
        (!itemQueue[nextIndex]?.ready && isStreaming))) {
      nextIndex++;
    }

    if (nextIndex < itemQueue.length) {
      // Move to next item
      setCurrentQueueIndex(nextIndex);
      const nextItem = itemQueue[nextIndex];

      setFormData(prev => ({
        ...prev,
        imageUrl: nextItem.imageUrl || imageData,
        room: findMatchingRoom(detectedRoom) || prev.room, // Preserve the detected room
        name: nextItem.name || '',
        category: nextItem.category || '',
        description: nextItem.description || '',
        estimatedValue: nextItem.estimatedValue?.toString() || '',
        tags: ['detected', nextItem.category?.toLowerCase() || ''].filter(Boolean)
      }));
    } else {
      // No more items to process
      onClose();
    }
  };

  const handleSkipItem = () => {
    moveToNextItem();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const currentObject = itemQueue[currentQueueIndex] || detectedObjects[currentObjectIndex];
    const newItem = {
      ...formData,
      imageUrl: currentObject?.imageUrl || formData.imageUrl,
      originalCropImageUrl: currentObject?.originalCropImageUrl,
      originalFullImageUrl: currentObject?.originalFullImageUrl,
      estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
      tags: Array.isArray(formData.tags) ? formData.tags : []
    };

    // Convert maintenance data to expected format
    const maintenanceSchedule = maintenanceEnabled && maintenanceData.title ? {
      title: maintenanceData.title,
      description: maintenanceData.description,
      intervalType: maintenanceData.intervalType,
      intervalValue: maintenanceData.intervalValue,
      priority: maintenanceData.priority
    } : undefined;

    onAdd(newItem, maintenanceSchedule);

    // Move to next item or close
    if (itemQueue.length > 0) {
      moveToNextItem();
    } else if (currentObjectIndex < Math.min(detectedObjects.length - 1, 2)) {
      const nextObject = detectedObjects[currentObjectIndex + 1];
      setCurrentObjectIndex(prev => prev + 1);
      setFormData(prev => ({
        ...prev,
        imageUrl: nextObject.imageUrl || imageData,
        name: nextObject.name || '',
        category: nextObject.category || '',
        estimatedValue: nextObject.estimatedValue?.toString() || '',
        description: nextObject.description || ''
      }));
    } else {
      onClose();
    }
  };

  // New component to show queue status
  const QueueStatus = () => {
    if (!itemQueue.length || !aiDetected) return null;

    const readyCount = itemQueue.filter(item => item.ready).length;
    const totalCount = itemQueue.length;
    const completedCount = completedItems.length;

    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3 text-indigo-700 mb-2">
          <Package size={18} />
          <span className="font-bold">Item Processing Queue</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Completed: {completedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Ready: {readyCount - completedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Processing: {totalCount - readyCount}</span>
          </div>
        </div>

        {/* Queue visualization */}
        <div className="flex gap-2 mt-3">
          {itemQueue.map((item, index) => (
            <div
              key={index}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${completedItems.includes(item.name)
                ? 'bg-green-500 text-white'
                : index === currentQueueIndex
                  ? 'bg-indigo-500 text-white ring-2 ring-indigo-300'
                  : item.ready
                    ? 'bg-blue-500 text-white'
                    : 'bg-yellow-500 text-white'
                }`}
              title={item.name}
            >
              {index + 1}
            </div>
          ))}
        </div>

        <p className="text-indigo-600 text-sm mt-2">
          {isStreaming
            ? `Reviewing item ${currentQueueIndex + 1} of ${totalCount}. Items will appear as they're processed.`
            : `Reviewing item ${currentQueueIndex + 1} of ${totalCount}`
          }
        </p>
      </div>
    );
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add Inventory Item</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <QueueStatus />

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
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3 text-indigo-700 mb-2">
                <Zap size={18} />
                <span className="font-bold">AI Detection Results:</span>
              </div>
              <p className="text-indigo-600 text-sm">
                {isStreaming
                  ? `Processing items in the background. You can review available items now!`
                  : `Item ${currentQueueIndex + 1} of ${itemQueue.length || detectedObjects.length} in this ${detectedRoom.toLowerCase()}`
                }
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Display */}
            {formData.imageUrl && (
              <div className="flex justify-center mb-6">
                <img
                  src={formData.imageUrl}
                  alt="Item"
                  className="max-w-full max-h-64 object-contain rounded-lg shadow-md"
                />
              </div>
            )}



            {/* Name field */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-3">
                What is it? *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-6 py-4 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                placeholder="e.g., MacBook Pro, Coffee Mug, etc."
                required
              />
            </div>

            {/* Category field */}
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-3">
                Category *
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-6 py-4 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none bg-white ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>{category.name}</option>
                ))}
              </select>
            </div>

            {/* Room field */}
            <div>
              <label htmlFor="room" className="block text-sm font-semibold text-gray-700 mb-3">
                Where is it? *
              </label>
              <select
                id="room"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className={`w-full px-6 py-4 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none bg-white ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                required
              >
                <option value="">Select a room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.name}>{room.name}</option>
                ))}
              </select>
            </div>

            {/* Description field */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-3">
                Tell me more about it
              </label>
              <textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-6 py-4 border rounded-3xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                rows={3}
                placeholder="Any details you want to remember..."
              />
            </div>

            {/* Condition and Estimated Value */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="condition" className="block text-sm font-semibold text-gray-700 mb-3">
                  Condition
                </label>
                <select
                  id="condition"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                  className="w-full px-4 py-4 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none bg-white"
                >
                  <option value="excellent">Great</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div>
                <label htmlFor="estimatedValue" className="block text-sm font-semibold text-gray-700 mb-3">
                  Worth about ($)
                </label>
                <input
                  type="number"
                  id="estimatedValue"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                  className={`w-full px-4 py-4 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Tags field */}
            <div>
              <label htmlFor="tags" className="block text-sm font-semibold text-gray-700 mb-3">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })}
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
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Calendar className="text-indigo-600 flex-shrink-0" size={20} />
                    <div className="min-w-0">
                      <p className="font-semibold text-indigo-900 text-sm">Enable Maintenance Reminders</p>
                      <p className="text-xs text-indigo-600">Get notified when maintenance is due</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaintenanceEnabled(!maintenanceEnabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ml-3 ${maintenanceEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${maintenanceEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </div>

              {maintenanceEnabled && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="maintenanceTitle" className="block text-sm font-semibold text-gray-700 mb-3">
                      Maintenance Task
                    </label>
                    <input
                      type="text"
                      id="maintenanceTitle"
                      value={maintenanceData.title}
                      onChange={(e) => setMaintenanceData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      placeholder="e.g., Clean and dust, Oil change, Filter replacement"
                    />
                  </div>

                  <div>
                    <label htmlFor="maintenanceDescription" className="block text-sm font-semibold text-gray-700 mb-3">
                      Description
                    </label>
                    <textarea
                      id="maintenanceDescription"
                      value={maintenanceData.description}
                      onChange={(e) => setMaintenanceData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
                      rows={2}
                      placeholder="What needs to be done?"
                    />
                  </div>

                  {/* Mobile-friendly stacked layout */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="maintenanceInterval" className="block text-sm font-semibold text-gray-700 mb-3">
                        Repeat Every
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          min="1"
                          value={maintenanceData.intervalValue}
                          onChange={(e) => setMaintenanceData(prev => ({ ...prev, intervalValue: parseInt(e.target.value) || 1 }))}
                          className="w-20 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-center"
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
                      <label htmlFor="maintenancePriority" className="block text-sm font-semibold text-gray-700 mb-3">
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

            <div className="flex gap-3">
              {/* Skip button - only show when there are more objects to process */}
              {aiDetected && ((itemQueue.length > 0 && currentQueueIndex < itemQueue.length - 1) || (currentObjectIndex < Math.min(detectedObjects.length - 1, 2))) && (
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
                className={`${aiDetected && ((itemQueue.length > 0 && currentQueueIndex < itemQueue.length - 1) || (currentObjectIndex < Math.min(detectedObjects.length - 1, 2))) ? 'flex-1' : 'w-full'} bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105`}
              >
                {((itemQueue.length > 0 && currentQueueIndex < itemQueue.length - 1) || (currentObjectIndex < Math.min(detectedObjects.length - 1, 2)))
                  ? `Add Item (${itemQueue.length > 0 ? `${completedItems.length + 1}/${itemQueue.length}` : `${currentObjectIndex + 1}/${Math.min(detectedObjects.length, 3)}`})`
                  : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};