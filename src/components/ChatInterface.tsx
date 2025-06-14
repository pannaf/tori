import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Zap, Volume2, Sparkles } from 'lucide-react';
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
      content: "Hey! I'm Tori! 👋 Just tap the microphone and talk to me like you would a friend. Ask me anything about your home inventory - where your stuff is, what you own, how much it's worth. I'm all ears!",
      isUser: false,
      timestamp: new Date().toISOString(),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const handleVoiceInput = async (transcript: string) => {
    if (!transcript.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: transcript,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simulate more natural typing delay
    setTimeout(() => {
      const response = generateResponse(transcript);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.content,
        isUser: false,
        timestamp: new Date().toISOString(),
        relatedItems: response.relatedItems,
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  };

  const toggleListening = () => {
    if (isListening) {
      // Stop listening
      setIsListening(false);
      setIsProcessing(true);
      
      // Simulate voice processing
      setTimeout(() => {
        setIsProcessing(false);
        // In a real implementation, you'd process the actual voice input here
        handleVoiceInput("What's in my kitchen?"); // Demo response
      }, 1500);
    } else {
      // Start listening
      setIsListening(true);
      // In a real implementation, you'd start Web Speech API here
    }
  };

  if (embedded) {
    return (
      <div className="flex flex-col h-96">
        {/* Chat Header */}
        <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
            <Zap className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Tori</h3>
            <p className="text-sm text-gray-600">Your voice assistant</p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-600 font-medium">Listening</span>
            </div>
          </div>
        </div>

        {/* Voice Interface */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          {/* Big Microphone Button */}
          <div className="relative">
            <button
              onClick={toggleListening}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 animate-pulse scale-110'
                  : isProcessing
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 hover:shadow-emerald-500/25'
              }`}
            >
              {isProcessing ? (
                <Sparkles className="text-white animate-spin" size={48} />
              ) : isListening ? (
                <MicOff className="text-white" size={48} />
              ) : (
                <Mic className="text-white" size={48} />
              )}
            </button>

            {/* Listening Animation */}
            {isListening && (
              <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
            )}
          </div>

          {/* Status Text */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {isProcessing
                ? "Processing..."
                : isListening
                ? "I'm listening..."
                : "Tap to talk to Tori"
              }
            </h3>
            <p className="text-gray-600 text-sm max-w-xs">
              {isProcessing
                ? "Understanding what you said..."
                : isListening
                ? "Go ahead, ask me anything!"
                : "Ask about your items, rooms, or anything else!"
              }
            </p>
          </div>

          {/* Voice Waves Animation */}
          {isListening && (
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-emerald-500 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 20 + 10}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.5s'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Messages (Compact) */}
        {messages.length > 1 && (
          <div className="mt-4 max-h-32 overflow-y-auto space-y-2">
            {messages.slice(-2).map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${
                    message.isUser
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <p>{message.content}</p>
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
              <Zap className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Tori</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                <p className="text-white text-opacity-80 text-sm">Ready to listen</p>
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

        {/* Voice Interface */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-8">
          {/* Big Microphone Button */}
          <div className="relative">
            <button
              onClick={toggleListening}
              className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 animate-pulse scale-110'
                  : isProcessing
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 hover:shadow-emerald-500/25'
              }`}
            >
              {isProcessing ? (
                <Sparkles className="text-white animate-spin" size={56} />
              ) : isListening ? (
                <MicOff className="text-white" size={56} />
              ) : (
                <Mic className="text-white" size={56} />
              )}
            </button>

            {/* Listening Animation Rings */}
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
                <div className="absolute inset-0 rounded-full border-2 border-red-200 animate-ping" style={{ animationDelay: '0.5s' }}></div>
              </>
            )}
          </div>

          {/* Status Text */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {isProcessing
                ? "Processing..."
                : isListening
                ? "I'm listening..."
                : "Tap to talk to Tori"
              }
            </h3>
            <p className="text-gray-600 leading-relaxed max-w-sm">
              {isProcessing
                ? "Understanding what you said and finding your answer..."
                : isListening
                ? "Go ahead, ask me anything about your home inventory!"
                : "Just tap the microphone and ask me about your items, rooms, or anything else!"
              }
            </p>
          </div>

          {/* Voice Waves Animation */}
          {isListening && (
            <div className="flex items-center gap-2">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-emerald-500 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 30 + 15}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.6s'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Messages (Scrollable) */}
        {messages.length > 1 && (
          <div className="max-h-40 overflow-y-auto px-4 pb-4 space-y-3">
            {messages.slice(-3).map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${message.isUser ? 'order-1' : 'order-2'}`}>
                  {!message.isUser && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                        <Zap size={10} className="text-white" />
                      </div>
                      <span className="text-xs font-medium text-gray-600">Tori</span>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Volume2 size={10} />
                      </button>
                    </div>
                  )}

                  <div
                    className={`px-3 py-2 rounded-xl text-sm ${
                      message.isUser
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    <p className="leading-relaxed">{message.content}</p>
                  </div>

                  {message.relatedItems && message.relatedItems.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.relatedItems.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900">{item.name}</span>
                            <span className="text-gray-500 text-xs bg-gray-100 px-1 py-0.5 rounded">{item.room}</span>
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
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                      <Zap size={10} className="text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Tori is thinking...</span>
                  </div>
                  <div className="bg-gray-100 rounded-xl rounded-bl-md px-3 py-2">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};