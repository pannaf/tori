import { useState, useEffect } from 'react';
import { InventoryItem, MaintenanceReminder } from '../types/inventory';
import { useMaintenanceDB } from './useMaintenanceDB';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface User {
  id: string;
  email: string;
}

export const useMaintenance = (items: InventoryItem[], user: User | null = null) => {
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [completedReminders, setCompletedReminders] = useState<MaintenanceReminder[]>([]);
  const [loading, setLoading] = useState(false);

  const { getAllMaintenanceSchedules, completeMaintenanceTask } = useMaintenanceDB(user);

  // Generate reminders from database maintenance schedules
  useEffect(() => {
    if (!user?.id || items.length === 0) {
      setReminders([]);
      setCompletedReminders([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const generateReminders = async () => {
      setLoading(true);
      try {
        const newReminders: MaintenanceReminder[] = [];
        const now = new Date();

        console.log('🔧 Fetching maintenance schedules for user:', user?.email);
        console.log('🔧 Items available:', items.length);

        // Get all maintenance schedules from database
        const schedules = await getAllMaintenanceSchedules();
        console.log('🔧 Found', schedules.length, 'maintenance schedules:', schedules);

        // Convert schedules to reminders
        schedules.forEach(schedule => {
          const item = items.find(item => item.id === schedule.itemId);
          if (!item) {
            console.log('🔧 Item not found for schedule:', schedule.itemId, 'Available items:', items.map(i => i.id));
            return; // Skip if item not found
          }

          const dueDate = new Date(schedule.nextDueDate);
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

          console.log('🔧 Processing schedule:', schedule.title, 'due in', daysUntilDue, 'days');

          // Show reminders that are due within the next 90 days or overdue
          if (daysUntilDue <= 90) {
            newReminders.push({
              id: schedule.id,
              itemId: schedule.itemId,
              itemName: item.name,
              itemRoom: item.room,
              itemCategory: item.category,
              itemImageUrl: item.imageUrl,
              type: 'maintenance',
              title: schedule.title,
              description: schedule.description || 'Maintenance due',
              dueDate: schedule.nextDueDate,
              priority: daysUntilDue < 0 ? 'urgent' : daysUntilDue <= 7 ? 'high' : schedule.priority,
              isCompleted: false,
            });
          }
        });

        // Generate replacement suggestions for poor condition items
        items.forEach(item => {
          if (item.condition === 'poor') {
            newReminders.push({
              id: `replacement-${item.id}`,
              itemId: item.id,
              itemName: item.name,
              itemRoom: item.room,
              itemCategory: item.category,
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

        console.log('🔧 Generated', newReminders.length, 'reminders:', newReminders);

        if (isMounted) {
          setReminders(newReminders);
        }

        // Fetch completed reminders
        await fetchCompletedReminders();

      } catch (error) {
        console.error('Error generating maintenance reminders:', error);
        if (isMounted) {
          setReminders([]);
          setCompletedReminders([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const fetchCompletedReminders = async () => {
      if (!user) return;

      try {
        // Get maintenance records from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: records, error } = await supabase
          .from('maintenance_records')
          .select('*')
          .eq('user_id', user.id)
          .gte('completed_date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('completed_date', { ascending: false });

        if (error) {
          console.error('Error fetching completed records:', error);
          return;
        }

        console.log('🔧 Found', records.length, 'completed maintenance records');

        // Convert records to reminders
        const completedReminders: MaintenanceReminder[] = (records || []).map((record: any) => {
          const item = items.find(item => item.id === record.item_id);
          return {
            id: record.id,
            itemId: record.item_id,
            itemName: item?.name || 'Unknown Item',
            itemRoom: item?.room || 'Unknown Room',
            itemCategory: item?.category || 'Other',
            itemImageUrl: item?.imageUrl,
            type: 'maintenance' as const,
            title: record.title,
            description: record.description || 'Maintenance completed',
            dueDate: record.completed_date,
            priority: 'medium' as const,
            isCompleted: true,
            completedDate: record.completed_date,
            notes: record.notes,
          };
        });

        if (isMounted) {
          setCompletedReminders(completedReminders);
        }
      } catch (error) {
        console.error('Error fetching completed reminders:', error);
      }
    };

    generateReminders();

    return () => {
      isMounted = false;
    };
  }, [user?.id]); // Only re-run when user changes

  const completeReminder = async (reminderId: string, notes?: string) => {
    try {
      console.log('🔧 Completing reminder:', reminderId);

      // If it's a maintenance schedule, complete it in the database
      if (!reminderId.startsWith('replacement-')) {
        console.log('🔧 Calling completeMaintenanceTask...');
        const success = await completeMaintenanceTask(reminderId, notes);
        console.log('🔧 completeMaintenanceTask result:', success);

        if (!success) {
          console.error('Failed to complete maintenance task in database');
          return;
        }
      }

      // Find the reminder that was completed
      const completedReminder = reminders.find(r => r.id === reminderId);
      if (completedReminder) {
        // Add it to completed reminders immediately
        const completedReminderWithDate = {
          ...completedReminder,
          isCompleted: true,
          completedDate: new Date().toISOString(),
          notes
        };
        setCompletedReminders(prev => [completedReminderWithDate, ...prev]);
      }

      // Remove from active reminders immediately
      setReminders(prev => prev.filter(reminder => reminder.id !== reminderId));

    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const dismissReminder = (reminderId: string) => {
    setReminders(prev => prev.filter(reminder => reminder.id !== reminderId));
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

  const refreshReminders = () => {
    // Trigger a re-fetch by updating a dependency
    setLoading(true);
  };

  return {
    reminders: reminders.filter(r => !r.isCompleted),
    completedReminders,
    loading,
    completeReminder,
    dismissReminder,
    getUpcomingReminders,
    getOverdueReminders,
    getRemindersByPriority,
    refreshReminders,
  };
};