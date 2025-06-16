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
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const handleCompleteReminder = (reminderId: string) => {
    completeReminder(reminderId, 'Completed via maintenance interface');
  };

  if (embedded) {
    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4 text-center">
            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={16} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-red-700">{overdueCount}</p>
            <p className="text-xs font-medium text-red-600">Overdue</p>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 text-center">
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Clock size={16} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-yellow-700">{upcomingCount}</p>
            <p className="text-xs font-medium text-yellow-600">This Week</p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 text-center">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-2">
              <CheckCircle size={16} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-green-700">{completedReminders.length}</p>
            <p className="text-xs font-medium text-green-600">Completed</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All', count: reminders.length },
            { key: 'urgent', label: 'Urgent', count: getRemindersByPriority('urgent').length },
            { key: 'high', label: 'High', count: getRemindersByPriority('high').length },
            { key: 'medium', label: 'Medium', count: getRemindersByPriority('medium').length },
            { key: 'low', label: 'Low', count: getRemindersByPriority('low').length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === key
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeFilter === key ? 'bg-white/20' : 'bg-gray-300'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Reminders List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading reminders...</p>
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
              <h3 className="text-lg font-bold text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-600">
                {activeFilter === 'all' 
                  ? "No maintenance reminders right now. Great job keeping everything in order!"
                  : `No ${activeFilter} priority reminders.`
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
                  className={`border rounded-2xl overflow-hidden transition-all ${priorityBgColors[reminder.priority]}`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Item Image */}
                      {reminder.itemImageUrl && (
                        <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
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
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                              {reminder.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">
                              {reminder.itemRoom} • {formatDate(reminder.dueDate)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className={`w-6 h-6 bg-gradient-to-r ${priorityColors[reminder.priority]} rounded-lg flex items-center justify-center`}>
                              <TypeIcon size={12} className="text-white" />
                            </div>
                            <button
                              onClick={() => setExpandedReminder(isExpanded ? null : reminder.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 leading-relaxed">
                          {reminder.description}
                        </p>
                      </div>
                    </div>

                    {/* Expanded Actions */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                        <button
                          onClick={() => handleCompleteReminder(reminder.id)}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-4 rounded-xl text-sm font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Mark Complete
                        </button>
                        <button
                          onClick={() => dismissReminder(reminder.id)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Show Completed Toggle */}
        {completedReminders.length > 0 && (
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full text-center py-3 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors border-t border-gray-200"
          >
            {showCompleted ? 'Hide' : 'Show'} {completedReminders.length} completed reminders
          </button>
        )}

        {/* Completed Reminders */}
        {showCompleted && completedReminders.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Recently Completed</h4>
            {completedReminders.slice(0, 5).map((reminder) => (
              <div key={reminder.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 line-through">
                      {reminder.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      Completed {reminder.completedDate ? new Date(reminder.completedDate).toLocaleDateString() : 'recently'}
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-3xl">
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
        <div className="flex-1 overflow-hidden">
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