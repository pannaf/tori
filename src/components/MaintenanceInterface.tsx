import React, { useState, useMemo } from 'react';
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
  ChevronRight,
  Edit3
} from 'lucide-react';
import {
  IconDeviceLaptop,
  IconWashMachine,
  IconArmchair,
  IconChefHat,
  IconHammer,
  IconBarbell,
  IconBook,
  IconShirt,
  IconPalette,
  IconHeart,
  IconStar,
  IconPackage
} from '@tabler/icons-react';
import { InventoryItem, MaintenanceReminder } from '../types/inventory';
import { useMaintenance } from '../hooks/useMaintenance';
import { EditMaintenanceModal } from './EditMaintenanceModal';
import { env } from '../config/env';

interface MaintenanceInterfaceProps {
  items: InventoryItem[];
  user?: { id: string; email: string } | null;
}

export const MaintenanceInterface: React.FC<MaintenanceInterfaceProps> = ({
  items,
  user
}) => {
  // Always call the hook, but pass empty array when not ready
  const {
    reminders,
    completedReminders,
    loading,
    completeReminder,
    updateReminder,
    dismissReminder,
    getUpcomingReminders,
    getOverdueReminders,
    getRemindersByPriority,
    refreshReminders,
  } = useMaintenance(items, user);

  // Don't show content until we have items
  const shouldShowMaintenance = user && items.length > 0;

  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedReminder, setExpandedReminder] = useState<string | null>(null);
  const [editingReminder, setEditingReminder] = useState<MaintenanceReminder | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

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

  // Category icon mapping with beautiful Tabler Icons
  const getCategoryIcon = (category: string) => {
    const categoryMap: Record<string, any> = {
      'Electronics': IconDeviceLaptop,
      'Appliances': IconWashMachine,
      'Furniture': IconArmchair,
      'Kitchenware': IconChefHat,
      'Tools': IconHammer,
      'Sports & Recreation': IconBarbell,
      'Books & Media': IconBook,
      'Clothing & Accessories': IconShirt,
      'Decorations': IconPalette,
      'Personal Care': IconHeart,
      'Collectibles & Mementos': IconStar,
      'Other': IconPackage,
    };
    return categoryMap[category] || categoryMap['Other'];
  };

  // Priority-based colors for consistency with urgency levels
  const getPriorityIconColor = (priority: string) => {
    const priorityIconColors: Record<string, string> = {
      urgent: '#EF4444', // Red-500
      high: '#F97316', // Orange-500  
      medium: '#F59E0B', // Yellow-500
      low: '#3B82F6', // Blue-500
    };
    return priorityIconColors[priority] || '#6B7280';
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

  const handleEditReminder = (reminder: MaintenanceReminder) => {
    // Don't allow editing replacement suggestions
    if (reminder.id.startsWith('replacement-')) {
      return;
    }
    setEditingReminder(reminder);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (reminderId: string, updates: {
    title: string;
    description: string;
    intervalType: 'days' | 'weeks' | 'months' | 'years';
    intervalValue: number;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    nextDueDate: string;
  }) => {
    await updateReminder(reminderId, updates);
    setShowEditModal(false);
    setEditingReminder(null);
  };

  // Show loading state while items are being loaded
  if (!shouldShowMaintenance) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-gray-600 font-medium">Loading maintenance data...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Cards in their own card container */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-2xl p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/25">
                <AlertTriangle size={12} className="text-white" />
              </div>
              <p className="text-lg font-bold text-red-700">{overdueCount}</p>
            </div>
            <p className="text-xs font-semibold text-red-600">Overdue</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/25">
                <Clock size={12} className="text-white" />
              </div>
              <p className="text-lg font-bold text-yellow-700">{upcomingCount}</p>
            </div>
            <p className="text-xs font-semibold text-yellow-600">Week</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/25">
                <CheckCircle size={12} className="text-white" />
              </div>
              <p className="text-lg font-bold text-green-700">{completedReminders.length}</p>
            </div>
            <p className="text-xs font-semibold text-green-600">Done</p>
          </div>
        </div>
      </div>

      {/* Everything else flows outside the card */}
      {/* Clean Priority Filter with Clear Option */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filter by Priority</span>
        </div>

        {/* Clear Filter Button - Only show when filter is active */}
        {activeFilter !== 'all' && (
          <button
            onClick={() => setActiveFilter('all')}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* 4 Priority Filters - Improved mobile spacing */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { key: 'urgent', label: 'Urgent', count: getRemindersByPriority('urgent').length, gradient: 'from-red-500 to-pink-600' },
          { key: 'high', label: 'High', count: getRemindersByPriority('high').length, gradient: 'from-orange-500 to-red-500' },
          { key: 'medium', label: 'Med', count: getRemindersByPriority('medium').length, gradient: 'from-yellow-500 to-orange-500' },
          { key: 'low', label: 'Low', count: getRemindersByPriority('low').length, gradient: 'from-blue-500 to-indigo-500' },
        ].map(({ key, label, count, gradient }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key as any)}
            className={`px-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex flex-col items-center gap-1 ${activeFilter === key
              ? `bg-gradient-to-r ${gradient} text-white shadow-lg scale-105`
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
              }`}
          >
            <span className="text-xs leading-tight">{label}</span>
            {count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold min-w-[18px] h-[18px] flex items-center justify-center ${activeFilter === key ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Beautiful Reminders List - No container, just scrolls */}
      <div className="space-y-3">
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
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedReminder(isExpanded ? null : reminder.id)}
                >
                  {/* Header Row - Always visible and stable */}
                  <div className="flex items-start gap-3">
                    {/* Item Category Icon - Fixed position */}
                    {(() => {
                      const CategoryIcon = getCategoryIcon(reminder.itemCategory || 'Other');
                      const iconColor = getPriorityIconColor(reminder.priority);
                      return (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: `${iconColor}15` }}
                        >
                          <CategoryIcon
                            size={20}
                            style={{ color: iconColor }}
                          />
                        </div>
                      );
                    })()}

                    {/* Content Area - Fixed position */}
                    <div className="flex-1 min-w-0">
                      {/* Title and Controls Row - Fixed height */}
                      <div className="flex items-center justify-between">
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
                          <div className="text-gray-400 transition-colors">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </div>
                        </div>
                      </div>

                      {/* Description - Always visible in same position */}
                      <div className="mt-2">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {reminder.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content - Action buttons only */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleCompleteReminder(reminder.id)}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Done
                        </button>
                        {/* Only show edit button for actual maintenance schedules, not replacement suggestions */}
                        {!reminder.id.startsWith('replacement-') && (
                          <button
                            onClick={() => handleEditReminder(reminder)}
                            className="px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                          >
                            <Edit3 size={16} />
                            Edit
                          </button>
                        )}
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
        <div className="mt-8 pt-6 border-t border-gray-200">
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
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" />
            Recently Completed
          </h4>
          {completedReminders.slice(0, 5).map((reminder) => (
            <div key={reminder.id} className="bg-green-50 border border-green-200 rounded-xl p-4 transition-all duration-300">
              <div className="flex items-center gap-3">
                {/* Item Category Icon */}
                {(() => {
                  const CategoryIcon = getCategoryIcon(reminder.itemCategory || 'Other');
                  const iconColor = getPriorityIconColor(reminder.priority);
                  return (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm opacity-75"
                      style={{ backgroundColor: `${iconColor}15` }}
                    >
                      <CategoryIcon
                        size={20}
                        style={{ color: iconColor }}
                      />
                    </div>
                  );
                })()}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-bold text-gray-800 text-sm leading-tight">
                        {reminder.title}
                      </h5>
                      <p className="text-sm text-gray-600 mt-1">
                        {reminder.itemName} • {reminder.itemRoom}
                      </p>
                      <p className="text-xs text-green-700 font-medium mt-1">
                        Completed {reminder.completedDate ? new Date(reminder.completedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: new Date(reminder.completedDate).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        }) : 'recently'}
                      </p>
                    </div>

                    {/* Completion Badge */}
                    <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25 flex-shrink-0">
                      <CheckCircle size={16} className="text-white" />
                    </div>
                  </div>

                  {/* Notes if available */}
                  {reminder.notes && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-xs text-gray-600 italic">
                        "{reminder.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Show more button if there are more than 5 completed items */}
          {completedReminders.length > 5 && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Showing 5 of {completedReminders.length} completed items
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit Maintenance Modal */}
      <EditMaintenanceModal
        reminder={editingReminder}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingReminder(null);
        }}
        onSave={handleSaveEdit}
      />
    </div>
  );
};