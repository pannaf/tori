import React, { useState } from 'react';
import { Plus, MessageSquare, Home, Search, BarChart3, Sparkles } from 'lucide-react';
import { useInventory } from './hooks/useInventory';
import { AddItemModal } from './components/AddItemModal';
import { ItemCard } from './components/ItemCard';
import { SearchAndFilters } from './components/SearchAndFilters';
import { ChatInterface } from './components/ChatInterface';
import { StatsOverview } from './components/StatsOverview';

type TabType = 'home' | 'search' | 'stats';

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
  const [showChat, setShowChat] = useState(false);
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
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  Your Home Inventory
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {items.length === 0
                    ? "Start organizing your home with AI-powered cataloging"
                    : `${items.length} items organized and ready to find`
                  }
                </p>
              </div>
              
              {items.length === 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full p-3">
                      <Sparkles className="text-white" size={24} />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Ready to get started?
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Take a photo of any item and let AI automatically detect and catalog it for you
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                  >
                    Add Your First Item
                  </button>
                </div>
              )}
            </div>

            {items.length > 0 && <StatsOverview items={items} />}

            {items.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Additions</h2>
                  {recentItems.length > 0 && (
                    <button
                      onClick={() => setActiveTab('search')}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors text-sm font-medium"
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
            <div className="text-center py-4">
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nothing found</h3>
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
            <div className="text-center py-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Home Stats</h1>
              <p className="text-gray-600">See how organized you are! 📊</p>
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
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
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

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen relative">
        {/* Main Content */}
        <div className="pb-20">
          <div className="p-4">
            {renderTabContent()}
          </div>
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-20 right-4 z-30 flex flex-col gap-3">
          <button
            onClick={() => setShowChat(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
            title="Chat with Tori"
          >
            <MessageSquare size={24} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
            title="Add new item"
          >
            <Plus size={28} />
          </button>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-2">
          <div className="flex items-center justify-around">
            {[
              { key: 'home', icon: Home, label: 'Home' },
              { key: 'search', icon: Search, label: 'Search' },
              { key: 'stats', icon: BarChart3, label: 'Stats' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabType)}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${activeTab === key
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
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

        <ChatInterface
          items={items}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />
      </div>
    </div>
  );
}

export default App;