import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Plus, Check, Zap, Wrench, Calendar, Clock, Package, AlertCircle, RefreshCw, Sparkles, DollarSign, MapPin, Eye, Scissors, Palette, Upload, Brain } from 'lucide-react';
import { Room, Category, InventoryItem } from '../types/inventory';

import { env } from '../config/env';
import { useMaintenanceDB } from '../hooks/useMaintenanceDB';
import { supabase } from '../config/supabase';

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
  description: string;
  estimated_cost_usd: number;
  estimatedValue?: number;
  landingAiObjects?: LandingAiObject[];
  imageUrl?: string;
  originalCropImageUrl?: string;
  originalFullImageUrl?: string;
  confidence?: number;
  status?: 'waiting' | 'detecting' | 'cropping' | 'enhancing' | 'uploading' | 'complete' | 'error' | 'no_detection';
  detectionCount?: number;
}

interface ProgressState {
  step: 'preparing' | 'analyzing' | 'detecting' | 'processing' | 'enhancing' | 'complete';
  message: string;
  progress: number;
  detectedObjects?: DetectedObject[];
  room?: string;
  totalValue?: number;
  currentlyProcessing?: string;
  currentObjectIndex?: number;
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

  const [imageData, setImageData] = useState<string>('');
  const [aiDetected, setAiDetected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<any[]>([]);
  const [detectedRoom, setDetectedRoom] = useState('');
  const [currentObjectIndex, setCurrentObjectIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // AI processing state
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState<ProgressState>({
    step: 'preparing',
    message: '',
    progress: 0
  });
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const pollingCleanupRef = useRef<(() => void) | null>(null);

  const { createMaintenanceSchedule } = useMaintenanceDB(user);

  // Memory utilities for iPhone SE
  const isLowMemoryDevice = () => {
    return navigator.userAgent.includes('iPhone') &&
      (navigator.userAgent.includes('SE') || window.screen.width <= 375);
  };

  const requestMemoryCleanup = () => {
    if (window.gc) {
      window.gc();
    }
    // Force garbage collection by creating/destroying objects
    const cleanup = new Array(1000).fill(null);
    cleanup.length = 0;
  };

  // Function to fix image orientation and compress for memory efficiency
  const fixImageOrientation = async (file: File): Promise<string> => {
    try {
      // Detect if we're on a low-memory device (like iPhone SE)
      const isLowMemoryDevice = navigator.userAgent.includes('iPhone') &&
        (navigator.userAgent.includes('SE') || window.screen.width <= 375);

      // Use createImageBitmap with imageOrientation: 'from-image' to auto-correct orientation
      const imageBitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image'
      });

      // Calculate compressed dimensions to prevent memory issues
      const maxDimension = isLowMemoryDevice ? 800 : 1200; // Smaller for iPhone SE
      const { width, height } = imageBitmap;

      let newWidth = width;
      let newHeight = height;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        newWidth = Math.round(width * ratio);
        newHeight = Math.round(height * ratio);
      }

      // Create canvas with compressed dimensions
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = newWidth;
      canvas.height = newHeight;

      // Draw the correctly oriented and sized image
      ctx?.drawImage(imageBitmap, 0, 0, newWidth, newHeight);

      // Clean up the bitmap immediately
      imageBitmap.close();

      // Use higher compression for low-memory devices
      const quality = isLowMemoryDevice ? 0.7 : 0.85;
      return canvas.toDataURL('image/jpeg', quality);
    } catch (error) {
      console.warn('createImageBitmap not supported or failed, falling back to compressed original');
      // Fallback with compression
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              // Apply same compression logic for fallback
              const isLowMemoryDevice = navigator.userAgent.includes('iPhone') &&
                (navigator.userAgent.includes('SE') || window.screen.width <= 375);
              const maxDimension = isLowMemoryDevice ? 800 : 1200;

              let { width, height } = img;
              if (width > maxDimension || height > maxDimension) {
                const ratio = Math.min(maxDimension / width, maxDimension / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
              }

              canvas.width = width;
              canvas.height = height;
              ctx?.drawImage(img, 0, 0, width, height);

              const quality = isLowMemoryDevice ? 0.7 : 0.85;
              resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target?.result as string;
          } catch (fallbackError) {
            // Last resort: return original
            resolve(e.target?.result as string);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

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
    setImageData('');
    setAiDetected(false);
    setIsProcessing(false);
    setError(null);
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

    // Reset AI processing state
    setAiProcessing(false);
    setAiProgress({
      step: 'preparing',
      message: '',
      progress: 0
    });

    // Cleanup polling
    if (pollingCleanupRef.current) {
      pollingCleanupRef.current();
      pollingCleanupRef.current = null;
    }
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

  // Handle file input from camera
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Convert file to data URL for now (simple implementation)
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setImageData(imageData);

        // For now, just set the image and let user manually fill form
        // TODO: Add AI processing here
        setFormData(prev => ({
          ...prev,
          imageUrl: imageData
        }));

        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      setError('Failed to process image. Please try again.');
      setIsProcessing(false);
    }
  };

