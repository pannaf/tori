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