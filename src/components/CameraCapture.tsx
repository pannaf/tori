import React, { useState, useRef } from 'react';
import { Camera, X, Zap, AlertCircle, RefreshCw, Sparkles, Package, DollarSign, MapPin, Search, Crop, Wand2 } from 'lucide-react';
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
  confidence?: number;
  status?: 'detecting' | 'cropping' | 'enhancing' | 'complete';
}

interface ProgressState {
  step: 'preparing' | 'analyzing' | 'detecting' | 'processing' | 'enhancing' | 'complete';
  message: string;
  progress: number;
  detectedObjects?: DetectedObject[];
  room?: string;
  totalValue?: number;
  currentlyProcessing?: string;
  processingDetails?: string[];
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
    progress: 0,
    processingDetails: []
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProgress = (newProgress: Partial<ProgressState>) => {
    setProgress(prev => ({ ...prev, ...newProgress }));
  };

  const addProcessingDetail = (detail: string) => {
    setProgress(prev => ({
      ...prev,
      processingDetails: [...(prev.processingDetails || []), detail].slice(-5) // Keep last 5 details
    }));
  };

  const simulateBackendProgress = async (data: any) => {
    // Simulate the backend processing steps we see in the logs
    const objects = data.objects.slice(0, 3);
    
    // Step 1: Show initial detection
    updateProgress({
      step: 'detecting',
      message: `Found ${objects.length} objects in your ${data.room}!`,
      progress: 40,
      detectedObjects: objects.map(obj => ({ ...obj, status: 'detecting' })),
      room: data.room,
      totalValue: data.total_estimated_value_usd,
      currentlyProcessing: 'Analyzing objects...'
    });

    addProcessingDetail(`🏠 Detected room: ${data.room}`);
    addProcessingDetail(`📦 Found ${objects.length} objects`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Process each object
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      
      updateProgress({
        step: 'processing',
        message: `Processing ${obj.name}...`,
        progress: 50 + (i * 15),
        currentlyProcessing: `Detecting instances of "${obj.name}"`,
        detectedObjects: objects.map((o, idx) => ({
          ...o,
          status: idx < i ? 'complete' : idx === i ? 'cropping' : 'detecting'
        }))
      });

      addProcessingDetail(`🔍 Detecting "${obj.name}"`);
      await new Promise(resolve => setTimeout(resolve, 800));

      addProcessingDetail(`✂️ Cropping ${obj.name} image`);
      await new Promise(resolve => setTimeout(resolve, 600));

      updateProgress({
        currentlyProcessing: `Enhancing ${obj.name} photo`,
        detectedObjects: objects.map((o, idx) => ({
          ...o,
          status: idx < i ? 'complete' : idx === i ? 'enhancing' : 'detecting'
        }))
      });

      addProcessingDetail(`✨ Enhancing ${obj.name} with AI`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      addProcessingDetail(`📤 Uploading enhanced ${obj.name}`);
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    // Step 3: Final enhancement
    updateProgress({
      step: 'enhancing',
      message: 'Finalizing your beautiful photos...',
      progress: 90,
      currentlyProcessing: 'Applying final touches',
      detectedObjects: objects.map(obj => ({ ...obj, status: 'complete' }))
    });

    addProcessingDetail(`🎨 Applying final enhancements`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Complete
    updateProgress({
      step: 'complete',
      message: 'Perfect! Your items are ready.',
      progress: 100,
      currentlyProcessing: 'All done!',
      detectedObjects: objects.map(obj => ({ ...obj, status: 'complete' }))
    });

    addProcessingDetail(`✅ All items processed successfully`);
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setIsProcessing(true);
      
      updateProgress({
        step: 'preparing',
        message: 'Preparing your photo...',
        progress: 10,
        processingDetails: []
      });

      addProcessingDetail('📸 Processing uploaded image');

      // Fix image orientation
      updateProgress({
        step: 'preparing',
        message: 'Correcting image orientation...',
        progress: 20
      });

      addProcessingDetail('🔄 Correcting image orientation');
      const imageData = await fixImageOrientation(file);

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
          message: 'Tori is analyzing your photo with AI...',
          progress: 30,
          currentlyProcessing: 'Sending to AI analysis...'
        });

        addProcessingDetail('🤖 Sending to GPT-4o-mini for analysis');

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

        addProcessingDetail('📊 Received AI analysis results');

        // Parse the response
        const data = await apiResponse.json();

        // Start the simulated backend progress
        await simulateBackendProgress(data);

        // Transform the analysis data to match the expected format
        const recognitionData = {
          objects: data.objects.map((obj: any) => ({
            name: obj.name,
            confidence: obj.confidence || 0.9,
            category: obj.category || inferCategory(obj.name),
            description: obj.description || '',
            estimated_cost_usd: obj.estimated_cost_usd,
            imageUrl: obj.imageUrl,
            originalCropImageUrl: obj.originalCropImageUrl
          })),
          room: data.room,
          suggestedName: data.objects[0]?.name || '',
          suggestedCategory: data.objects[0]?.category || inferCategory(data.objects[0]?.name || ''),
          estimatedValue: data.total_estimated_value_usd
        };

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
      case 'detecting': return <Search size={14} className="text-blue-500" />;
      case 'cropping': return <Crop size={14} className="text-orange-500" />;
      case 'enhancing': return <Wand2 size={14} className="text-purple-500" />;
      case 'complete': return <Sparkles size={14} className="text-green-500" />;
      default: return <Package size={14} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'detecting': return 'border-blue-200 bg-blue-50';
      case 'cropping': return 'border-orange-200 bg-orange-50';
      case 'enhancing': return 'border-purple-200 bg-purple-50';
      case 'complete': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
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

          <div className="relative">
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
              <div className="min-h-[500px] bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
                <div className="text-center mb-6">
                  <div className="relative mb-4">
                    <Zap className="animate-pulse mx-auto text-amber-400" size={48} />
                    <div className="absolute inset-0 animate-ping">
                      <Zap className="mx-auto text-amber-400 opacity-30" size={48} />
                    </div>
                  </div>
                  <p className="font-bold text-xl mb-2 text-gray-900">{progress.message}</p>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                    <div 
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  
                  {progress.currentlyProcessing && (
                    <p className="text-sm text-indigo-600 font-medium mb-4">
                      {progress.currentlyProcessing}
                    </p>
                  )}
                </div>

                {/* Processing Details Log */}
                {progress.processingDetails && progress.processingDetails.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Zap size={14} />
                      Processing Log
                    </h4>
                    <div className="space-y-2 max-h-24 overflow-y-auto">
                      {progress.processingDetails.map((detail, index) => (
                        <div key={index} className="text-xs text-gray-600 font-mono bg-gray-50 rounded px-2 py-1">
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Room and Total Value */}
                {progress.room && progress.totalValue && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-200 mb-4">
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

                {/* Detected Objects with Status */}
                {progress.detectedObjects && progress.detectedObjects.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Package size={16} />
                      Detected Items
                    </h4>
                    {progress.detectedObjects.map((obj, index) => (
                      <div key={index} className={`bg-white rounded-xl p-3 shadow-sm border transition-all duration-300 ${getStatusColor(obj.status)}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            {getStatusIcon(obj.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{obj.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-600">{obj.category}</p>
                              {obj.status && obj.status !== 'detecting' && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white bg-opacity-50 font-medium">
                                  {obj.status === 'cropping' && 'Cropping...'}
                                  {obj.status === 'enhancing' && 'Enhancing...'}
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

                {/* Loading animation for early stages */}
                {(!progress.detectedObjects || progress.detectedObjects.length === 0) && progress.step !== 'complete' && (
                  <div className="flex justify-center">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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