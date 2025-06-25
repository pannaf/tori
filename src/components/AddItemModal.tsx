import React, { useState, useEffect } from 'react';
import { X, Camera, Plus, Check, Zap, Wrench, Calendar, Clock, Package, AlertCircle } from 'lucide-react';
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

    // Skip real API calls for mock processing ID
    if (processingId === 'mock-processing-id') {
      return;
    }

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
            ready: obj.status === 'complete' || obj.status === 'no_detection' || obj.status === 'error'
          }));

          setItemQueue(updatedObjects);

          // Check if we're in waiting state and a new item became ready
          const currentItem = itemQueue[currentQueueIndex];
          const updatedCurrentItem = updatedObjects[currentQueueIndex];

          // If we're showing empty form (waiting) and current item is now ready, load it
          if (!formData.name && updatedCurrentItem && updatedCurrentItem.ready &&
            !completedItems.includes(updatedCurrentItem.name)) {
            setFormData(prev => ({
              ...prev,
              imageUrl: updatedCurrentItem.imageUrl || imageData,
              room: findMatchingRoom(detectedRoom) || prev.room,
              name: updatedCurrentItem.name || '',
              category: updatedCurrentItem.category || '',
              description: updatedCurrentItem.description || '',
              estimatedValue: updatedCurrentItem.estimatedValue?.toString() || '',
              tags: ['detected', updatedCurrentItem.category?.toLowerCase() || ''].filter(Boolean)
            }));
          }

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
        ready: obj.status === 'complete' || obj.status === 'no_detection' || obj.status === 'error'
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

  // Debug/Simulation function
  const simulateStreamingFlow = () => {
    const mockImageData = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

    // Create mock objects - only first one has details, others are unknown until processed
    const mockObjects = [
      {
        name: "MacBook Pro",
        category: "Electronics",
        description: "13-inch laptop computer",
        estimatedValue: 1200,
        imageUrl: mockImageData,
        originalCropImageUrl: mockImageData,
        originalFullImageUrl: mockImageData,
        status: "complete",
        ready: true
      },
      {
        name: "", // Unknown until processed
        category: "",
        description: "",
        estimatedValue: 0,
        imageUrl: mockImageData,
        originalCropImageUrl: mockImageData,
        originalFullImageUrl: mockImageData,
        status: "processing",
        ready: false
      },
      {
        name: "", // Unknown until processed
        category: "",
        description: "",
        estimatedValue: 0,
        imageUrl: mockImageData,
        originalCropImageUrl: mockImageData,
        originalFullImageUrl: mockImageData,
        status: "processing",
        ready: false
      },
      {
        name: "", // Unknown until processed
        category: "",
        description: "",
        estimatedValue: 0,
        imageUrl: mockImageData,
        originalCropImageUrl: mockImageData,
        originalFullImageUrl: mockImageData,
        status: "processing",
        ready: false
      }
    ];

    // Items that will be revealed when processing completes
    const itemsToReveal = [
      { name: "Coffee Mug", category: "Kitchen", description: "Blue ceramic coffee mug", estimatedValue: 15 },
      { name: "Wireless Mouse", category: "Electronics", description: "Black wireless computer mouse", estimatedValue: 25 },
      { name: "Plant Pot", category: "Home & Garden", description: "Small terracotta plant pot", estimatedValue: 8 }
    ];

    setImageData(mockImageData);
    setItemQueue(mockObjects);
    setDetectedObjects(mockObjects);
    setDetectedRoom('Living Room');
    setCurrentQueueIndex(0);

    // Set up form with first item
    const firstItem = mockObjects[0];
    setFormData(prev => ({
      ...prev,
      imageUrl: firstItem.imageUrl,
      room: findMatchingRoom('Living Room'),
      name: firstItem.name,
      category: firstItem.category,
      description: firstItem.description,
      estimatedValue: firstItem.estimatedValue?.toString() || '',
      tags: ['detected', firstItem.category?.toLowerCase() || ''].filter(Boolean)
    }));

    setAiDetected(true);
    setIsStreaming(true);
    setProcessingId('mock-processing-id');

    // Start mock polling that gradually makes items ready
    let currentIndex = 1; // Start from second item (first is already ready)
    const mockInterval = setInterval(() => {
      if (currentIndex >= mockObjects.length) {
        clearInterval(mockInterval);
        setIsStreaming(false);
        setProcessingId(null);
        return;
      }

      setItemQueue(prevQueue => {
        const updatedQueue = [...prevQueue];
        if (updatedQueue[currentIndex]) {
          const itemToReveal = itemsToReveal[currentIndex - 1]; // -1 because first item is already complete
          const isSuccess = Math.random() > 0.2; // 80% success rate

          updatedQueue[currentIndex] = {
            ...updatedQueue[currentIndex],
            // Only reveal details if processing succeeds
            name: isSuccess ? itemToReveal?.name || "Unknown Item" : "Processing Failed",
            category: isSuccess ? itemToReveal?.category || "Unknown" : "Unknown",
            description: isSuccess ? itemToReveal?.description || "" : "Image processing failed",
            estimatedValue: isSuccess ? itemToReveal?.estimatedValue || 0 : 0,
            status: isSuccess ? 'complete' : 'error',
            ready: true
          };
        }
        return updatedQueue;
      });

      currentIndex++;
    }, 2000); // Make one item ready every 2 seconds

    console.log('🎭 Simulation started! Items will become ready every 2 seconds');
  };

  const moveToNextItem = () => {
    // Mark current item as completed - create updated list for immediate use
    const currentItem = itemQueue[currentQueueIndex];
    const updatedCompletedItems = currentItem ? [...completedItems, currentItem.name] : completedItems;

    if (currentItem) {
      setCompletedItems(updatedCompletedItems);
    }

    // Find next ready item using the updated completed items list
    // Search through ALL items (not just after current index) to handle out-of-order readiness
    let nextReadyIndex = -1;

    // First, look for ready items after current index
    for (let i = currentQueueIndex + 1; i < itemQueue.length; i++) {
      if (itemQueue[i]?.ready && !updatedCompletedItems.includes(itemQueue[i].name)) {
        nextReadyIndex = i;
        break;
      }
    }

    // If no ready items after current index, look for ready items before current index
    if (nextReadyIndex === -1) {
      for (let i = 0; i < currentQueueIndex; i++) {
        if (itemQueue[i]?.ready && !updatedCompletedItems.includes(itemQueue[i].name)) {
          nextReadyIndex = i;
          break;
        }
      }
    }

    if (nextReadyIndex !== -1) {
      // Move to next ready item
      setCurrentQueueIndex(nextReadyIndex);
      const nextItem = itemQueue[nextReadyIndex];

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
      // No more ready items - close modal and let background processing continue
      onClose();
    }
  };

  const handleSkipItem = () => {
    moveToNextItem();
  };

  // Helper function to check if there are more ready items after current one
  const hasMoreReadyItems = () => {
    if (itemQueue.length === 0) return false;

    // Create a list that includes the current item as completed for accurate checking
    const currentItem = itemQueue[currentQueueIndex];
    const futureCompletedItems = currentItem ? [...completedItems, currentItem.name] : completedItems;

    // Check if there are any ready items in the entire queue (not just after current index)
    for (let i = 0; i < itemQueue.length; i++) {
      if (i !== currentQueueIndex && itemQueue[i]?.ready && !futureCompletedItems.includes(itemQueue[i].name)) {
        return true;
      }
    }
    return false;
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:w-full sm:rounded-3xl rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl safe-area-inset">
        {/* Compact Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            {aiDetected && itemQueue.length > 0 && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-sm font-medium text-gray-600">
                  {currentQueueIndex + 1}/{itemQueue.length}
                </span>
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-900">Add to Inventory</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Compact Queue Progress (only when multiple items) */}
        {aiDetected && itemQueue.length > 1 && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex gap-1 justify-center">
              {itemQueue.map((item, index) => (
                <div
                  key={index}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${completedItems.includes(item.name)
                    ? item.status === 'error'
                      ? 'bg-red-500 text-white'
                      : 'bg-green-500 text-white'
                    : index === currentQueueIndex
                      ? 'bg-indigo-500 text-white ring-2 ring-indigo-200'
                      : item.ready
                        ? item.status === 'error'
                          ? 'bg-red-500 text-white'
                          : 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {!formData.imageUrl ? (
            // Camera Section
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Camera size={32} className="text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Snap it & Tag it</h3>
              <p className="text-gray-600 text-sm mb-6">Tori will identify your items automatically</p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-full font-bold hover:shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  <Camera size={20} />
                  Snap it
                  <Zap size={16} className="text-amber-300" />
                </button>

                <button
                  type="button"
                  onClick={simulateStreamingFlow}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-full font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 text-sm"
                >
                  🎭 Demo Mode
                </button>
              </div>
            </div>
          ) : (
            // Form Section
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Image Preview */}
              <div className="relative">
                <img
                  src={formData.imageUrl}
                  alt="Item"
                  className="w-full h-48 object-cover rounded-2xl bg-gray-100"
                />
                {itemQueue[currentQueueIndex]?.status === 'error' && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <AlertCircle size={12} />
                    Enhancement failed
                  </div>
                )}
              </div>

              {/* Essential Fields Only */}
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-base ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                    placeholder="e.g., MacBook Pro, Coffee Mug"
                    required
                  />
                </div>

                {/* Category & Room in a row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={`w-full px-3 py-3 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none bg-white text-base ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location *
                    </label>
                    <select
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className={`w-full px-3 py-3 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none bg-white text-base ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                      required
                    >
                      <option value="">Select room</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.name}>{room.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Value & Condition in a row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Value
                    </label>
                    <input
                      type="number"
                      value={formData.estimatedValue}
                      onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                      className={`w-full px-3 py-3 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-base ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                      className={`w-full px-3 py-3 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none text-base ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 bg-white'}`}
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                </div>

                {/* Description - Optional, collapsible */}
                <details className="group">
                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                    Add description (optional)
                  </summary>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`w-full mt-2 px-3 py-3 border rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none text-base ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                    rows={2}
                    placeholder="Any details you want to remember..."
                  />
                </details>
              </div>
            </form>
          )}
        </div>

        {/* Fixed Bottom Actions */}
        {formData.imageUrl && (
          <div className="p-4 border-t border-gray-100 bg-white rounded-b-3xl">
            <div className="flex gap-3">
              {/* Skip button - only show when there are more ready items OR not streaming */}
              {aiDetected && (hasMoreReadyItems() || !isStreaming) && ((itemQueue.length > 0 && currentQueueIndex < itemQueue.length - 1) || (currentObjectIndex < Math.min(detectedObjects.length - 1, 2))) && (
                <button
                  type="button"
                  onClick={handleSkipItem}
                  className="flex-1 py-3 rounded-full font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Skip
                </button>
              )}

              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isStreaming && !hasMoreReadyItems()}
                className={`${aiDetected && (hasMoreReadyItems() || !isStreaming) && ((itemQueue.length > 0 && currentQueueIndex < itemQueue.length - 1) || (currentObjectIndex < Math.min(detectedObjects.length - 1, 2))) ? 'flex-1' : 'w-full'} py-3 rounded-full font-bold transition-all duration-300 ${isStreaming && !hasMoreReadyItems()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02]'
                  }`}
              >
                {isStreaming && !hasMoreReadyItems()
                  ? <div className="flex items-center justify-center">
                    <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  </div>
                  : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};