  // Update AI progress
  const updateAiProgress = (newProgress: Partial<ProgressState>) => {
    setAiProgress(prev => ({ ...prev, ...newProgress }));
  };

  // Helper function to infer category from item name
  const inferCategory = (name: string): string => {
    const categoryMap: Record<string, string[]> = {
      'Electronics': ['phone', 'laptop', 'computer', 'tv', 'tablet', 'camera', 'speaker'],
      'Furniture': ['chair', 'table', 'desk', 'sofa', 'bed', 'shelf', 'cabinet'],
      'Kitchen': ['pan', 'pot', 'knife', 'plate', 'cup', 'mug', 'utensil'],
      'Clothing': ['shirt', 'pants', 'dress', 'shoe', 'jacket', 'hat'],
      'Books': ['book', 'magazine', 'journal', 'notebook'],
      'Decorative': ['plant', 'frame', 'vase', 'candle', 'art'],
      'Sports': ['ball', 'racket', 'bike', 'weight', 'mat'],
      'Tools': ['hammer', 'screwdriver', 'drill', 'saw']
    };

    const nameLower = name.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => nameLower.includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  };

  // AI photo processing
  const handleAiPhotoProcessing = async (file: File, imageData: string) => {
    try {
      setError('');
      setAiProcessing(true);

      try {
        // Create form data for the API with memory optimization
        const formData = new FormData();

        // Convert corrected image back to blob for upload
        const response = await fetch(imageData);
        const blob = await response.blob();

        // Clean up the response immediately to free memory
        if (response.body) {
          try {
            await response.body.cancel();
          } catch (e) {
            // ReadableStream might already be consumed, ignore error
          }
        }

        const correctedFile = new File([blob], file.name, { type: 'image/jpeg' });
        formData.append('image', correctedFile);

        // Add the authenticated user's ID and token
        if (user && supabase) {
          formData.append('userId', user.id);
          // Get auth token from Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            formData.append('authToken', session.access_token);
          }
        }

        updateAiProgress({
          step: 'analyzing',
          message: 'Tori is analyzing your photo with AI...',
          progress: 25
        });

        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

        // Start the API request
        const apiResponse = await fetch(`${env.API_URL}/api/analyze-image`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!apiResponse.ok) {
          throw new Error('Failed to analyze image');
        }

        // Parse the immediate GPT-4 response
        const initialData = await apiResponse.json();

        if (initialData.step === 'gpt_complete') {
          // Show immediate feedback about what was found
          updateAiProgress({
            step: 'detecting',
            message: `Found ${initialData.objects.length} items! Processing with AI...`,
            progress: 50,
            detectedObjects: initialData.objects.map((obj: any) => ({
              ...obj,
              status: 'waiting'
            })),
            room: initialData.room,
            totalValue: initialData.total_estimated_value_usd
          });

          // Start polling for background processing updates
          const cleanup = pollForProcessingUpdates(initialData.processing_id, imageData);
          pollingCleanupRef.current = cleanup;
        } else {
          // Fallback for old format
          handleLegacyResponse(initialData, imageData);
        }

      } catch (error) {
        console.error('Recognition failed:', error);
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            setError('Request timed out. AI processing takes time - try again or use a smaller image.');
          } else {
            setError(`Analysis failed: ${error.message}. Please try again.`);
          }
        } else {
          setError('Failed to analyze image. Please try again.');
        }
        setAiProcessing(false);
      }
    } catch (error) {
      console.error('Error handling AI photo:', error);
      setError('Failed to process image. Please try again.');
      setAiProcessing(false);
    }
  };

  // Poll for background processing updates
  const pollForProcessingUpdates = (processingId: string, imageData: string) => {
    const maxAttempts = isLowMemoryDevice() ? 30 : 60;
    let attempts = 0;
    let completedItemsSet: Set<number> = new Set();
    let hasStartedStreaming = false;
    let lastObjectsRef: any[] = [];
    let abortController = new AbortController();

    const poll = async () => {
      try {
        // Memory cleanup on low memory devices
        if (isLowMemoryDevice() && attempts % 5 === 0) {
          requestMemoryCleanup();
        }

        const response = await fetch(`${env.API_URL}/api/processing-status/${processingId}`, {
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error('Failed to get processing status');
        }

        const statusData = await response.json();

        // Reuse existing object references when possible
        const currentObjects = statusData.objects.map((newObj: any, index: number) => {
          const existingObj = lastObjectsRef[index];

          if (existingObj &&
            existingObj.status === newObj.status &&
            existingObj.name === newObj.name) {
            return existingObj;
          }

          return {
            ...newObj,
            status: newObj.status === 'complete' ? 'complete' :
              newObj.status === 'processing' ? 'processing' :
                newObj.status === 'error' ? 'error' :
                  newObj.status === 'no_detection' ? 'no_detection' : 'waiting',
            imageUrl: isLowMemoryDevice() ? undefined : newObj.imageUrl,
            originalCropImageUrl: isLowMemoryDevice() ? undefined : newObj.originalCropImageUrl,
            originalFullImageUrl: isLowMemoryDevice() ? imageData : newObj.originalFullImageUrl
          };
        });

        lastObjectsRef = currentObjects;

        // Update progress
        const progressPercentage = Math.min(90, 50 + (statusData.completedCount / statusData.totalCount) * 40);

        updateAiProgress({
          step: statusData.status === 'complete' ? 'complete' : 'processing',
          message: statusData.status === 'complete'
            ? 'Perfect! Your items are ready to add.'
            : `Processing ${statusData.completedCount}/${statusData.totalCount} items...`,
          progress: progressPercentage,
          detectedObjects: currentObjects,
          room: aiProgress.room,
          totalValue: aiProgress.totalValue
        });

        // Check for newly completed items
        const newlyCompletedIndices = statusData.objects
          .map((obj: any, index: number) =>
            ((obj.status === 'complete' || obj.status === 'no_detection' || obj.status === 'error') && !completedItemsSet.has(index)) ? index : -1
          )
          .filter((index: number) => index !== -1);

        newlyCompletedIndices.forEach((index: number) => completedItemsSet.add(index));

        // Start streaming when first item is ready
        if (completedItemsSet.size >= 1 && !hasStartedStreaming) {
          hasStartedStreaming = true;

          // Convert to the format expected by handleCameraCapture
          const recognitionData = {
            objects: currentObjects.map((obj: any) => ({
              name: obj.name,
              confidence: obj.confidence || 0.9,
              category: obj.category || inferCategory(obj.name),
              description: obj.description || '',
              estimated_cost_usd: obj.estimated_cost_usd,
              imageUrl: obj.imageUrl,
              originalCropImageUrl: obj.originalCropImageUrl,
              originalFullImageUrl: obj.originalFullImageUrl || imageData,
              status: obj.status,
              ready: obj.status === 'complete' || obj.status === 'no_detection' || obj.status === 'error'
            })),
            room: aiProgress.room,
            suggestedName: statusData.objects[0]?.name || '',
            suggestedCategory: statusData.objects[0]?.category || inferCategory(statusData.objects[0]?.name || ''),
            estimatedValue: aiProgress.totalValue,
            isStreaming: true,
            processingId: processingId
          };

          // Hide AI processing UI and show form with detected items
          setAiProcessing(false);
          handleCameraCapture(imageData, recognitionData);
        }

        // Check if complete
        if (statusData.status === 'complete') {
          abortController.abort();
          setAiProcessing(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          const pollInterval = isLowMemoryDevice() ? 3000 : 1000;
          setTimeout(poll, pollInterval);
        } else {
          abortController.abort();
          throw new Error('Processing timeout');
        }

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        console.error('Error polling for updates:', error);
        setError('Processing timed out. Please try again.');
        setAiProcessing(false);
      }
    };

    // Return cleanup function
    const cleanup = () => {
      abortController.abort();
      lastObjectsRef = [];
      completedItemsSet.clear();
    };

    setTimeout(poll, 2000);
    return cleanup;
  };

  // Handle legacy response format
  const handleLegacyResponse = (data: any, imageData: string) => {
    updateAiProgress({
      step: 'complete',
      message: 'Perfect! Your items are ready to add.',
      progress: 100,
      detectedObjects: data.objects.map((obj: any) => ({ ...obj, status: 'complete' })),
      room: data.room,
      totalValue: data.total_estimated_value_usd
    });

    const recognitionData = {
      objects: data.objects.map((obj: any) => ({
        name: obj.name,
        confidence: obj.confidence || 0.9,
        category: obj.category || inferCategory(obj.name),
        description: obj.description || '',
        estimated_cost_usd: obj.estimated_cost_usd,
        imageUrl: obj.imageUrl,
        originalCropImageUrl: obj.originalCropImageUrl,
        originalFullImageUrl: obj.originalFullImageUrl
      })),
      room: data.room,
      suggestedName: data.objects[0]?.name || '',
      suggestedCategory: data.objects[0]?.category || inferCategory(data.objects[0]?.name || ''),
      estimatedValue: data.total_estimated_value_usd
    };

    setAiProcessing(false);
    handleCameraCapture(imageData, recognitionData);
  };

  // Handle AI file input change
  const handleAiFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageData = await fixImageOrientation(file);
      await handleAiPhotoProcessing(file, imageData);
    } catch (error) {
      console.error('Error processing AI photo:', error);
      setError('Failed to process image. Please try again.');
    }
  };

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

    // Camera functionality integrated - no separate modal needed
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

  // Helper functions for AI processing UI
  const formatValue = (value: number): string => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'waiting': return <Package size={14} className="text-gray-400" />;
      case 'detecting': return <Eye size={14} className="text-blue-500 animate-pulse" />;
      case 'cropping': return <Scissors size={14} className="text-orange-500 animate-pulse" />;
      case 'enhancing': return <Palette size={14} className="text-purple-500 animate-pulse" />;
      case 'uploading': return <Upload size={14} className="text-indigo-500 animate-pulse" />;
      case 'complete': return <Sparkles size={14} className="text-green-500" />;
      case 'error': return <AlertCircle size={14} className="text-red-500" />;
      default: return <Package size={14} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'waiting': return 'border-gray-200 bg-gray-50';
      case 'detecting': return 'border-blue-200 bg-blue-50';
      case 'cropping': return 'border-orange-200 bg-orange-50';
      case 'enhancing': return 'border-purple-200 bg-purple-50';
      case 'uploading': return 'border-indigo-200 bg-indigo-50';
      case 'complete': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
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

  // Camera functionality can be integrated here later

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
          {aiProcessing ? (
            // AI Processing state
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 space-y-4 max-h-[28rem] overflow-y-auto overflow-x-hidden">
              <div className="text-center">
                <p className="font-bold text-xl mb-6 text-gray-900 flex items-center justify-center gap-2">
                  <Brain className="animate-pulse text-emerald-500" size={24} />
                  {aiProgress.message}
                </p>
              </div>

              {/* Room and Total Value */}
              {aiProgress.room && aiProgress.totalValue && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-emerald-600" />
                      <span className="font-semibold text-gray-900">{aiProgress.room}</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 font-bold">
                      <DollarSign size={16} />
                      <span>{formatValue(aiProgress.totalValue)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Found {aiProgress.detectedObjects?.length || 0} items worth approximately {formatValue(aiProgress.totalValue)}
                  </p>
                </div>
              )}

              {/* Detected Objects with Real-time Status */}
              {aiProgress.detectedObjects && aiProgress.detectedObjects.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Package size={16} />
                    Processing Items {aiProgress.currentObjectIndex !== undefined && `(${aiProgress.currentObjectIndex + 1}/${aiProgress.detectedObjects.length})`}
                  </h4>
                  {aiProgress.detectedObjects.map((obj, index) => (
                    <div key={index} className={`bg-white rounded-xl p-3 shadow-sm border transition-all duration-300 ${getStatusColor(obj.status)} ${aiProgress.currentObjectIndex === index ? 'ring-2 ring-emerald-300 ring-opacity-50' : ''
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          {getStatusIcon(obj.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{obj.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-600">{obj.category}</p>
                            {obj.detectionCount && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                {obj.detectionCount} found
                              </span>
                            )}
                            {obj.status && obj.status !== 'waiting' && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${obj.status === 'detecting' ? 'bg-blue-100 text-blue-700' :
                                obj.status === 'cropping' ? 'bg-orange-100 text-orange-700' :
                                  obj.status === 'enhancing' ? 'bg-purple-100 text-purple-700' :
                                    obj.status === 'uploading' ? 'bg-indigo-100 text-indigo-700' :
                                      obj.status === 'complete' ? 'bg-green-100 text-green-700' :
                                        obj.status === 'error' ? 'bg-red-100 text-red-700' :
                                          'bg-gray-100 text-gray-700'
                                }`}>
                                {obj.status === 'detecting' && 'Detecting...'}
                                {obj.status === 'cropping' && 'Cropping...'}
                                {obj.status === 'enhancing' && 'Enhancing...'}
                                {obj.status === 'uploading' && 'Uploading...'}
                                {obj.status === 'complete' && 'Complete ✓'}
                                {obj.status === 'error' && 'Error ✗'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600 text-sm">
                            ${obj.estimated_cost_usd ? obj.estimated_cost_usd.toFixed(0) : '0'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {aiProgress.step === 'complete' && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 text-center mt-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="text-white" size={24} />
                  </div>
                  <p className="font-bold text-emerald-700 mb-1">Perfect!</p>
                  <p className="text-sm text-emerald-600">Your items are ready to be added to your inventory</p>
                </div>
              )}

              {/* Original Image Display */}
              {aiProgress.originalFullImageUrl && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Camera size={14} />
                    Your photo being processed
                  </h4>
                  <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                    <img
                      src={aiProgress.originalFullImageUrl}
                      alt="Original photo being processed"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : isProcessing ? (
            // Processing state
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Processing...</h3>
              <p className="text-gray-600 text-sm">Getting your photo ready</p>
            </div>
          ) : error ? (
            // Error state
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Oops!</h3>
              <p className="text-gray-600 text-sm mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  fileInputRef.current?.click();
                }}
                className="bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition-colors flex items-center gap-2 mx-auto font-semibold"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          ) : !formData.imageUrl ? (
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
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-full font-bold hover:shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  <Camera size={20} />
                  Snap it
                  <Zap size={16} className="text-amber-300" />
                </button>

                <button
                  type="button"
                  onClick={() => aiFileInputRef.current?.click()}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-full font-bold hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  AI Snap
                  <Zap size={16} className="text-yellow-300" />
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

        {/* Hidden file input for camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Hidden file input for AI processing */}
        <input
          ref={aiFileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleAiFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};