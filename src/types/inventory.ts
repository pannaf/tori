export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  room: string;
  description?: string;
  imageUrl?: string;
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
  type: 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'custom';
  intervalMonths: number;
  description: string;
  isActive: boolean;
}

export interface MaintenanceReminder {
  id: string;
  itemId: string;
  itemName: string;
  itemRoom: string;
  itemImageUrl?: string;
  type: 'maintenance' | 'warranty' | 'replacement';
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isCompleted: boolean;
  completedDate?: string;
  notes?: string;
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