import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Zap, Volume2 } from 'lucide-react';
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
      content: "Hey! I'm Tori! 👋 I'm here to help you with your home inventory. You can ask me anything - like where your stuff is, what you own, or how much it's all worth. Just talk to me like you would a friend!",
      isUser: false,
      timestamp: new Date().toISOString(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
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
        content: `You've got ${totalItems} items! That's pretty impressive! 🎉 They're spread across ${rooms.length} different rooms, and I can see you have ${categories.length} different types of stuff. Your ${rooms[0] || 'favorite room'} seems to be where you keep most things!`
      };
    }

    if (lowerQuery.includes('expensive') || lowerQuery.includes('valuable') || lowerQuery.includes('worth')) {
      const valuableItems = items
        .filter(item => item.estimatedValue && item.estimatedValue > 100)
        .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0))
        .slice(0, 3);

      if (valuableItems.length > 0) {
        return {
          content: `Ooh, let me show you your most valuable stuff! 💎 These are your priciest treasures:`,
          relatedItems: valuableItems
        };
      } else {
        return {
          content: `Hmm, looks like you haven't added prices to your items yet, or everything's under $100. That's totally fine though! The most valuable things aren't always the most expensive, right? 💝`
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
          content: `Oh nice! I found ${roomItems.length} things in your ${room}! 🏠 Here's what you've got in there:`,
          relatedItems: roomItems.slice(0, 5)
        };
      } else {
        return {
          content: `Hmm, I don't see anything in your ${room} yet. Maybe it's time to add some stuff? Or maybe it's just super tidy in there! 😄`
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
          content: `Here are all your ${category.toLowerCase()}! 📱 You've got some good stuff:`,
          relatedItems: categoryItems.slice(0, 5)
        };
      } else {
        return {
          content: `I don't see any ${category.toLowerCase()} items yet. Time for some shopping? 😉 Or maybe you just haven't added them to your inventory!`
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
          content: `Found it! 🔍 Actually, I found ${foundItems.length} things that match "${searchTerms}". Here they are:`,
          relatedItems: foundItems.slice(0, 5)
        };
      } else {
        return {
          content: `Hmm, I couldn't find anything matching "${searchTerms}" 🤔 Maybe try describing it differently? Or perhaps you haven't added it to your inventory yet!`
        };
      }
    }

    if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
      return {
        content: `Hey there! 👋 So good to chat with you! I'm Tori, and I'm basically your home's memory. I know where all your stuff is and can help you find anything. What's on your mind today?`
      };
    }

    if (lowerQuery.includes('thank') || lowerQuery.includes('thanks')) {
      return {
        content: `Aww, you're so sweet! 🥰 I absolutely love helping you stay organized. It's literally what I live for! Got anything else you want to know about your stuff?`
      };
    }

    if (lowerQuery.includes('help') || lowerQuery.includes('what can you do')) {
      return {
        content: `I'm like your home's personal assistant! 🏠✨ I can help you find specific items, tell you what's in any room, show you your most valuable stuff, count your things, or just chat about your home organization. Try asking me things like "What's in my kitchen?" or "Find my laptop" or "How much is my stuff worth?"`
      };
    }

    const responses = [
      "I'm not sure I caught that! 🤔 Try asking me about specific rooms, like 'What's in my kitchen?' or search for items like 'Find my laptop'. I'm here to help!",
      "Hmm, let me think... 💭 You can ask me about your rooms, categories, or search for specific items! I'm like having a friend who remembers where you put everything!",
      "I love chatting, but I'm best at helping with your inventory! 😊 Ask me about your most valuable items, what's in different rooms, or help finding something specific!",
      "Not quite sure what you're looking for! 🤷‍♀️ I'm great at finding your stuff though - try asking 'Where is my...' or 'What do I have in my...' and I'll help you out!"
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

    // Simulate more natural typing delay
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
    }, 800 + Math.random() * 1200); // More natural response time
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    // In a real implementation, you'd integrate with Web Speech API here
  };

  if (embedded) {
    return (
      <div className="flex flex-col h-96">
        {/* Chat Header */}
        <div className="flex items-center gap-3 mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
            <Zap className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Tori</h3>
            <p className="text-sm text-gray-600">Your home assistant</p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-600 font-medium">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${message.isUser ? 'order-1' : 'order-2'}`}>
                {!message.isUser && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                      <Zap size={12} className="text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Tori</span>
                  </div>
                )}

                <div
                  className={`px-4 py-3 rounded-2xl ${message.isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>

                {message.relatedItems && message.relatedItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.relatedItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-200 rounded-xl p-3 text-sm shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{item.name}</span>
                          <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded-full">{item.room}</span>
                        </div>
                        {item.estimatedValue && (
                          <div className="mt-1">
                            <span className="text-emerald-600 font-bold">${item.estimatedValue}</span>
                          </div>
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
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                  <Zap size={12} className="text-white" />
                </div>
                <span className="text-xs font-medium text-gray-600">Tori is typing...</span>
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Just talk to me naturally..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
            />
            <button
              onClick={toggleListening}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors ${isListening ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
              <Zap className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Tori</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                <p className="text-white text-opacity-80 text-sm">Ready to chat</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-xl p-2 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${message.isUser ? 'order-1' : 'order-2'}`}>
                {!message.isUser && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                      <Zap size={12} className="text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Tori</span>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <Volume2 size={12} />
                    </button>
                  </div>
                )}

                <div
                  className={`px-4 py-3 rounded-2xl ${message.isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>

                {message.relatedItems && message.relatedItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.relatedItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-200 rounded-xl p-3 text-sm shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{item.name}</span>
                          <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded-full">{item.room}</span>
                        </div>
                        {item.estimatedValue && (
                          <div className="mt-1">
                            <span className="text-emerald-600 font-bold">${item.estimatedValue}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span>
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
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <Zap size={12} className="text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-600">Tori is typing...</span>
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Just talk to me naturally..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              />
              <button
                onClick={toggleListening}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors ${isListening ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-3 rounded-2xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};