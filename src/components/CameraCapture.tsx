import React, { useState, useEffect } from 'react';
import { Camera, X, Zap, Check, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { recognizeObjects } from '../utils/aiRecognition';

interface CameraCaptureProps {
  onCapture: (imageData: string, recognitionData: any) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const { videoRef, isStreaming, capturedImage, error, isLoading, startCamera, capturePhoto, resetCapture } = useCamera();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  useEffect(() => {
    // Auto-start camera when component mounts
    startCamera();
    
    // Cleanup on unmount
    return () => {
      // The cleanup will be handled by the useCamera hook
    };
  }, [startCamera]);

  const handleCapture = async () => {
    const imageData = capturePhoto();
    if (imageData) {
      setIsProcessing(true);
      
      try {
        // Show processing steps for better UX
        setProcessingStep('Analyzing image...');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setProcessingStep('Detecting objects...');
        await new Promise(resolve => setTimeout(resolve, 600));
        
        setProcessingStep('Identifying room...');
        await new Promise(resolve => setTimeout(resolve, 400));
        
        setProcessingStep('Almost done...');
        const recognitionData = await recognizeObjects(imageData);
        
        // Auto-proceed with the recognized data
        onCapture(imageData, recognitionData);
      } catch (error) {
        console.error('Recognition failed:', error);
        setIsProcessing(false);
        setProcessingStep('');
      }
    }
  };

  const handleRetake = () => {
    resetCapture();
    startCamera();
  };

  const handleUsePhoto = async () => {
    if (capturedImage) {
      setIsProcessing(true);
      
      try {
        setProcessingStep('Analyzing your photo...');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setProcessingStep('AI is working its magic...');
        await new Promise(resolve => setTimeout(resolve, 600));
        
        setProcessingStep('Detecting objects and room...');
        const recognitionData = await recognizeObjects(capturedImage);
        
        onCapture(capturedImage, recognitionData);
      } catch (error) {
        console.error('Recognition failed:', error);
        setIsProcessing(false);
        setProcessingStep('');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-600">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold">Tori's AI Camera</h3>
              <Sparkles className="text-yellow-300" size={16} />
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative">
            {error && (
              <div className="aspect-square bg-red-50 flex items-center justify-center p-6">
                <div className="text-center">
                  <AlertCircle className="mx-auto mb-3 text-red-500" size={48} />
                  <p className="text-red-700 font-medium mb-2">Camera Issue</p>
                  <p className="text-red-600 text-sm mb-4">{error}</p>
                  <div className="space-y-2">
                    <button
                      onClick={startCamera}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw size={16} />
                      Try Again
                    </button>
                    <p className="text-xs text-red-500">
                      Make sure to allow camera permissions when prompted
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isLoading && !error && (
              <div className="aspect-square bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="relative mb-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <div className="absolute inset-0 animate-ping">
                      <div className="rounded-full h-12 w-12 border border-indigo-300 opacity-30 mx-auto"></div>
                    </div>
                  </div>
                  <p className="text-indigo-700 font-medium">Starting Tori's camera...</p>
                  <p className="text-indigo-500 text-sm mt-1">AI magic loading ✨</p>
                  <div className="mt-3 flex justify-center">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isStreaming && !error && (
              <div className="relative aspect-square">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-4 border-white border-opacity-30 rounded-lg m-4 pointer-events-none" />
                <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  AI Ready
                </div>
                <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg text-sm text-center">
                  Point at any item - Tori will automatically detect it! 🤖✨
                </div>
              </div>
            )}

            {capturedImage && (
              <div className="relative aspect-square">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="relative mb-4">
                        <Zap className="animate-pulse mx-auto text-yellow-300" size={40} />
                        <div className="absolute inset-0 animate-ping">
                          <Zap className="mx-auto text-yellow-300 opacity-30" size={40} />
                        </div>
                      </div>
                      <p className="font-medium text-lg mb-1">{processingStep}</p>
                      <p className="text-sm opacity-80">Tori's AI is working its magic ✨</p>
                      <div className="mt-3 flex justify-center">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-yellow-300 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-yellow-300 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-yellow-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4">
            {isStreaming && !error && (
              <button
                onClick={handleCapture}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Camera size={20} />
                Capture & Auto-Detect
                <Sparkles size={16} className="text-yellow-300" />
              </button>
            )}

            {capturedImage && !isProcessing && (
              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleUsePhoto}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  Auto-Detect This!
                </button>
              </div>
            )}

            {error && (
              <div className="text-center text-sm text-gray-600 mt-2">
                <p>💡 <strong>Tip:</strong> Make sure to click "Allow" when your browser asks for camera permission</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};