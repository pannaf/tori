import React, { useState, useRef } from 'react';
import { Camera, X, Zap, AlertCircle, RefreshCw } from 'lucide-react';
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

// Function to get EXIF orientation from image
const getOrientation = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const view = new DataView(e.target?.result as ArrayBuffer);
      if (view.getUint16(0, false) !== 0xFFD8) {
        resolve(-2); // Not a JPEG
        return;
      }
      const length = view.byteLength;
      let offset = 2;
      while (offset < length) {
        if (view.getUint16(offset + 2, false) <= 8) {
          resolve(-1); // Invalid EXIF
          return;
        }
        const marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xFFE1) {
          if (view.getUint32(offset + 4, false) !== 0x45786966) {
            resolve(-1); // Invalid EXIF
            return;
          }
          const little = view.getUint16(offset + 10, false) === 0x4949;
          offset += view.getUint16(offset + 2, false);
          if (offset > length) {
            resolve(-1); // Invalid EXIF
            return;
          }
          const tags = view.getUint16(offset, little);
          offset += 2;
          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + (i * 12), little) === 0x0112) {
              const orientation = view.getUint16(offset + (i * 12) + 8, little);
              resolve(orientation);
              return;
            }
          }
        } else if ((marker & 0xFF00) !== 0xFF00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }
      resolve(-1); // No orientation found
    };
    reader.readAsArrayBuffer(file);
  });
};

// Function to rotate image based on EXIF orientation
const rotateImage = (imageData: string, orientation: number): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Set canvas dimensions based on orientation
      if (orientation > 4) {
        canvas.width = height;
        canvas.height = width;
      } else {
        canvas.width = width;
        canvas.height = height;
      }

      // Apply rotation based on EXIF orientation
      switch (orientation) {
        case 2:
          // Horizontal flip
          ctx?.scale(-1, 1);
          ctx?.translate(-width, 0);
          break;
        case 3:
          // 180° rotation
          ctx?.translate(width, height);
          ctx?.rotate(Math.PI);
          break;
        case 4:
          // Vertical flip
          ctx?.scale(1, -1);
          ctx?.translate(0, -height);
          break;
        case 5:
          // 90° CCW + horizontal flip
          ctx?.rotate(0.5 * Math.PI);
          ctx?.scale(1, -1);
          break;
        case 6:
          // 90° CW rotation
          ctx?.rotate(0.5 * Math.PI);
          ctx?.translate(0, -height);
          break;
        case 7:
          // 90° CW + horizontal flip
          ctx?.rotate(0.5 * Math.PI);
          ctx?.translate(width, -height);
          ctx?.scale(-1, 1);
          break;
        case 8:
          // 90° CCW rotation
          ctx?.rotate(-0.5 * Math.PI);
          ctx?.translate(-width, 0);
          break;
        default:
          // No rotation needed
          break;
      }

      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    img.src = imageData;
  });
};

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setIsProcessing(true);
      setProcessingStep('Preparing image...');

      // Get EXIF orientation
      const orientation = await getOrientation(file);

      // Convert file to base64 for preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        let imageData = e.target?.result as string;

        // Rotate image if needed based on EXIF orientation
        if (orientation > 1) {
          setProcessingStep('Correcting image orientation...');
          imageData = await rotateImage(imageData, orientation);
        }

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

          setProcessingStep('Analyzing with AI... (this may take up to 2 minutes)');

          // Create AbortController for timeout handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

          const apiResponse = await fetch(`${env.API_URL}/api/analyze-image`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!apiResponse.ok) {
            throw new Error('Failed to analyze image');
          }

          const data = await apiResponse.json();

          // Transform the analysis data to match the expected format
          const recognitionData = {
            objects: data.objects.map((obj: any) => ({
              name: obj.name,
              confidence: obj.confidence || 0.9,
              category: obj.category || inferCategory(obj.name),
              description: obj.description || '',
              estimated_cost_usd: obj.estimated_cost_usd,
              imageUrl: obj.imageUrl
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
          setProcessingStep('');
        }
      };

      reader.onerror = () => {
        setError('Failed to read image file. Please try again.');
        setIsProcessing(false);
      };

      reader.readAsDataURL(file);
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
              <div className="aspect-square bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="relative mb-6">
                    <Zap className="animate-pulse mx-auto text-amber-400" size={48} />
                    <div className="absolute inset-0 animate-ping">
                      <Zap className="mx-auto text-amber-400 opacity-30" size={48} />
                    </div>
                  </div>
                  <p className="font-bold text-xl mb-2 text-gray-900">{processingStep}</p>
                  <p className="text-sm text-gray-600 mb-4">Tori's AI is working its magic ✨</p>
                  <div className="flex justify-center">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
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