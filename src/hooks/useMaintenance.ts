import { useState, useEffect } from 'react';
import { InventoryItem, MaintenanceReminder, MaintenanceSchedule } from '../types/inventory';

// Predefined maintenance schedules for common items
const defaultMaintenanceSchedules: Record<string, MaintenanceSchedule[]> = {
  'Electronics': [
    {
      id: 'electronics-cleaning',
      type: 'quarterly',
      intervalMonths: 3,
      description: 'Clean dust and check connections',
      isActive: true,
    },
    {
      id: 'electronics-software',
      type: 'monthly',
      intervalMonths: 1,
      description: 'Update software and security patches',
      isActive: true,
    },
  ],
  'Appliances': [
    {
      id: 'appliance-filter',
      type: 'quarterly',
      intervalMonths: 3,
      description: 'Replace or clean filters',
      isActive: true,
    },
    {
      id: 'appliance-deep-clean',
      type: 'biannual',
      intervalMonths: 6,
      description: 'Deep clean and descale',
      isActive: true,
    },
  ],
  'Furniture': [
    {
      id: 'furniture-polish',
      type: 'quarterly',
      intervalMonths: 3,
      description: 'Polish and condition wood',
      isActive: true,
    },
    {
      id: 'furniture-inspect',
      type: 'annual',
      intervalMonths: 12,
      description: 'Inspect for wear and tighten joints',
      isActive: true,
    },
  ],
  'Tools': [
    {
      id: 'tools-sharpen',
      type: 'biannual',
      intervalMonths: 6,
      description: 'Sharpen blades and cutting edges',
      isActive: true,
    },
    {
      id: 'tools-oil',
      type: 'quarterly',
      intervalMonths: 3,
      description: 'Oil moving parts and check for rust',
      isActive: true,
    },
  ],
};

export const useMaintenance = (items: InventoryItem[]) => {
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate reminders based on items and their maintenance schedules
  useEffect(() => {
    generateReminders();
  }, [items]);

  const generateReminders = () => {
    setLoading(true);
    const newReminders: MaintenanceReminder[] = [];
    const now = new Date();

    items.forEach(item => {
      // Generate maintenance reminders
      if (item.maintenanceSchedule?.isActive) {
        const lastMaintenance = item.lastMaintenance ? new Date(item.lastMaintenance) : new Date(item.dateAdded);
        const nextDue = new Date(lastMaintenance);
        nextDue.setMonth(nextDue.getMonth() + item.maintenanceSchedule.intervalMonths);

        if (nextDue <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) { // Due within 30 days
          const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          
          newReminders.push({
            id: `maintenance-${item.id}-${Date.now()}`,
            itemId: item.id,
            itemName: item.name,
            itemRoom: item.room,
            itemImageUrl: item.imageUrl,
            type: 'maintenance',
            title: `${item.name} Maintenance Due`,
            description: item.maintenanceSchedule.description,
            dueDate: nextDue.toISOString(),
            priority: daysUntilDue < 0 ? 'urgent' : daysUntilDue <= 7 ? 'high' : 'medium',
            isCompleted: false,
          });
        }
      }

      // Generate warranty expiry reminders
      if (item.warrantyExpiry) {
        const warrantyDate = new Date(item.warrantyExpiry);
        const daysUntilExpiry = Math.ceil((warrantyDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        if (daysUntilExpiry <= 60 && daysUntilExpiry >= 0) { // Warn 60 days before expiry
          newReminders.push({
            id: `warranty-${item.id}-${Date.now()}`,
            itemId: item.id,
            itemName: item.name,
            itemRoom: item.room,
            itemImageUrl: item.imageUrl,
            type: 'warranty',
            title: `${item.name} Warranty Expiring`,
            description: `Warranty expires in ${daysUntilExpiry} days`,
            dueDate: warrantyDate.toISOString(),
            priority: daysUntilExpiry <= 30 ? 'high' : 'medium',
            isCompleted: false,
          });
        }
      }

      // Generate replacement suggestions for poor condition items
      if (item.condition === 'poor') {
        newReminders.push({
          id: `replacement-${item.id}-${Date.now()}`,
          itemId: item.id,
          itemName: item.name,
          itemRoom: item.room,
          itemImageUrl: item.imageUrl,
          type: 'replacement',
          title: `Consider Replacing ${item.name}`,
          description: 'Item is in poor condition and may need replacement',
          dueDate: now.toISOString(),
          priority: 'low',
          isCompleted: false,
        });
      }
    });

    // Sort by priority and due date
    newReminders.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    setReminders(newReminders);
    setLoading(false);
  };

  const completeReminder = (reminderId: string, notes?: string) => {
    setReminders(prev => prev.map(reminder => 
      reminder.id === reminderId 
        ? { 
            ...reminder, 
            isCompleted: true, 
            completedDate: new Date().toISOString(),
            notes 
          }
        : reminder
    ));
  };

  const dismissReminder = (reminderId: string) => {
    setReminders(prev => prev.filter(reminder => reminder.id !== reminderId));
  };

  const getMaintenanceScheduleForCategory = (category: string): MaintenanceSchedule[] => {
    return defaultMaintenanceSchedules[category] || [];
  };

  const addMaintenanceSchedule = (itemId: string, schedule: MaintenanceSchedule) => {
    // This would typically update the item in your inventory system
    console.log('Adding maintenance schedule for item:', itemId, schedule);
  };

  const getUpcomingReminders = (days: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    
    return reminders.filter(reminder => 
      !reminder.isCompleted && 
      new Date(reminder.dueDate) <= cutoffDate
    );
  };

  const getOverdueReminders = () => {
    const now = new Date();
    return reminders.filter(reminder => 
      !reminder.isCompleted && 
      new Date(reminder.dueDate) < now
    );
  };

  const getRemindersByPriority = (priority: MaintenanceReminder['priority']) => {
    return reminders.filter(reminder => 
      !reminder.isCompleted && 
      reminder.priority === priority
    );
  };

  return {
    reminders: reminders.filter(r => !r.isCompleted),
    completedReminders: reminders.filter(r => r.isCompleted),
    loading,
    completeReminder,
    dismissReminder,
    getMaintenanceScheduleForCategory,
    addMaintenanceSchedule,
    getUpcomingReminders,
    getOverdueReminders,
    getRemindersByPriority,
    refreshReminders: generateReminders,
  };
};