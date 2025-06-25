import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Zap, AlertCircle, RefreshCw, Sparkles, Package, DollarSign, MapPin, Search, Crop, Wand2, Upload, Brain, Eye, Scissors, Palette } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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

// Global error handlers to prevent page reloads
let errorHandlersAdded = false;
const addGlobalErrorHandlers = () => {
  if (errorHandlersAdded) return;
  errorHandlersAdded = true;

  // Prevent unhandled promise rejections from causing reloads
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent reload
  });

  // Prevent general errors from causing reloads
  window.addEventListener('error', (event) => {
    console.error('🚨 Global error:', event.error);
    event.preventDefault(); // Prevent reload
  });

  console.log('🛡️ Global error handlers added to prevent reloads');
};

interface CameraCaptureProps {
  onCapture: (imageData: string, recognitionData: any) => void;
  onClose: () => void;
}

interface DetectedObject {
  name: string;
  category: string;
  description: string;
  estimated_cost_usd: number;
  imageUrl?: string;
  originalCropImageUrl?: string;
  originalFullImageUrl?: string;
  confidence?: number;
  status?: 'waiting' | 'detecting' | 'cropping' | 'enhancing' | 'uploading' | 'complete';
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

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    step: 'preparing',
    message: '',
    progress: 0
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingCleanupRef = useRef<(() => void) | null>(null);

