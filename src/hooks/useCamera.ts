import { useState, useRef, useCallback } from 'react';

export const useCamera = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Request camera permission with fallback constraints
      let stream: MediaStream;
      
      try {
        // Try with back camera first (mobile)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          }
        });
      } catch (backCameraError) {
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          }
        });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'));
            return;
          }
          
          const video = videoRef.current;
          
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            setIsStreaming(true);
            setIsLoading(false);
            resolve();
          };
          
          const onError = (e: Event) => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error('Video failed to load'));
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            if (!isStreaming) {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              reject(new Error('Camera initialization timeout'));
            }
          }, 10000);
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsLoading(false);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permissions in your browser settings and refresh the page.');
        } else if (error.name === 'NotFoundError') {
          setError('No camera found. Please make sure your device has a camera.');
        } else if (error.name === 'NotReadableError') {
          setError('Camera is being used by another application. Please close other apps using the camera.');
        } else {
          setError(`Camera error: ${error.message}`);
        }
      } else {
        setError('Failed to access camera. Please try again.');
      }
    }
  }, [isStreaming]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && isStreaming) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      if (context && canvas.width > 0 && canvas.height > 0) {
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
        return imageData;
      }
    }
    return null;
  }, [isStreaming, stopCamera]);

  const resetCapture = useCallback(() => {
    setCapturedImage(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    videoRef,
    isStreaming,
    capturedImage,
    error,
    isLoading,
    startCamera,
    stopCamera,
    capturePhoto,
    resetCapture,
  };
};