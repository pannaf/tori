import React, { useState } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  Wrench, 
  Shield, 
  RefreshCw,
  X,
  Plus,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { InventoryItem, MaintenanceReminder } from '../types/inventory';
import { useMaintenance } from '../hooks/useMaintenance';
import { env } from '../config/env';

interface MaintenanceInterfaceProps {
  items: InventoryItem[];
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

export const MaintenanceInterface: React.FC<MaintenanceInterfaceProps> = ({
  items,
  isOpen,
  onClose,
  embedded = false
}) => {
  const {
    reminders,
    completedReminders,
    loading,
    completeReminder,
    dismissReminder,
    getUpcomingReminders,
    getOverdueReminders,
    getRemindersByPriority,
    refreshReminders,
  } = useMaintenance(items);

  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedReminder, setExpandedReminder] = useState<string | null>(null);

  const priorityColors = {
    urgent: 'from-red-500 to-pink-600',
    high: 'from-orange-500 to-red-500',
    medium: 'from-yellow-500 to-orange-500',
    low: 'from-blue-500 to-indigo-500',
  };

  const priorityBgColors = {
    urgent: 'bg-red-50 border-red-200',
    high: 'bg-orange-50 border-orange-200',
    medium: 'bg-yellow-50 border-yellow-200',
    low: 'bg-blue-50 border-blue-200',
  };

  const typeIcons = {
    maintenance: Wrench,
    warranty: Shield,
    replacement: RefreshCw,
  };

  const filteredReminders = activeFilter === 'all' 
    ? reminders 
    : getRemindersByPriority(activeFilter);

  const overdueCount = getOverdueReminders().length;
  const upcomingCount = getUpcomingReminders(7).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)}d overdue`;
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays <= 7) {
      return `${diffDays}d`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
    }
  };

  const handleCompleteReminder = (reminderId: string) => {
    completeReminder(reminderId, 'Completed via maintenance interface');
  };

  if (embedded) {
    return (
      <div className="space-y-4">
        {/* Compact Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-3 text-center">
            <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-1">
              <AlertTriangle size={12} className="text-white" />
            </div>
            <p className="text-lg font-bold text-red-700">{overdueCount}</p>
            <p className="text-xs font-medium text-red-600">Overdue</p>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 text-center">
            <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mx-auto mb-1">
              <Clock size={12} className="text-white" />
            </div>
            <p className="text-lg font-bold text-yellow-700">{upcomingCount}</p>
            <p className="text-xs font-medium text-yellow-600">This Week</p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 text-center">
            <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-1">
              <CheckCircle size={12} className="text-white" />
            </div>
            <p className="text-lg font-bold text-green-700">{completedReminders.length}</p>
            <p className="text-xs font-medium text-green-600">Done</p>
          </div>
        </div>

        {/* Compact Filter Buttons */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'All', count: reminders.length },
            { key: 'urgent', label: 'Urgent', count: getRemindersByPriority('urgent').length },
            { key: 'high', label: 'High', count: getRemindersByPriority('high').length },
            { key: 'medium', label: 'Med', count: getRemindersByPriority('medium').length },
            { key: 'low', label: 'Low', count: getRemindersByPriority('low').length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key as any)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeFilter === key
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeFilter === key ? 'bg-white/20' : 'bg-gray-300'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Compact Reminders List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="text-center py-6">
              <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
              <h3 className="text-sm font-bold text-gray-900 mb-1">All caught up!</h3>
              <p className="text-xs text-gray-600">
                {activeFilter === 'all' 
                  ? "No maintenance needed right now."
                  : `No ${activeFilter} priority items.`
                }
              </p>
            </div>
          ) : (
            filteredReminders.map((reminder) => {
              const TypeIcon = typeIcons[reminder.type];
              const isExpanded = expandedReminder === reminder.id;
              
              return (
                <div
                  key={reminder.id}
                  className={`border rounded-xl overflow-hidden transition-all ${priorityBgColors[reminder.priority]}`}
                >
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      {/* Compact Item Image */}
                      {reminder.itemImageUrl && (
                        <div className="w-8 h-8 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={
                              reminder.itemImageUrl.startsWith('data:') ? reminder.itemImageUrl :
                                reminder.itemImageUrl.startsWith('http') ? reminder.itemImageUrl :
                                  `${env.API_URL}${reminder.itemImageUrl}`
                            }
                            alt={reminder.itemName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                              {reminder.itemName}
                            </h4>
                            <p className="text-xs text-gray-600">
                              {reminder.itemRoom} • {formatDate(reminder.dueDate)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <div className={`w-5 h-5 bg-gradient-to-r ${priorityColors[reminder.priority]} rounded-lg flex items-center justify-center`}>
                              <TypeIcon size={10} className="text-white" />
                            </div>
                            <button
                              onClick={() => setExpandedReminder(isExpanded ? null : reminder.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </div>
                        </div>

                        {!isExpanded && (
                          <p className="text-xs text-gray-700 mt-1 line-clamp-1">
                            {reminder.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                          {reminder.description}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCompleteReminder(reminder.id)}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-3 rounded-lg text-xs font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-1"
                          >
                            <CheckCircle size={12} />
                            Complete
                          </button>
                          <button
                            onClick={() => dismissReminder(reminder.id)}
                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Compact Completed Toggle */}
        {completedReminders.length > 0 && (
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full text-center py-2 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors border-t border-gray-200"
          >
            {showCompleted ? 'Hide' : 'Show'} {completedReminders.length} completed
          </button>
        )}

        {/* Compact Completed Reminders */}
        {showCompleted && completedReminders.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Recently Completed</h4>
            {completedReminders.slice(0, 3).map((reminder) => (
              <div key={reminder.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 line-through truncate">
                      {reminder.itemName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {reminder.completedDate ? new Date(reminder.completedDate).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-600 to-red-600 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
              <Wrench className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Maintenance</h3>
              <p className="text-white text-opacity-80 text-sm">Keep everything in top shape</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-xl p-2 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <MaintenanceInterface
            items={items}
            isOpen={true}
            onClose={onClose}
            embedded={true}
          />
        </div>
      </div>
    </div>
  );
};