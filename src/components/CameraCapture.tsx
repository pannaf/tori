import React, { useState, useRef } from 'react';
import { Camera, X, Zap, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string, recognitionData: any) => void;
  onClose: () => void;
}

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

      // Convert file to base64 for preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;

        try {
          // Create form data for the API
          const formData = new FormData();
          formData.append('image', file);

          setProcessingStep('Analyzing with AI...');
          const response = await fetch('http://localhost:3000/api/analyze-image', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to analyze image');
          }

          const data = await response.json();

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
          setError('Failed to analyze image. Please try again.');
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
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600">
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
              <div className="aspect-square bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex items-center justify-center p-8">
                <div className="text-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 mx-auto hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105"
                  >
                    <Camera size={36} className="text-white" />
                  </button>
                  <h4 className="text-violet-700 font-bold text-lg mb-2">Take a Photo</h4>
                  <p className="text-violet-600 text-sm leading-relaxed">Point at any item and Tori will<br />detect it with AI magic ✨</p>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="aspect-square bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex items-center justify-center">
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