import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Zap } from 'lucide-react';
import { ChatMessage } from '../types/inventory';
import { InventoryItem } from '../types/inventory';

interface ChatInterfaceProps {
  items: InventoryItem[];
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  items,
  isOpen,
  onClose,
  embedded = false
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hey there! I'm Tori, your friendly home inventory assistant! 🏠✨ I can help you find items, get stats about your stuff, or just chat about your home organization. What's on your mind?",
      isUser: false,
      timestamp: new Date().toISOString(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (query: string): { content: string; relatedItems?: InventoryItem[] } => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
      const totalItems = items.length;
      const rooms = [...new Set(items.map(item => item.room))];
      const categories = [...new Set(items.map(item => item.category))];

      return {
        content: `You've got ${totalItems} items organized across ${rooms.length} rooms and ${categories.length} different categories! 📊 Your most popular room is ${rooms[0] || 'N/A'} and you have the most ${categories[0] || 'N/A'} items. Pretty organized! 🎉`
      };
    }

    if (lowerQuery.includes('expensive') || lowerQuery.includes('valuable') || lowerQuery.includes('worth')) {
      const valuableItems = items
        .filter(item => item.estimatedValue && item.estimatedValue > 100)
        .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0))
        .slice(0, 3);

      if (valuableItems.length > 0) {
        return {
          content: `Here are your most valuable treasures! 💎`,
          relatedItems: valuableItems
        };
      } else {
        return {
          content: `Looks like you haven't added estimated values to your items yet, or they're all under $100. That's totally fine - not everything needs to be expensive to be valuable! 💝`
        };
      }
    }

    if (lowerQuery.includes('kitchen') || lowerQuery.includes('living') || lowerQuery.includes('bedroom') || lowerQuery.includes('bathroom') || lowerQuery.includes('office') || lowerQuery.includes('garage')) {
      const roomMap: { [key: string]: string } = {
        'kitchen': 'Kitchen',
        'living': 'Living Room',
        'bedroom': 'Bedroom',
        'bathroom': 'Bathroom',
        'office': 'Office',
        'garage': 'Garage'
      };

      const detectedRoom = Object.keys(roomMap).find(key => lowerQuery.includes(key));
      const room = detectedRoom ? roomMap[detectedRoom] : 'Unknown';
      const roomItems = items.filter(item => item.room.toLowerCase().includes(room.toLowerCase()));

      if (roomItems.length > 0) {
        return {
          content: `Found ${roomItems.length} items in your ${room}! Here's what you've got: 🏠`,
          relatedItems: roomItems.slice(0, 5)
        };
      } else {
        return {
          content: `Hmm, I don't see any items in your ${room} yet. Maybe it's time to add some? 📸`
        };
      }
    }

    if (lowerQuery.includes('electronics') || lowerQuery.includes('furniture') || lowerQuery.includes('clothing') || lowerQuery.includes('books') || lowerQuery.includes('appliances')) {
      const categoryMap: { [key: string]: string } = {
        'electronics': 'Electronics',
        'furniture': 'Furniture',
        'clothing': 'Clothing',
        'books': 'Books',
        'appliances': 'Appliances'
      };

      const detectedCategory = Object.keys(categoryMap).find(key => lowerQuery.includes(key));
      const category = detectedCategory ? categoryMap[detectedCategory] : 'Unknown';
      const categoryItems = items.filter(item => item.category.toLowerCase().includes(category.toLowerCase()));

      if (categoryItems.length > 0) {
        return {
          content: `Here are your ${category.toLowerCase()} items! 📱`,
          relatedItems: categoryItems.slice(0, 5)
        };
      } else {
        return {
          content: `No ${category.toLowerCase()} items found yet. Time to go shopping? 😉`
        };
      }
    }

    if (lowerQuery.includes('find') || lowerQuery.includes('where') || lowerQuery.includes('search')) {
      const searchTerms = lowerQuery.replace(/find|where|is|are|my|search|for/g, '').trim();
      const foundItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerms) ||
        item.description?.toLowerCase().includes(searchTerms) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerms))
      );

      if (foundItems.length > 0) {
        return {
          content: `Found ${foundItems.length} items matching "${searchTerms}"! 🔍`,
          relatedItems: foundItems.slice(0, 5)
        };
      } else {
        return {
          content: `Couldn't find anything matching "${searchTerms}" 😅 Maybe try a different search term? Or perhaps you haven't added it to your inventory yet!`
        };
      }
    }

    if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
      return {
        content: `Hey there! 👋 Great to chat with you! I'm here to help you with anything related to your home inventory. Want to know what you have, where it is, or how much it's worth? Just ask! 😊`
      };
    }

    if (lowerQuery.includes('thank') || lowerQuery.includes('thanks')) {
      return {
        content: `Aww, you're so welcome! 🥰 I love helping you stay organized. Feel free to ask me anything else about your stuff!`
      };
    }

    const responses = [
      "I'm here to help you with your home inventory! Try asking me things like 'What's in my kitchen?' or 'Find my laptop' or 'How many items do I have?' 🤔",
      "You can ask me about specific rooms, categories, or search for particular items! I'm like your personal home assistant 🏠✨",
      "I love helping you stay organized! Ask me about your most valuable items, room distributions, or search for anything specific 📊💝",
      "Want to know something about your inventory? I can help you find items, get stats, or just chat about your home organization! 😊"
    ];

    return {
      content: responses[Math.floor(Math.random() * responses.length)]
    };
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = generateResponse(inputValue);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.content,
        isUser: false,
        timestamp: new Date().toISOString(),
        relatedItems: response.relatedItems,
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (embedded) {
    return (
      <div className="flex flex-col h-96">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${message.isUser ? 'order-1' : 'order-2'}`}>
                <div
                  className={`px-4 py-3 rounded-2xl ${message.isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                    }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>

                {message.relatedItems && message.relatedItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.relatedItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-200 rounded-xl p-3 text-sm shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{item.name}</span>
                          <span className="text-gray-500 text-xs">{item.room}</span>
                        </div>
                        {item.estimatedValue && (
                          <span className="text-emerald-600 font-semibold">${item.estimatedValue}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Tori anything about your stuff..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-3 rounded-2xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md h-[600px] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <Zap className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Chat with Tori</h3>
              <p className="text-white text-opacity-80 text-sm">Your friendly inventory assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-xl p-2 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${message.isUser ? 'order-1' : 'order-2'}`}>
                <div
                  className={`px-5 py-3 rounded-2xl ${message.isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                    }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>

                {message.relatedItems && message.relatedItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.relatedItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-200 rounded-xl p-3 text-sm shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{item.name}</span>
                          <span className="text-gray-500 text-xs">{item.room}</span>
                        </div>
                        {item.estimatedValue && (
                          <span className="text-emerald-600 font-semibold">${item.estimatedValue}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`flex items-center gap-2 mt-2 ${message.isUser ? 'justify-end' : 'justify-start'
                    }`}
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${message.isUser ? 'bg-indigo-100' : 'bg-purple-100'
                    }`}>
                    {message.isUser ? (
                      <User size={14} className="text-indigo-600" />
                    ) : (
                      <Zap size={14} className="text-purple-600" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-5 py-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Tori anything about your stuff..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-2xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};