  // Add global error handlers on mount
  useEffect(() => {
    addGlobalErrorHandlers();

    if (isLowMemoryDevice()) {
      console.log('📱 Low memory device detected - enabling memory optimizations');
    }

    let cameraTriggered = false;
    let photoTaken = false;

    // Auto-trigger camera on mount - open camera immediately
    const timer = setTimeout(() => {
      cameraTriggered = true;
      fileInputRef.current?.click();
    }, 100);

    // When modal comes back into focus, close it immediately if no photo was taken
    const handleVisibilityChange = () => {
      if (!document.hidden && cameraTriggered && !photoTaken && !isProcessing) {
        // Give mobile browsers more time to process
        setTimeout(() => {
          if (!photoTaken && !isProcessing) {
            console.log('Camera cancelled - returning to AddItemModal');
            onClose();
          }
        }, 500);
      }
    };

    const handleWindowFocus = () => {
      if (cameraTriggered && !photoTaken && !isProcessing) {
        setTimeout(() => {
          if (!photoTaken && !isProcessing) {
            console.log('Camera cancelled via focus - returning to AddItemModal');
            onClose();
          }
        }, 500);
      }
    };

    // Mobile-specific: detect when page becomes active again
    const handlePageShow = () => {
      if (cameraTriggered && !photoTaken && !isProcessing) {
        setTimeout(() => {
          if (!photoTaken && !isProcessing) {
            console.log('Camera cancelled via pageshow - returning to AddItemModal');
            onClose();
          }
        }, 700); // Even longer timeout for mobile
      }
    };



    // Track when photo is actually taken
    const handlePhotoTaken = () => {
      photoTaken = true;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pageshow', handlePageShow); // Mobile browsers

    if (fileInputRef.current) {
      fileInputRef.current.addEventListener('change', handlePhotoTaken);
    }

    // Cleanup polling on unmount
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pageshow', handlePageShow);
      if (fileInputRef.current) {
        fileInputRef.current.removeEventListener('change', handlePhotoTaken);
      }
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
        pollingCleanupRef.current = null;
      }
    };
  }, [isProcessing, onClose]);

  const updateProgress = (newProgress: Partial<ProgressState>) => {
    setProgress(prev => ({ ...prev, ...newProgress }));
  };

  const handleFileChange = async (file: File, imageData: string) => {
    try {
      setError('');
      setIsProcessing(true);

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
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: { session } } = await supabase.auth.getSession();

          if (user && session) {
            formData.append('userId', user.id);
            formData.append('authToken', session.access_token);
          }
        }

        updateProgress({
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
          updateProgress({
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
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error handling file:', error);
      setError('Failed to process image. Please try again.');
      setIsProcessing(false);
    }
  };

  // Poll for background processing updates with memory optimization
  const pollForProcessingUpdates = (processingId: string, imageData: string) => {
    const maxAttempts = isLowMemoryDevice() ? 30 : 60; // Shorter timeout for low memory devices
    let attempts = 0;
    let completedItems: Set<number> = new Set(); // Use Set for better performance
    let hasStartedStreaming = false;
    let lastObjectsRef: any[] = []; // Reuse object references to prevent memory accumulation
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

        // Reuse existing object references when possible to prevent memory accumulation
        const currentObjects = statusData.objects.map((newObj: any, index: number) => {
          const existingObj = lastObjectsRef[index];

          // Only create new object if status actually changed
          if (existingObj &&
            existingObj.status === newObj.status &&
            existingObj.name === newObj.name) {
            return existingObj; // Reuse existing object reference
          }

          // Create new object only when needed, with memory-conscious image handling
          return {
            ...newObj,
            status: newObj.status === 'complete' ? 'complete' :
              newObj.status === 'processing' ? 'processing' :
                newObj.status === 'error' ? 'error' :
                  newObj.status === 'no_detection' ? 'no_detection' : 'waiting',
            // On low memory devices, don't store multiple image URLs
            imageUrl: isLowMemoryDevice() ? undefined : newObj.imageUrl,
            originalCropImageUrl: isLowMemoryDevice() ? undefined : newObj.originalCropImageUrl,
            originalFullImageUrl: isLowMemoryDevice() ? imageData : newObj.originalFullImageUrl // Use compressed original
          };
        });

        // Update reference for next iteration
        lastObjectsRef = currentObjects;

        // Update progress with current status
        const progressPercentage = Math.min(90, 50 + (statusData.completedCount / statusData.totalCount) * 40);

        updateProgress({
          step: statusData.status === 'complete' ? 'complete' : 'processing',
          message: statusData.status === 'complete'
            ? 'Perfect! Your items are ready to add.'
            : `Processing ${statusData.completedCount}/${statusData.totalCount} items...`,
          progress: progressPercentage,
          detectedObjects: currentObjects,
          room: progress.room,
          totalValue: progress.totalValue
        });

        // Check for newly completed items (including errors as "completed" so we can move on)
        const newlyCompletedIndices = statusData.objects
          .map((obj: any, index: number) =>
            ((obj.status === 'complete' || obj.status === 'no_detection' || obj.status === 'error') && !completedItems.has(index)) ? index : -1
          )
          .filter((index: number) => index !== -1);

        // Add to completed set
        newlyCompletedIndices.forEach((index: number) => completedItems.add(index));

        // Start streaming when first item is ready
        if (completedItems.size >= 1 && !hasStartedStreaming) {
          hasStartedStreaming = true;
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
            room: progress.room,
            suggestedName: statusData.objects[0]?.name || '',
            suggestedCategory: statusData.objects[0]?.category || inferCategory(statusData.objects[0]?.name || ''),
            estimatedValue: progress.totalValue,
            isStreaming: true,
            processingId: processingId
          };

          onCapture(imageData, recognitionData);
        }

        // Check if complete
        if (statusData.status === 'complete') {
          abortController.abort(); // Clean up

          const finalRecognitionData = {
            objects: currentObjects
              .filter((obj: any) => obj.status === 'complete')
              .map((obj: any) => ({
                name: obj.name,
                confidence: obj.confidence || 0.9,
                category: obj.category || inferCategory(obj.name),
                description: obj.description || '',
                estimated_cost_usd: obj.estimated_cost_usd,
                imageUrl: obj.imageUrl,
                originalCropImageUrl: obj.originalCropImageUrl,
                originalFullImageUrl: obj.originalFullImageUrl || imageData,
                status: obj.status
              })),
            room: progress.room,
            suggestedName: statusData.objects[0]?.name || '',
            suggestedCategory: statusData.objects[0]?.category || inferCategory(statusData.objects[0]?.name || ''),
            estimatedValue: progress.totalValue
          };

          onCapture(imageData, finalRecognitionData);
          setIsProcessing(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          // Adaptive polling interval based on device capability
          const pollInterval = isLowMemoryDevice() ? 3000 : 1000;
          setTimeout(poll, pollInterval);
        } else {
          abortController.abort();
          throw new Error('Processing timeout');
        }

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Polling aborted');
          return;
        }

        console.error('Error polling for updates:', error);
        setError('Processing timed out. Please try again.');
        setIsProcessing(false);
      }
    };

    // Return cleanup function immediately, start polling after delay
    const cleanup = () => {
      abortController.abort();
      lastObjectsRef = [];
      completedItems.clear();
    };

    // Start polling with initial delay
    setTimeout(poll, 2000);

    return cleanup;
  };

  // Handle legacy response format (fallback)
  const handleLegacyResponse = (data: any, imageData: string) => {
    updateProgress({
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

    onCapture(imageData, recognitionData);
    setIsProcessing(false);
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
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-indigo-600 to-purple-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
                <Zap className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-white font-bold">Tori's AI Camera</h3>
                <p className="text-white text-opacity-80 text-sm">Smart photo recognition</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-xl p-2 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative overflow-y-auto overflow-x-hidden">
            {error && (
              <div className="aspect-square bg-red-50 flex items-center justify-center p-8">
                <div className="text-center">
                  <AlertCircle className="mx-auto mb-4 text-red-500" size={56} />
                  <p className="text-red-700 font-semibold mb-2">Camera Issue</p>
                  <p className="text-red-600 text-sm mb-6">{error}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition-colors flex items-center gap-2 mx-auto font-semibold"
                  >
                    <RefreshCw size={16} />
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {!error && !isProcessing && (
              <div className="aspect-square bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-6 modal-content-area">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center mb-4 mx-auto">
                    <Camera size={32} className="text-white" />
                  </div>
                  <h4 className="text-indigo-700 font-bold text-lg mb-2">Ready to snap?</h4>
                  <p className="text-indigo-600 text-sm leading-relaxed mb-6">
                    You sure you don't want to grab<br />an item real quick? ✨
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-full font-bold hover:shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.02]"
                    >
                      Let's do it! 📸
                    </button>

                    <button
                      onClick={onClose}
                      className="w-full bg-gray-100 text-gray-600 py-3 rounded-full font-medium hover:bg-gray-200 transition-colors"
                    >
                      Not right now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 space-y-4 max-h-[28rem] overflow-y-auto overflow-x-hidden">
                <div className="text-center">
                  <p className="font-bold text-xl mb-6 text-gray-900 flex items-center justify-center gap-2">
                    <Zap className="animate-pulse text-amber-400" size={24} />
                    {progress.message}
                  </p>
                </div>

                {/* Room and Total Value */}
                {progress.room && progress.totalValue && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-indigo-600" />
                        <span className="font-semibold text-gray-900">{progress.room}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600 font-bold">
                        <DollarSign size={16} />
                        <span>{formatValue(progress.totalValue)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Found {progress.detectedObjects?.length || 0} items worth approximately {formatValue(progress.totalValue)}
                    </p>
                  </div>
                )}

                {/* Detected Objects with Real-time Status */}
                {progress.detectedObjects && progress.detectedObjects.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Package size={16} />
                      Processing Items {progress.currentObjectIndex !== undefined && `(${progress.currentObjectIndex + 1}/${progress.detectedObjects.length})`}
                    </h4>
                    {progress.detectedObjects.map((obj, index) => (
                      <div key={index} className={`bg-white rounded-xl p-3 shadow-sm border transition-all duration-300 ${getStatusColor(obj.status)} ${progress.currentObjectIndex === index ? 'ring-2 ring-indigo-300 ring-opacity-50' : ''
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
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
                                          'bg-gray-100 text-gray-700'
                                  }`}>
                                  {obj.status === 'detecting' && 'Detecting...'}
                                  {obj.status === 'cropping' && 'Cropping...'}
                                  {obj.status === 'enhancing' && 'Enhancing...'}
                                  {obj.status === 'uploading' && 'Uploading...'}
                                  {obj.status === 'complete' && 'Complete ✓'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-600 text-sm">
                              ${obj.estimated_cost_usd.toFixed(0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {progress.step === 'complete' && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 text-center mt-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="text-white" size={24} />
                    </div>
                    <p className="font-bold text-emerald-700 mb-1">Perfect!</p>
                    <p className="text-sm text-emerald-600">Your items are ready to be added to your inventory</p>
                  </div>
                )}

                {/* Original Image Display - Moved to bottom */}
                {progress.originalFullImageUrl && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Camera size={14} />
                      Your home captured by Tori
                    </h4>
                    <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                      <img
                        src={progress.originalFullImageUrl}
                        alt="Original photo being processed"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                fixImageOrientation(file).then((imageData) => handleFileChange(file, imageData));
              }
            }}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};