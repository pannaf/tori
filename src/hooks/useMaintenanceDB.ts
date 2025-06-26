import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MaintenanceSchedule, MaintenanceRecord } from '../types/inventory';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface User {
    id: string;
    email: string;
}

export const useMaintenanceDB = (user: User | null = null) => {
    const [loading, setLoading] = useState(false);

    // Create a maintenance schedule for an item
    const createMaintenanceSchedule = useCallback(async (
        itemId: string,
        schedule: Omit<MaintenanceSchedule, 'id' | 'itemId' | 'userId' | 'createdAt' | 'updatedAt'>
    ): Promise<MaintenanceSchedule | null> => {
        if (!user) {
            console.warn('User not authenticated');
            return null;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('maintenance_schedules')
                .insert({
                    item_id: itemId,
                    user_id: user.id,
                    title: schedule.title,
                    description: schedule.description,
                    interval_type: schedule.intervalType,
                    interval_value: schedule.intervalValue,
                    next_due_date: schedule.nextDueDate,
                    is_active: schedule.isActive,
                    priority: schedule.priority,
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating maintenance schedule:', error);
                return null;
            }

            // Transform database response to our interface
            return {
                id: data.id,
                itemId: data.item_id,
                userId: data.user_id,
                title: data.title,
                description: data.description,
                intervalType: data.interval_type,
                intervalValue: data.interval_value,
                nextDueDate: data.next_due_date,
                isActive: data.is_active,
                priority: data.priority,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        } catch (error) {
            console.error('Error in createMaintenanceSchedule:', error);
            return null;
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Get maintenance schedules for an item
    const getItemMaintenanceSchedules = useCallback(async (itemId: string): Promise<MaintenanceSchedule[]> => {
        if (!user) return [];

        try {
            const { data, error } = await supabase
                .from('maintenance_schedules')
                .select('*')
                .eq('item_id', itemId)
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching maintenance schedules:', error);
                return [];
            }

            return data.map(schedule => ({
                id: schedule.id,
                itemId: schedule.item_id,
                userId: schedule.user_id,
                title: schedule.title,
                description: schedule.description,
                intervalType: schedule.interval_type,
                intervalValue: schedule.interval_value,
                nextDueDate: schedule.next_due_date,
                isActive: schedule.is_active,
                priority: schedule.priority,
                createdAt: schedule.created_at,
                updatedAt: schedule.updated_at,
            }));
        } catch (error) {
            console.error('Error in getItemMaintenanceSchedules:', error);
            return [];
        }
    }, [user]);

    // Get all maintenance schedules for user
    const getAllMaintenanceSchedules = useCallback(async (): Promise<MaintenanceSchedule[]> => {
        if (!user) return [];

        try {
            const { data, error } = await supabase
                .from('maintenance_schedules')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('next_due_date', { ascending: true });

            if (error) {
                console.error('Error fetching all maintenance schedules:', error);
                return [];
            }

            return data.map(schedule => ({
                id: schedule.id,
                itemId: schedule.item_id,
                userId: schedule.user_id,
                title: schedule.title,
                description: schedule.description,
                intervalType: schedule.interval_type,
                intervalValue: schedule.interval_value,
                nextDueDate: schedule.next_due_date,
                isActive: schedule.is_active,
                priority: schedule.priority,
                createdAt: schedule.created_at,
                updatedAt: schedule.updated_at,
            }));
        } catch (error) {
            console.error('Error in getAllMaintenanceSchedules:', error);
            return [];
        }
    }, [user]);

    // Complete a maintenance task and create a record
    const completeMaintenanceTask = useCallback(async (
        scheduleId: string,
        notes?: string,
        cost?: number
    ): Promise<boolean> => {
        if (!user) return false;

        setLoading(true);
        try {
            console.log('🔧 DB: Getting schedule for ID:', scheduleId);

            // Get the schedule to create a record
            const { data: schedule, error: scheduleError } = await supabase
                .from('maintenance_schedules')
                .select('*')
                .eq('id', scheduleId)
                .eq('user_id', user.id)
                .single();

            if (scheduleError || !schedule) {
                console.error('Error fetching schedule:', scheduleError);
                return false;
            }

            console.log('🔧 DB: Found schedule:', schedule);

            // Create maintenance record
            console.log('🔧 DB: Creating maintenance record...');
            const { error: recordError } = await supabase
                .from('maintenance_records')
                .insert({
                    item_id: schedule.item_id,
                    schedule_id: scheduleId,
                    user_id: user.id,
                    title: schedule.title,
                    description: schedule.description,
                    completed_date: new Date().toISOString().split('T')[0],
                    notes,
                    cost,
                });

            if (recordError) {
                console.error('Error creating maintenance record:', recordError);
                return false;
            }

            console.log('🔧 DB: Maintenance record created successfully');

            // Update the schedule's next due date - calculate from current due date, not today
            const nextDueDate = new Date(schedule.next_due_date);
            switch (schedule.interval_type) {
                case 'days':
                    nextDueDate.setDate(nextDueDate.getDate() + schedule.interval_value);
                    break;
                case 'weeks':
                    nextDueDate.setDate(nextDueDate.getDate() + (schedule.interval_value * 7));
                    break;
                case 'months':
                    nextDueDate.setMonth(nextDueDate.getMonth() + schedule.interval_value);
                    break;
                case 'years':
                    nextDueDate.setFullYear(nextDueDate.getFullYear() + schedule.interval_value);
                    break;
            }

            const newDueDateString = nextDueDate.toISOString().split('T')[0];
            console.log('🔧 DB: Updating schedule next due date from', schedule.next_due_date, 'to', newDueDateString);

            const { error: updateError } = await supabase
                .from('maintenance_schedules')
                .update({
                    next_due_date: newDueDateString,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', scheduleId)
                .eq('user_id', user.id);

            if (updateError) {
                console.error('Error updating schedule:', updateError);
                return false;
            }

            console.log('🔧 DB: Schedule updated successfully');
            return true;
        } catch (error) {
            console.error('Error in completeMaintenanceTask:', error);
            return false;
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Get maintenance records for an item
    const getItemMaintenanceRecords = useCallback(async (itemId: string): Promise<MaintenanceRecord[]> => {
        if (!user) return [];

        try {
            const { data, error } = await supabase
                .from('maintenance_records')
                .select('*')
                .eq('item_id', itemId)
                .eq('user_id', user.id)
                .order('completed_date', { ascending: false });

            if (error) {
                console.error('Error fetching maintenance records:', error);
                return [];
            }

            return data.map(record => ({
                id: record.id,
                itemId: record.item_id,
                scheduleId: record.schedule_id,
                userId: record.user_id,
                title: record.title,
                description: record.description,
                completedDate: record.completed_date,
                notes: record.notes,
                cost: record.cost,
                createdAt: record.created_at,
            }));
        } catch (error) {
            console.error('Error in getItemMaintenanceRecords:', error);
            return [];
        }
    }, [user]);

    // Update a maintenance schedule
    const updateMaintenanceSchedule = useCallback(async (
        scheduleId: string,
        updates: Partial<Omit<MaintenanceSchedule, 'id' | 'itemId' | 'userId' | 'createdAt' | 'updatedAt'>>
    ): Promise<boolean> => {
        if (!user) {
            console.warn('User not authenticated');
            return false;
        }

        setLoading(true);
        try {
            const updateData: any = {
                updated_at: new Date().toISOString(),
            };

            // Map frontend fields to database fields
            if (updates.title !== undefined) updateData.title = updates.title;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.intervalType !== undefined) updateData.interval_type = updates.intervalType;
            if (updates.intervalValue !== undefined) updateData.interval_value = updates.intervalValue;
            if (updates.nextDueDate !== undefined) updateData.next_due_date = updates.nextDueDate;
            if (updates.priority !== undefined) updateData.priority = updates.priority;
            if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

            const { error } = await supabase
                .from('maintenance_schedules')
                .update(updateData)
                .eq('id', scheduleId)
                .eq('user_id', user.id);

            if (error) {
                console.error('Error updating maintenance schedule:', error);
                return false;
            }

            console.log('🔧 DB: Maintenance schedule updated successfully');
            return true;
        } catch (error) {
            console.error('Error in updateMaintenanceSchedule:', error);
            return false;
        } finally {
            setLoading(false);
        }
    }, [user]);

    return {
        loading,
        createMaintenanceSchedule,
        updateMaintenanceSchedule,
        getItemMaintenanceSchedules,
        getAllMaintenanceSchedules,
        completeMaintenanceTask,
        getItemMaintenanceRecords,
    };
}; 