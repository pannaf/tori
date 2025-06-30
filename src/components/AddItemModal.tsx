import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Plus, Check, Zap, Wrench, Calendar, Clock, Package, AlertCircle, RefreshCw, Sparkles, DollarSign, MapPin, Eye, Scissors, Palette, Upload, Brain } from 'lucide-react';
import { Room, Category, InventoryItem } from '../types/inventory';

import { env } from '../config/env';
import { useMaintenanceDB } from '../hooks/useMaintenanceDB';
import { supabase } from '../config/supabase';

// Custom keyframe animations
const animations = `
  @keyframes morph {
    0%, 100% { 
      border-radius: 1.8rem 2.2rem 1.6rem 2rem;
      transform: scale(1) rotate(0deg);
    }
    16% { 
      border-radius: 3rem 1.2rem 2.5rem 1.8rem;
      transform: scale(0.8) rotate(1.5deg);
    }
    32% { 
      border-radius: 1.4rem 2.8rem 1.8rem 2.2rem;
      transform: scale(1.12) rotate(-2deg);
    }
    48% { 
      border-radius: 2.6rem 1.6rem 3rem 1.5rem;
      transform: scale(0.75) rotate(1deg);
    }
    64% { 
      border-radius: 1.7rem 2.5rem 1.3rem 2.8rem;
      transform: scale(1.1) rotate(-1.5deg);
    }
    80% { 
      border-radius: 2.4rem 1.8rem 2.7rem 1.4rem;
      transform: scale(0.85) rotate(2deg);
    }
  }

  @keyframes float {
    0%, 100% { 
      transform: translateY(0px);
    }
    50% { 
      transform: translateY(-4px);
    }
  }
`;

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
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
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
    condition: '' as '' | 'excellent' | 'good' | 'fair' | 'poor',
    tags: [] as string[],
    imageUrl: ''
  });

  const [imageData, setImageData] = useState<string>('');
  const [aiDetected, setAiDetected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<any[]>([]);
  const [detectedRoom, setDetectedRoom] = useState('');
  const [originalDetectedRoom, setOriginalDetectedRoom] = useState(''); // Store the original room for persistence
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
  const maintenanceRef = useRef<HTMLDivElement>(null);

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
    console.log('🏠 findMatchingRoom called with:', detectedRoom);
    if (!detectedRoom || !rooms.length) {
      console.log('🏠 No detected room or no rooms available, returning empty string');
      return '';
    }

    const detectedLower = detectedRoom.toLowerCase().trim();
    console.log('🏠 Searching for room match with:', detectedLower);

    // First try exact match
    const exactMatch = rooms.find(room => room.name.toLowerCase() === detectedLower);
    if (exactMatch) {
      console.log('🏠 Found exact match:', exactMatch.name);
      return exactMatch.name;
    }

    // Then try partial match
    const partialMatch = rooms.find(room =>
      room.name.toLowerCase().includes(detectedLower) ||
      detectedLower.includes(room.name.toLowerCase())
    );
    if (partialMatch) {
      console.log('🏠 Found partial match:', partialMatch.name);
      return partialMatch.name;
    }

    // If no match found, return the detected room anyway (user can change it)
    console.log('🏠 No match found, returning original:', detectedRoom);
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
    'Kitchenware': [
      { title: 'Deep clean', description: 'Deep clean and sanitize', intervalType: 'weeks', intervalValue: 2, priority: 'medium' },
      { title: 'Sharpen knives', description: 'Sharpen and maintain cutting tools', intervalType: 'months', intervalValue: 3, priority: 'medium' },
    ],
    'Tools': [
      { title: 'Sharpen blades', description: 'Sharpen cutting edges and blades', intervalType: 'months', intervalValue: 6, priority: 'medium' },
      { title: 'Oil and lubricate', description: 'Oil moving parts and check for rust', intervalType: 'months', intervalValue: 3, priority: 'medium' },
    ],
    'Sports & Recreation': [
      { title: 'Equipment check', description: 'Inspect for wear and safety', intervalType: 'months', intervalValue: 3, priority: 'medium' },
      { title: 'Clean and sanitize', description: 'Clean and disinfect equipment', intervalType: 'weeks', intervalValue: 1, priority: 'medium' },
    ],
    'Clothing & Accessories': [
      { title: 'Seasonal storage', description: 'Clean and store seasonal items', intervalType: 'months', intervalValue: 6, priority: 'low' },
      { title: 'Condition check', description: 'Check for repairs needed', intervalType: 'months', intervalValue: 3, priority: 'low' },
    ],
    'Personal Care': [
      { title: 'Expiration check', description: 'Check expiration dates', intervalType: 'months', intervalValue: 3, priority: 'medium' },
      { title: 'Inventory check', description: 'Check stock levels', intervalType: 'months', intervalValue: 1, priority: 'low' },
    ],
    'Collectibles & Mementos': [
      { title: 'Condition check', description: 'Check for damage or deterioration', intervalType: 'months', intervalValue: 6, priority: 'low' },
      { title: 'Climate control', description: 'Check storage conditions', intervalType: 'months', intervalValue: 3, priority: 'medium' },
    ],
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      room: '',
      description: '',
      estimatedValue: '',
      condition: '',
      tags: [],
      imageUrl: ''
    });
    setImageData('');
    setAiDetected(false);
    setIsProcessing(false);
    setError(null);
    setDetectedObjects([]);
    setDetectedRoom('');
    setOriginalDetectedRoom('');
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
            condition: obj.condition || 'good',
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
            const preservedRoom = formData.room || findMatchingRoom(detectedRoom) || detectedRoom;
            console.log('🔄 Polling update - preserving room:', preservedRoom);
            console.log('🔄 Current detectedRoom:', detectedRoom);
            console.log('🔄 Previous form room:', formData.room);

            setFormData(prev => ({
              ...prev,
              imageUrl: updatedCurrentItem.imageUrl || imageData,
              room: preservedRoom,
              name: updatedCurrentItem.name || '',
              category: updatedCurrentItem.category || '',
              description: updatedCurrentItem.description || '',
              estimatedValue: updatedCurrentItem.estimatedValue?.toString() || '',
              condition: updatedCurrentItem.condition || 'good',
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
      'Electronics': ['phone', 'laptop', 'computer', 'tv', 'tablet', 'camera', 'speaker', 'headphone', 'charger', 'cable', 'router', 'monitor'],
      'Appliances': ['washer', 'dryer', 'refrigerator', 'fridge', 'microwave', 'oven', 'dishwasher', 'vacuum', 'blender', 'toaster', 'coffee maker'],
      'Furniture': ['chair', 'table', 'desk', 'sofa', 'bed', 'shelf', 'cabinet', 'dresser', 'nightstand', 'bookshelf'],
      'Kitchenware': ['pan', 'pot', 'knife', 'plate', 'cup', 'mug', 'utensil', 'bowl', 'cutting board', 'spatula', 'whisk'],
      'Tools': ['hammer', 'screwdriver', 'drill', 'saw', 'wrench', 'pliers', 'level', 'tape measure'],
      'Sports & Recreation': ['ball', 'racket', 'bike', 'weight', 'mat', 'dumbbell', 'treadmill', 'yoga', 'exercise', 'game', 'sport'],
      'Books & Media': ['book', 'magazine', 'journal', 'notebook', 'dvd', 'cd', 'vinyl', 'record'],
      'Clothing & Accessories': ['shirt', 'pants', 'dress', 'shoe', 'jacket', 'hat', 'socks', 'underwear', 'sweater', 'watch', 'jewelry', 'belt'],
      'Decorations': ['plant', 'frame', 'vase', 'candle', 'art', 'painting', 'sculpture', 'mirror', 'decoration'],
      'Personal Care': ['shampoo', 'soap', 'lotion', 'perfume', 'makeup', 'skincare', 'toothbrush', 'medicine'],
      'Collectibles & Mementos': ['collectible', 'memento', 'souvenir', 'antique', 'vintage', 'coin', 'stamp', 'card', 'figurine']
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

        // Random AI analysis messages for variety
        const analysisMessages = [
          'Woah! That looks great. Give me a moment to catalog.',
          'Nice! Let me take a closer look at what you\'ve got here.',
          'Ooh, interesting! My detective mode is activating...',
          'Hold up, this looks promising. Let me analyze everything.',
          'Sweet! Give me a sec to identify all these goodies.',
          'Looking good! Time for me to work some magic.',
          'Awesome shot! Let me catalog what I see here.',
          'Perfect! I\'m scanning for all the details now.',
          'Great photo! Give me a moment to break this down.',
          'Nice collection! Let me see what treasures are hiding.',
          'Excellent! I\'m putting on my detective hat...',
          'Fantastic! Time to catalog these beauties.',
          'Impressive! Let me identify everything in frame.',
          'Cool stuff! My analysis mode is engaged.',
          'Beautiful! Give me a moment to process all this.',
          'Wonderful! Let me catalog each item I spot.',
          'Amazing! I\'m getting to work on this inventory.',
          'Spectacular! Time to identify all your items.',
          'Brilliant! Let me analyze what you\'ve captured.',
          'Outstanding! I\'m ready to catalog everything.',
          'Fun fact: The average home has 300,000 items! Let me see what\'s in yours...',
          'Did you know? Marie Kondo says we should only keep things that spark joy. Let\'s see what sparks!',
          'Pro tip: Labeling everything makes finding stuff 10x easier. Speaking of which...',
          'Here\'s a joke: Why don\'t items ever get lost? Because they always know their place in inventory! 📦',
          'Inventory wisdom: A place for everything, and everything in its place. Let me find those places!',
          'Fun fact: The word "inventory" comes from Latin meaning "to find." That\'s exactly what I do!',
          'Storage hack: Vertical space is your best friend. Now let me catalog your treasures...',
          'Did you know? The first known inventory was kept on clay tablets 5,000 years ago. We\'ve come far!',
          'Joke time: What\'s an organizer\'s favorite type of music? Heavy metal... shelving! 🎵',
          'Pro organizing tip: Group similar items together. Let me see what groups I can spot here!',
          'Random fact: Humans spend 12 years of their lives looking for misplaced items. Not on my watch! 🔍',
          'Plot twist: I can identify objects faster than you can say "where did I put that thing?"',
          'Weird but true: The most organized person in history was probably a librarian named Melvil Dewey. Respect! 📚',
          'Dad joke alert: Why did the storage container go to therapy? It had too many issues to unpack! 😂',
          'Mind blown: Ancient Egyptians invented the first storage containers... for their afterlife stuff! 🏺',
          'Life hack: If you can\'t find something, it\'s probably in the last place you\'d look. Literally.',
          'Deep thought: Is a junk drawer really junk, or is it a carefully curated chaos collection? 🤔',
          'Fun discovery: The Japanese have a word "tsundoku" for buying books and not reading them. Relatable!',
          'Reality check: 80% of what we own, we only use 20% of the time. Let\'s see what\'s actually useful!',
          'Confession: I secretly judge people by how they organize their kitchen utensils. Don\'t worry, you\'re safe! 🍴',
          'Trivia time: The Container Store has over 10,000 different storage products. I know them all! 📦',
          'Philosophical question: If a tree falls in a forest and no one inventories it, does it make a sound?',
          'Breaking news: Studies show organized people live longer. Correlation or causation? You decide! ⏰',
          'Guilty pleasure: I get genuinely excited about finding the perfect storage solution for weird-shaped items.',
          'Urban legend: There\'s supposedly a person who has never lost their keys. I\'m still searching for them.',
          'Science fact: Your brain releases dopamine when you organize things. I\'m basically a happiness dealer! 🧠',
          'Comedy gold: Why don\'t storage units ever get lonely? They\'re always full of stuff! 🏠',
          'Shocking truth: The average person owns 62 pairs of shoes but only wears 7 regularly. Shoe math is wild! 👠',
          'Zen moment: Marie Kondo\'s cat is probably the most organized cat in the world. Goals.',
          'Historical note: Vikings were surprisingly organized. They had to fit everything in longboats! ⛵',
          'Modern mystery: How do hair ties disappear faster than socks in the dryer? 🤷‍♀️',
          'Productivity secret: A messy desk is a sign of a creative mind. A really messy desk is a sign of a really creative mind!',
          'Food for thought: If you organize your spice rack alphabetically, are you living your best life? 🌶️',
          'Life lesson: The person who invented the junk drawer deserves a Nobel Prize for understanding human nature.',
          'Conspiracy theory: Tupperware lids are actually interdimensional beings. That\'s why they never match! 🥡',
          'Gentle reminder: Behind every organized person is a substantial amount of coffee. ☕',
          'Universal truth: The lighter the object, the harder it is to find when you need it most.',
          'Existential crisis: Is organizing just moving mess from one place to another? Let\'s find out!',
        ];

        const randomMessage = analysisMessages[Math.floor(Math.random() * analysisMessages.length)];

        updateAiProgress({
          step: 'analyzing',
          message: randomMessage,
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
          const detectedObjects = initialData.objects.map((obj: any) => ({
            ...obj,
            status: 'waiting'
          }));
          updateAiProgress({
            step: 'detecting',
            message: `Found ${initialData.objects.length} items! Processing with AI...`,
            progress: 50,
            detectedObjects: detectedObjects,
            room: initialData.room,
            totalValue: calculateActualTotal(detectedObjects)
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

        // Update progress - but keep the original "found items" message
        const progressPercentage = Math.min(90, 50 + (statusData.completedCount / statusData.totalCount) * 40);

        updateAiProgress({
          step: statusData.status === 'complete' ? 'complete' : 'detecting',
          message: statusData.status === 'complete'
            ? 'Perfect! Your items are ready to add.'
            : `Found ${statusData.totalCount} items! Processing with AI...`,
          progress: progressPercentage,
          detectedObjects: currentObjects,
          room: statusData.room || aiProgress.room,
          totalValue: calculateActualTotal(currentObjects)
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

          console.log('🔄 Starting streaming - aiProgress.room:', aiProgress.room);
          console.log('🔄 Starting streaming - statusData.room:', statusData.room);

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
            room: statusData.room || aiProgress.room, // Use statusData.room first, then fallback to aiProgress.room
            suggestedName: statusData.objects[0]?.name || '',
            suggestedCategory: statusData.objects[0]?.category || inferCategory(statusData.objects[0]?.name || ''),
            estimatedValue: calculateActualTotal(currentObjects),
            isStreaming: true,
            processingId: processingId
          };

          console.log('🔄 Created recognitionData with room:', recognitionData.room);

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
    const detectedObjects = data.objects.map((obj: any) => ({ ...obj, status: 'complete' }));
    updateAiProgress({
      step: 'complete',
      message: 'Perfect! Your items are ready to add.',
      progress: 100,
      detectedObjects: detectedObjects,
      room: data.room,
      totalValue: calculateActualTotal(detectedObjects)
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
      estimatedValue: calculateActualTotal(detectedObjects)
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
    console.log('📸 handleCameraCapture called with recognitionData:', recognitionData);
    console.log('📸 Room data received:', recognitionData.room);

    setImageData(capturedImageData);

    if (recognitionData.objects && recognitionData.objects.length > 0) {
      // Handle new streaming format
      const processedObjects = recognitionData.objects.map((obj: any) => ({
        name: obj.name,
        category: obj.category,
        description: obj.description,
        estimatedValue: obj.estimated_cost_usd,
        condition: obj.condition || 'good',
        imageUrl: obj.imageUrl,
        originalCropImageUrl: obj.originalCropImageUrl,
        originalFullImageUrl: obj.originalFullImageUrl,
        status: obj.status,
        ready: obj.status === 'complete' || obj.status === 'no_detection' || obj.status === 'error'
      }));

      setItemQueue(processedObjects);
      setDetectedObjects(processedObjects);
      setDetectedRoom(recognitionData.room || '');
      setOriginalDetectedRoom(recognitionData.room || ''); // Store original for persistence

      console.log('📸 Set detectedRoom to:', recognitionData.room || '');
      console.log('📸 Set originalDetectedRoom to:', recognitionData.room || '');

      // Find first ready item or start with first item if streaming
      const firstReadyIndex = processedObjects.findIndex((obj: any) => obj.ready);
      const startIndex = firstReadyIndex >= 0 ? firstReadyIndex : 0;

      setCurrentQueueIndex(startIndex);

      // Set up form with first available item
      const firstItem = processedObjects[startIndex];
      if (firstItem) {
        const matchedRoom = findMatchingRoom(recognitionData.room || '');
        console.log('📸 Setting form room to:', matchedRoom);

        setFormData(prev => ({
          ...prev,
          imageUrl: firstItem.imageUrl || capturedImageData,
          room: matchedRoom,
          name: firstItem.name || '',
          category: firstItem.category || '',
          description: firstItem.description || '',
          estimatedValue: firstItem.estimatedValue?.toString() || '',
          condition: firstItem.condition || 'good',
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
    setOriginalDetectedRoom('Living Room');
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
        room: prev.room || findMatchingRoom(originalDetectedRoom) || originalDetectedRoom,
        name: nextItem.name || '',
        category: nextItem.category || '',
        description: nextItem.description || '',
        estimatedValue: nextItem.estimatedValue?.toString() || '',
        condition: nextItem.condition || 'good',
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

  // Calculate actual sum of individual items
  const calculateActualTotal = (objects: DetectedObject[]): number => {
    return objects.reduce((sum, obj) => sum + (obj.estimated_cost_usd || 0), 0);
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
      condition: formData.condition || 'good' as 'excellent' | 'good' | 'fair' | 'poor',
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
        room: prev.room || findMatchingRoom(originalDetectedRoom) || originalDetectedRoom, // Preserve room
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
    <>
      <style>{animations}</style>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
        <div className="bg-white w-full sm:max-w-lg sm:w-full sm:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl safe-area-inset overflow-hidden">
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
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 space-y-4 max-h-[28rem] overflow-y-auto overflow-x-hidden sm:rounded-b-3xl">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Brain className="animate-pulse text-emerald-500" size={24} />
                    <span className="font-bold text-xl text-gray-900">Analyzing your photo...</span>
                  </div>

                  {/* Fun fact/tip display - only during initial analysis */}
                  {aiProgress.step === 'analyzing' && (
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-emerald-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles size={14} className="text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-emerald-700 mb-1">While I'm analyzing, here's a thought:</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{aiProgress.message}</p>
                        </div>
                      </div>
                    </div>
                  )}
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
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-[morph_12s_ease-in-out_infinite] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/50 to-purple-200/50 rounded-3xl animate-[pulse_3s_ease-in-out_infinite]"></div>
                  <Camera size={32} className="text-indigo-600 relative z-10 animate-[float_2s_ease-in-out_infinite]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Snap it & Tag it</h3>
                <p className="text-gray-600 text-sm mb-6">Tori will identify your items automatically</p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-indigo-600 text-indigo-600 py-4 px-4 rounded-full font-bold hover:bg-indigo-50 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <Camera size={18} />
                    Manual Snap
                  </button>

                  <button
                    type="button"
                    onClick={() => aiFileInputRef.current?.click()}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 border-2 border-transparent text-white py-4 px-4 rounded-full font-bold hover:shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <Sparkles size={18} />
                    AI Snap
                    <Zap size={14} className="text-amber-300" />
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
                <div className="space-y-3">
                  {/* Name */}
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-full focus:border-indigo-500 focus:outline-none transition-colors text-base ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                    placeholder="Item Name"
                    required
                  />

                  {/* Category & Room in a row */}
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={`w-full px-3 py-3 border rounded-full focus:border-indigo-500 focus:outline-none transition-colors appearance-none bg-white text-base ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'} ${!formData.category ? 'text-gray-400' : 'text-gray-900'}`}
                      required
                    >
                      <option value="" disabled className="text-gray-400">Category</option>
                      {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((category) => (
                        <option key={category.id} value={category.name} className="text-gray-900">{category.name}</option>
                      ))}
                    </select>

                    <select
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className={`w-full px-3 py-3 border rounded-full focus:border-indigo-500 focus:outline-none transition-colors appearance-none bg-white text-base ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'} ${!formData.room ? 'text-gray-400' : 'text-gray-900'}`}
                      required
                    >
                      <option value="" disabled className="text-gray-400">Location</option>
                      {[...rooms].sort((a, b) => a.name.localeCompare(b.name)).map((room) => (
                        <option key={room.id} value={room.name} className="text-gray-900">{room.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Value & Condition in a row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                        $
                      </div>
                      <input
                        type="number"
                        value={formData.estimatedValue}
                        onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                        className={`w-full pl-8 pr-3 py-3 border rounded-full focus:border-indigo-500 focus:outline-none transition-colors text-base ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                      className={`w-full px-3 py-3 border rounded-full focus:border-indigo-500 focus:outline-none transition-colors appearance-none text-base ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 bg-white'} ${!formData.condition ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      <option value="" disabled className="text-gray-400">Condition</option>
                      <option value="excellent" className="text-gray-900">Excellent</option>
                      <option value="good" className="text-gray-900">Good</option>
                      <option value="fair" className="text-gray-900">Fair</option>
                      <option value="poor" className="text-gray-900">Poor</option>
                    </select>
                  </div>

                  {/* Description - Optional, collapsible */}
                  <details className="group">
                    <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                      Add description (optional)
                    </summary>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`w-full mt-2 px-3 py-3 border rounded-2xl focus:border-indigo-500 focus:outline-none transition-colors resize-none text-base ${aiDetected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}
                      rows={2}
                      placeholder="Description (optional)"
                    />
                  </details>

                  {/* Maintenance Schedule - Smooth Toggle */}
                  <div ref={maintenanceRef} className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-4 border border-orange-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                          <Wrench size={16} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">Maintenance Care</h4>
                          <p className="text-xs text-gray-600">Keep it in perfect condition</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMaintenanceEnabled(!maintenanceEnabled);
                          // Scroll to show bottom of maintenance section when enabled
                          if (!maintenanceEnabled) {
                            setTimeout(() => {
                              maintenanceRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'end'
                              });
                            }, 600); // Wait for expand animation to complete
                          }
                        }}
                        className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500/20 ${maintenanceEnabled
                          ? 'bg-gradient-to-r from-orange-500 to-red-500'
                          : 'bg-gray-300'
                          }`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${maintenanceEnabled ? 'left-6' : 'left-0.5'
                          }`} />
                      </button>
                    </div>

                    {/* Maintenance Fields - Smooth Expand */}
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${maintenanceEnabled
                      ? 'max-h-[500px] opacity-100'
                      : 'max-h-0 opacity-0'
                      }`}>
                      <div className="space-y-3 pt-1">
                        {/* Quick Suggestions */}
                        {formData.category && maintenanceSuggestions[formData.category] && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
                              <Sparkles size={12} className="text-orange-500" />
                              Suggested for {formData.category}
                            </p>
                            <div className="flex flex-wrap gap-2 pl-2">
                              {maintenanceSuggestions[formData.category].map((suggestion, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => {
                                    setMaintenanceData(suggestion);
                                  }}
                                  className="text-xs px-3 py-1.5 bg-white border border-orange-200 rounded-full hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 hover:scale-105 flex items-center gap-1 max-w-full flex-shrink min-w-0"
                                >
                                  <Clock size={10} className="text-orange-500 flex-shrink-0" />
                                  <span className="truncate">{suggestion.title}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Maintenance Title */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Task Name
                          </label>
                          <input
                            type="text"
                            value={maintenanceData.title}
                            onChange={(e) => setMaintenanceData({ ...maintenanceData, title: e.target.value })}
                            className="w-full px-3 py-2.5 border border-orange-200 rounded-full focus:border-orange-500 focus:outline-none transition-colors text-base bg-white/70 backdrop-blur-sm"
                            placeholder="Clean and dust, Oil change, Filter replacement..."
                          />
                        </div>

                        {/* Interval */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Repeat Every
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              value={maintenanceData.intervalValue}
                              onChange={(e) => setMaintenanceData({ ...maintenanceData, intervalValue: parseInt(e.target.value) || 1 })}
                              className="px-3 py-2.5 border border-orange-200 rounded-full focus:border-orange-500 focus:outline-none transition-colors text-base bg-white/70 backdrop-blur-sm"
                              min="1"
                              placeholder="How many?"
                            />
                            <select
                              value={maintenanceData.intervalType}
                              onChange={(e) => setMaintenanceData({ ...maintenanceData, intervalType: e.target.value as any })}
                              className="px-3 py-2.5 border border-orange-200 rounded-full focus:border-orange-500 focus:outline-none transition-colors text-base bg-white/70 backdrop-blur-sm appearance-none"
                            >
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                              <option value="months">Months</option>
                              <option value="years">Years</option>
                            </select>
                          </div>
                        </div>

                        {/* Priority */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Priority Level
                          </label>
                          <div className="flex gap-2">
                            {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                              <button
                                key={priority}
                                type="button"
                                onClick={() => setMaintenanceData({ ...maintenanceData, priority })}
                                className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all duration-200 border ${maintenanceData.priority === priority
                                  ? priority === 'low' ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/25' :
                                    priority === 'medium' ? 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/25' :
                                      priority === 'high' ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25' :
                                        'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25'
                                  : 'bg-white/70 text-gray-600 border-orange-200 hover:border-orange-300 hover:bg-white'
                                  }`}
                              >
                                {priority.charAt(0).toUpperCase() + priority.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Instructions (Optional)
                          </label>
                          <textarea
                            value={maintenanceData.description}
                            onChange={(e) => setMaintenanceData({ ...maintenanceData, description: e.target.value })}
                            className="w-full px-3 py-2.5 border border-orange-200 rounded-2xl focus:border-orange-500 focus:outline-none transition-colors text-base bg-white/70 backdrop-blur-sm resize-none"
                            rows={2}
                            placeholder="Any specific steps or notes for this maintenance task..."
                          />
                        </div>


                      </div>
                    </div>
                  </div>
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
    </>
  );
};