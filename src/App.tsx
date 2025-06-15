import React, { useState } from 'react';
import { Plus, MessageSquare, Home, Search, BarChart3, Zap } from 'lucide-react';
import { useInventory } from './hooks/useInventory';
import { AddItemModal } from './components/AddItemModal';
import { ItemCard } from './components/ItemCard';
import { SearchAndFilters } from './components/SearchAndFilters';
import { ChatInterface } from './components/ChatInterface';
import { StatsOverview } from './components/StatsOverview';

type TabType = 'home' | 'search' | 'stats' | 'chat';

function App() {
  const {
    items,
    rooms,
    categories,
    addItem,
    updateItem,
    deleteItem,
    searchItems,
  } = useInventory();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const filteredItems = searchItems(searchQuery, selectedRoom, selectedCategory);
  const recentItems = items
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, 6);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-bold mb-6 shadow-lg shadow-indigo-500/25">
                <Zap size={20} />
                Tori
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
                {items.length === 0 ? (
                  <>Tori. Know what you own.</>
                ) : (
                  <>Your home, effortlessly organized</>
                )}
              </h1>
              
              <p className="text-gray-600 leading-relaxed">
                {items.length === 0
                  ? "Let's get started by adding your first item with AI-powered photo recognition"
                  : `Let's go! You've got ${items.length} items inventoried`
                }
              </p>
            </div>

            {items.length > 0 && <StatsOverview items={items} variant="compact" />}

            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-100">
                  <Plus className="text-indigo-600" size={36} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Ready to get organized?</h3>
                <p className="text-gray-600 mb-8 max-w-sm mx-auto leading-relaxed">
                  Snap a photo and let Tori's AI catalog everything for you
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-full font-bold hover:shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105"
                >
                  Add Your First Item
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Recent Additions</h2>
                  {recentItems.length > 0 && (
                    <button
                      onClick={() => setActiveTab('search')}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors font-semibold"
                    >
                      View all →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {recentItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEdit={updateItem}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'search':
        return (
          <div className="space-y-6">
            <div className="text-center py-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Find Your Stuff</h1>
              <p className="text-gray-600">Search through your organized home inventory</p>
            </div>

            <SearchAndFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedRoom={selectedRoom}
              onRoomChange={setSelectedRoom}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              rooms={rooms}
              categories={categories}
            />

            <div className="grid grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onEdit={updateItem}
                  onDelete={deleteItem}
                />
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <Search className="mx-auto mb-4 text-gray-400" size={48} />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Nothing found</h3>
                <p className="text-gray-600">
                  Try a different search term or adjust your filters
                </p>
              </div>
            )}
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-6">
            <div className="text-center py-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Home Stats</h1>
              <p className="text-gray-600">See how organized you are!</p>
            </div>

            <StatsOverview items={items} />

            {items.length > 0 && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Distribution</h3>
                  <div className="space-y-3">
                    {rooms.map(room => {
                      const roomItems = items.filter(item => item.room === room.name);
                      const percentage = items.length > 0 ? (roomItems.length / items.length) * 100 : 0;

                      return (
                        <div key={room.id} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{room.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 w-8 text-right">{roomItems.length}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
                  <div className="space-y-3">
                    {categories.map(category => {
                      const categoryItems = items.filter(item => item.category === category.name);
                      const percentage = items.length > 0 ? (categoryItems.length / items.length) * 100 : 0;

                      return (
                        <div key={category.id} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{category.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 w-8 text-right">{categoryItems.length}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'chat':
        return (
          <div className="space-y-6">
            <div className="text-center py-6">
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Ask me anything!</h1>
              <p className="text-gray-600">I can help you find items, get stats, or organize your home</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <ChatInterface
                items={items}
                isOpen={true}
                onClose={() => setActiveTab('home')}
                embedded={true}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-md mx-auto bg-white min-h-screen relative shadow-xl shadow-slate-200/50">
        {/* Main Content */}
        <div className="pb-24">
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* Unified Floating Pill Navigation */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-white/95 backdrop-blur-xl rounded-full shadow-2xl shadow-gray-900/10 border border-gray-200/50 p-2">
            <div className="flex items-center">
              {/* Left Navigation Items */}
              {[
                { key: 'home', icon: Home, label: 'Home' },
                { key: 'stats', icon: BarChart3, label: 'Stats' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as TabType)}
                  className={`relative flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${
                    activeTab === key
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  {activeTab === key && (
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {label}
                    </span>
                  )}
                </button>
              ))}

              {/* Center Add Button - Outlined */}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center w-14 h-14 mx-2 border-2 border-indigo-600 text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white hover:shadow-xl hover:shadow-indigo-500/25 hover:scale-110 transition-all duration-300"
                title="Add new item"
              >
                <Plus size={24} />
              </button>

              {/* Right Navigation Items */}
              {[
                { key: 'search', icon: Search, label: 'Search' },
                { key: 'chat', icon: MessageSquare, label: 'Chat' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as TabType)}
                  className={`relative flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${
                    activeTab === key
                      ? key === 'chat'
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  {activeTab === key && (
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modals */}
        <AddItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={addItem}
          rooms={rooms}
          categories={categories}
        />
      </div>
    </div>
  );
}

export default App;