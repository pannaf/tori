import React, { useState, useRef, useEffect } from 'react';
import { X, MapPin, Tag, DollarSign, Calendar, Edit3, Trash2, AlertTriangle, Image, Sparkles } from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { env } from '../config/env';

interface ItemDetailModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (id: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOriginalImage, setShowOriginalImage] = useState(false);
  const [imageTransitioning, setImageTransitioning] = useState(false);
  
  // Touch/swipe handling
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !item) return null;

  const conditionColors = {
    excellent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    good: 'bg-blue-100 text-blue-800 border-blue-200',
    fair: 'bg-amber-100 text-amber-800 border-amber-200',
    poor: 'bg-red-100 text-red-800 border-red-200',
  };

  const conditionLabels = {
    excellent: 'Great',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(item);
    }
    onClose();
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(item.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const toggleImageView = () => {
    setImageTransitioning(true);
    setTimeout(() => {
      setShowOriginalImage(!showOriginalImage);
      setImageTransitioning(false);
    }, 150);
  };

  // Touch event handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!hasOriginalImage) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Check if it's a horizontal swipe (more horizontal than vertical movement)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      // Swipe right to show original, swipe left to show enhanced
      if (deltaX > 0 && !showOriginalImage) {
        toggleImageView();
      } else if (deltaX < 0 && showOriginalImage) {
        toggleImageView();
      }
    }
  };

  // Get the appropriate image URL based on current view
  const getCurrentImageUrl = () => {
    if (showOriginalImage && (item as any).originalCropImageUrl) {
      const originalUrl = (item as any).originalCropImageUrl;
      return originalUrl.startsWith('data:') ? originalUrl :
        originalUrl.startsWith('http') ? originalUrl :
          `${env.API_URL}${originalUrl}`;
    }
    
    // Fallback to enhanced/main image
    return item.imageUrl?.startsWith('data:') ? item.imageUrl :
      item.imageUrl?.startsWith('http') ? item.imageUrl :
        `${env.API_URL}${item.imageUrl}`;
  };

  // Check if we have both images available
  const hasOriginalImage = !!(item as any).originalCropImageUrl && 
    (item as any).originalCropImageUrl !== item.imageUrl &&
    (item as any).originalCropImageUrl.trim() !== '';

  // Delete Confirmation Modal
  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
          {/* Header */}
          <div className="p-6 text-center border-b border-gray-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Item?</h2>
            <p className="text-gray-600">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{item.name}"</span>? This action cannot be undone.
            </p>
          </div>

          {/* Actions */}
          <div className="p-6 grid grid-cols-2 gap-3">
            <button
              onClick={handleCancelDelete}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-red-500/25 transition-all duration-300 hover:scale-105"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="relative">
          {item.imageUrl && (
            <div 
              ref={imageContainerRef}
              className="aspect-square bg-gray-100 rounded-t-3xl overflow-hidden relative"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={getCurrentImageUrl()}
                alt={item.name}
                className={`w-full h-full object-contain transition-all duration-300 ${
                  imageTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
              />
              
              {/* Condition badge overlay - back on the left */}
              <div className={`absolute top-4 left-4 px-4 py-2 rounded-full text-sm font-semibold border-2 border-white ${conditionColors[item.condition]} backdrop-blur-sm z-10`}>
                {conditionLabels[item.condition]}
              </div>
            </div>
          )}

          {/* Close button overlay */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white bg-opacity-90 backdrop-blur-sm text-gray-600 hover:text-gray-800 rounded-full p-2 transition-colors shadow-lg z-10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title and Value */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.name}</h1>
            {item.estimatedValue && (
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl px-4 py-2">
                <DollarSign size={18} className="text-emerald-600" />
                <span className="text-xl font-bold text-emerald-700">{item.estimatedValue.toFixed(0)}</span>
              </div>
            )}
          </div>

          {/* Simple Image Toggle - Clean horizontal layout below content */}
          {hasOriginalImage && (
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                {showOriginalImage ? (
                  <>
                    <Image size={18} className="text-gray-600" />
                    <span className="text-sm font-semibold text-gray-700">Original Photo</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">Enhanced Photo</span>
                  </>
                )}
              </div>
              
              <button
                onClick={toggleImageView}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
              >
                Switch
              </button>
            </div>
          )}

          {/* Location and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 text-center">
              <MapPin className="mx-auto mb-2 text-indigo-600" size={20} />
              <p className="text-sm font-semibold text-indigo-700">Location</p>
              <p className="text-indigo-900 font-bold">{item.room}</p>
            </div>

            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-4 text-center">
              <Tag className="mx-auto mb-2 text-violet-600" size={20} />
              <p className="text-sm font-semibold text-violet-700">Category</p>
              <p className="text-violet-900 font-bold">{item.category}</p>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-900 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-sm rounded-full font-medium border border-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Date Added */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-slate-600" size={20} />
              <div>
                <p className="text-sm font-semibold text-slate-700">Added to inventory</p>
                <p className="text-slate-900 font-bold">{formatDate(item.dateAdded)}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={handleEdit}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105"
            >
              <Edit3 size={18} />
              Edit
            </button>

            <button
              onClick={handleDeleteClick}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white py-4 rounded-2xl font-semibold hover:shadow-xl hover:shadow-red-500/25 transition-all duration-300 hover:scale-105"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};