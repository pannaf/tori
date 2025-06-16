import React, { useState, useRef } from 'react';
import { Camera, X, Zap, AlertCircle, RefreshCw, Sparkles, Package, DollarSign, MapPin, Search, Crop, Wand2, Upload, Brain, Eye, Scissors, Palette } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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

// Function to fix image orientation using createImageBitmap
const fixImageOrientation = async (file: File): Promise<string> => {
  try {
    // Use createImageBitmap with imageOrientation: 'from-image' to auto-correct orientation
    const imageBitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image'
    });

    // Create canvas and draw the correctly oriented image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;

    ctx?.drawImage(imageBitmap, 0, 0);

    // Clean up the bitmap
    imageBitmap.close();

    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.warn('createImageBitmap not supported or failed, falling back to original image');
    // Fallback: return original image as base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
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

  const updateProgress = (newProgress: Partial<ProgressState>) => {
    setProgress(prev => ({ ...prev, ...newProgress }));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setIsProcessing(true);

      updateProgress({
        step: 'preparing',
        message: 'Tori is working  magic...',
        progress: 5
      });

      const imageData = await fixImageOrientation(file);

      // Set the original image URL immediately so it shows during processing
      updateProgress({
        step: 'preparing',
        message: 'Tori is working  magic...',
        progress: 20,
        originalFullImageUrl: imageData // Set the base64 image data to show during processing
      });

      try {
        // Create form data for the API
        const formData = new FormData();

        // Convert corrected image back to blob for upload
        const response = await fetch(imageData);
        const blob = await response.blob();
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
          message: 'Tori is working some magic...',
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

        // Parse the response
        const data = await apiResponse.json();

        // Update progress but preserve the original full image URL that was set earlier
        updateProgress({
          step: 'complete',
          message: 'Perfect! Your items are ready to add.',
          progress: 100,
          detectedObjects: data.objects.map((obj: any) => ({ ...obj, status: 'complete' })),
          room: data.room,
          totalValue: data.total_estimated_value_usd
        });

        // Transform the analysis data to match the expected format
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

        // Go directly to the next screen
        onCapture(imageData, recognitionData);
        setIsProcessing(false);
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
              <div className="aspect-square bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-8">
                <div className="text-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center mb-6 mx-auto hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105"
                  >
                    <Camera size={36} className="text-white" />
                  </button>
                  <h4 className="text-indigo-700 font-bold text-lg mb-2">Take a Photo</h4>
                  <p className="text-indigo-600 text-sm leading-relaxed">Point at any item and Tori will<br />detect it with AI magic ✨</p>
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
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};