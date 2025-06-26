export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  room: string;
  description?: string;
  imageUrl?: string;
  originalCropImageUrl?: string; // Add original image URL field
  originalFullImageUrl?: string; // Add original full image URL field
  dateAdded: string;
  tags: string[];
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  estimatedValue?: number;
  // New maintenance fields
  maintenanceSchedule?: MaintenanceSchedule;
  lastMaintenance?: string;
  nextMaintenance?: string;
  warrantyExpiry?: string;
  purchaseDate?: string;
}

export interface MaintenanceSchedule {
  id: string;
  itemId: string;
  userId: string;
  title: string;
  description?: string;
  intervalType: 'days' | 'weeks' | 'months' | 'years';
  intervalValue: number;
  nextDueDate: string;
  isActive: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRecord {
  id: string;
  itemId: string;
  scheduleId?: string;
  userId: string;
  title: string;
  description?: string;
  completedDate: string;
  notes?: string;
  cost?: number;
  createdAt: string;
}

export interface MaintenanceReminder {
  id: string;
  itemId: string;
  itemName: string;
  itemRoom: string;
  itemCategory?: string;
  itemImageUrl?: string;
  type: 'maintenance' | 'warranty' | 'replacement';
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isCompleted: boolean;
  completedDate?: string;
  notes?: string;
  // Add interval information for editing
  intervalType?: 'days' | 'weeks' | 'months' | 'years';
  intervalValue?: number;
}

export interface Room {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  relatedItems?: InventoryItem[];
}