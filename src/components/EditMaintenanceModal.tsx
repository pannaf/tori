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

                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Task Name
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-orange-200 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm bg-white/70 backdrop-blur-sm"
                            placeholder="Clean and dust, Oil change, Filter replacement..."
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Instructions (Optional)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-orange-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm bg-white/70 backdrop-blur-sm resize-none"
                            rows={2}
                            placeholder="Any specific steps or notes for this maintenance task..."
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
                                value={formData.intervalValue}
                                onChange={(e) => setFormData(prev => ({ ...prev, intervalValue: parseInt(e.target.value) || 1 }))}
                                className="px-3 py-2.5 border border-orange-200 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm bg-white/70 backdrop-blur-sm"
                                min="1"
                                placeholder="How many?"
                                required
                            />
                            <select
                                value={formData.intervalType}
                                onChange={(e) => setFormData(prev => ({ ...prev, intervalType: e.target.value as any }))}
                                className="px-3 py-2.5 border border-orange-200 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm bg-white/70 backdrop-blur-sm appearance-none"
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
                            {([
                                { key: 'low', label: 'Low' },
                                { key: 'medium', label: 'Medium' },
                                { key: 'high', label: 'High' },
                                { key: 'urgent', label: 'Urgent' },
                            ] as const).map(({ key, label }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, priority: key }))}
                                    className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all duration-200 border ${formData.priority === key
                                        ? key === 'low' ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/25' :
                                            key === 'medium' ? 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/25' :
                                                key === 'high' ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25' :
                                                    'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25'
                                        : 'bg-white/70 text-gray-600 border-orange-200 hover:border-orange-300 hover:bg-white'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Next Due Date */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Next Due Date
                        </label>
                        <input
                            type="date"
                            value={formData.nextDueDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, nextDueDate: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-orange-200 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm bg-white/70 backdrop-blur-sm"
                            required
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-full font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-full font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:scale-100"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 