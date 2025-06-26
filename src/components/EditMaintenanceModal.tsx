import React, { useState, useEffect } from 'react';
import { X, Wrench, Shield, RefreshCw } from 'lucide-react';
import { MaintenanceReminder } from '../types/inventory';

interface EditMaintenanceModalProps {
    reminder: MaintenanceReminder | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (reminderId: string, updates: {
        title: string;
        description: string;
        intervalType: 'days' | 'weeks' | 'months' | 'years';
        intervalValue: number;
        priority: 'low' | 'medium' | 'high' | 'urgent';
        nextDueDate: string;
    }) => Promise<void>;
}

export const EditMaintenanceModal: React.FC<EditMaintenanceModalProps> = ({
    reminder,
    isOpen,
    onClose,
    onSave
}) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        intervalType: 'months' as 'days' | 'weeks' | 'months' | 'years',
        intervalValue: 6,
        priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
        nextDueDate: '',
    });
    const [loading, setLoading] = useState(false);

    // Initialize form when reminder changes
    useEffect(() => {
        if (reminder) {
            setFormData({
                title: reminder.title,
                description: reminder.description,
                intervalType: reminder.intervalType || 'months', // Use actual data or fallback
                intervalValue: reminder.intervalValue || 6, // Use actual data or fallback
                priority: reminder.priority,
                nextDueDate: reminder.dueDate.split('T')[0], // Convert to date format
            });
        }
    }, [reminder]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reminder) return;

        setLoading(true);
        try {
            await onSave(reminder.id, formData);
            onClose();
        } catch (error) {
            console.error('Error updating maintenance schedule:', error);
        } finally {
            setLoading(false);
        }
    };

    const typeIcons = {
        maintenance: Wrench,
        warranty: Shield,
        replacement: RefreshCw,
    };

    if (!isOpen || !reminder) return null;

    const TypeIcon = typeIcons[reminder.type];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                            <TypeIcon size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Edit Maintenance</h3>
                            <p className="text-sm text-gray-600">{reminder.itemName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="What needs to be done?"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                            rows={3}
                            placeholder="Additional details about this maintenance task..."
                        />
                    </div>

                    {/* Interval */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Every
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.intervalValue}
                                onChange={(e) => setFormData(prev => ({ ...prev, intervalValue: parseInt(e.target.value) || 1 }))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Period
                            </label>
                            <select
                                value={formData.intervalType}
                                onChange={(e) => setFormData(prev => ({ ...prev, intervalType: e.target.value as any }))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Priority
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { key: 'low', label: 'Low', color: 'from-blue-500 to-indigo-500' },
                                { key: 'medium', label: 'Medium', color: 'from-yellow-500 to-orange-500' },
                                { key: 'high', label: 'High', color: 'from-orange-500 to-red-500' },
                                { key: 'urgent', label: 'Urgent', color: 'from-red-500 to-pink-600' },
                            ].map(({ key, label, color }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, priority: key as any }))}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${formData.priority === key
                                        ? `bg-gradient-to-r ${color} text-white shadow-lg scale-105`
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Next Due Date */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Next Due Date
                        </label>
                        <input
                            type="date"
                            value={formData.nextDueDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, nextDueDate: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:scale-100"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 