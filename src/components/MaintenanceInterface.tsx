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
      <div className="space-y-5">
        {/* Beautiful Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-500/25">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-red-700 mb-1">{overdueCount}</p>
            <p className="text-sm font-semibold text-red-600">Overdue</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-yellow-500/25">
              <Clock size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-yellow-700 mb-1">{upcomingCount}</p>
            <p className="text-sm font-semibold text-yellow-600">This Week</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/25">
              <CheckCircle size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-green-700 mb-1">{completedReminders.length}</p>
            <p className="text-sm font-semibold text-green-600">Done</p>
          </div>
        </div>

        {/* Clean Vertical Filter Layout */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Filter by Priority</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'all', label: 'All Tasks', count: reminders.length, gradient: 'from-indigo-600 to-purple-600' },
              { key: 'urgent', label: 'Urgent', count: getRemindersByPriority('urgent').length, gradient: 'from-red-500 to-pink-600' },
              { key: 'high', label: 'High', count: getRemindersByPriority('high').length, gradient: 'from-orange-500 to-red-500' },
              { key: 'medium', label: 'Medium', count: getRemindersByPriority('medium').length, gradient: 'from-yellow-500 to-orange-500' },
            ].map(({ key, label, count, gradient }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key as any)}
                className={`p-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
                  activeFilter === key
                    ? `bg-gradient-to-r ${gradient} text-white shadow-lg scale-105`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{label}</span>
                  {count > 0 && (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      activeFilter === key ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'
                    }`}>
                      {count}
                    </span>
                  )}
                </div>
              </button>
            ))}
            
            {/* Low priority gets its own row for better spacing */}
            <div className="col-span-2">
              <button
                onClick={() => setActiveFilter('low')}
                className={`w-full p-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
                  activeFilter === 'low'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>Low Priority</span>
                  {getRemindersByPriority('low').length > 0 && (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      activeFilter === 'low' ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'
                    }`}>
                      {getRemindersByPriority('low').length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Beautiful Reminders List */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-600 font-medium">Loading maintenance reminders...</p>
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-600">
                {activeFilter === 'all' 
                  ? "No maintenance needed right now. Your items are in great shape!"
                  : `No ${activeFilter} priority items to worry about.`
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
                  className={`border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg ${priorityBgColors[reminder.priority]}`}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Item Image */}
                      {reminder.itemImageUrl && (
                        <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
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
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-base leading-tight">
                              {reminder.itemName}
                            </h4>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <span>{reminder.itemRoom}</span>
                              <span>•</span>
                              <span className="font-medium">{formatDate(reminder.dueDate)}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <div className={`w-8 h-8 bg-gradient-to-r ${priorityColors[reminder.priority]} rounded-xl flex items-center justify-center shadow-lg`}>
                              <TypeIcon size={16} className="text-white" />
                            </div>
                            <button
                              onClick={() => setExpandedReminder(isExpanded ? null : reminder.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                            >
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                          </div>
                        </div>

                        {!isExpanded && (
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {reminder.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                          {reminder.description}
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleCompleteReminder(reminder.id)}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={16} />
                            Mark Complete
                          </button>
                          <button
                            onClick={() => dismissReminder(reminder.id)}
                            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
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

        {/* Completed Section Toggle */}
        {completedReminders.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full text-center py-3 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors hover:bg-gray-50 rounded-xl"
            >
              {showCompleted ? 'Hide' : 'Show'} {completedReminders.length} completed items
            </button>
          </div>
        )}

        {/* Completed Reminders */}
        {showCompleted && completedReminders.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-gray-700 mb-3">Recently Completed</h4>
            {completedReminders.slice(0, 3).map((reminder) => (
              <div key={reminder.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle size={16} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-700 line-through">
                      {reminder.itemName}
                    </p>
                    <p className="text-sm text-gray-500">
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