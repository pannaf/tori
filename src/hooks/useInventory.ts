import { useState, useEffect } from 'react';
import { InventoryItem, Room, Category } from '../types/inventory';

const STORAGE_KEY = 'home-inventory';

const defaultRooms: Room[] = [
  { id: '1', name: 'Living Room', icon: 'sofa', color: '#6366F1' },
  { id: '2', name: 'Kitchen', icon: 'chef-hat', color: '#EC4899' },
  { id: '3', name: 'Bedroom', icon: 'bed', color: '#8B5CF6' },
  { id: '4', name: 'Bathroom', icon: 'bath', color: '#14B8A6' },
  { id: '5', name: 'Garage', icon: 'car', color: '#F59E0B' },
  { id: '6', name: 'Office', icon: 'briefcase', color: '#EF4444' },
];

const defaultCategories: Category[] = [
  { id: '1', name: 'Electronics', icon: 'smartphone', color: '#6366F1' },
  { id: '2', name: 'Furniture', icon: 'armchair', color: '#EC4899' },
  { id: '3', name: 'Appliances', icon: 'refrigerator', color: '#8B5CF6' },
  { id: '4', name: 'Clothing', icon: 'shirt', color: '#14B8A6' },
  { id: '5', name: 'Books', icon: 'book', color: '#F59E0B' },
  { id: '6', name: 'Kitchen', icon: 'utensils', color: '#EF4444' },
  { id: '7', name: 'Decorative', icon: 'picture-in-picture', color: '#10B981' },
  { id: '8', name: 'Sports', icon: 'dumbbell', color: '#F97316' },
];

export const useInventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [rooms] = useState<Room[]>(defaultRooms);
  const [categories] = useState<Category[]>(defaultCategories);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  const saveItems = (newItems: InventoryItem[]) => {
    setItems(newItems);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  };

  const addItem = (item: Omit<InventoryItem, 'id' | 'dateAdded'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString(),
    };
    saveItems([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    saveItems(updatedItems);
  };

  const deleteItem = (id: string) => {
    saveItems(items.filter(item => item.id !== id));
  };

  const searchItems = (query: string, roomFilter?: string, categoryFilter?: string) => {
    return items.filter(item => {
      const matchesQuery = !query || 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      
      const matchesRoom = !roomFilter || item.room === roomFilter;
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      
      return matchesQuery && matchesRoom && matchesCategory;
    });
  };

  return {
    items,
    rooms,
    categories,
    addItem,
    updateItem,
    deleteItem,
    searchItems,
  };
};