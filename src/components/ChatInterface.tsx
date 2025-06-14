import React, { useState, useRef, useEffect } from 'react';
import { Mic, Zap, Volume2 } from 'lucide-react';
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
      content: "Hey! I'm Tori! Just hold the microphone and talk to me. Ask me anything about your home inventory!",
      isUser: false,
      timestamp: new Date().toISOString(),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

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
        content: `You've got ${totalItems} items! They're spread across ${rooms.length} different rooms. Pretty organized!`
      };
    }

    if (lowerQuery.includes('expensive') || lowerQuery.includes('valuable') || lowerQuery.includes('worth')) {
      const valuableItems = items
        .filter(item => item.estimatedValue && item.estimatedValue > 100)
        .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0))
        .slice(0, 3);

      if (valuableItems.length > 0) {
        return {
          content: `Here are your most valuable items:`,
          relatedItems: valuableItems
        };
      } else {
        return {
          content: `Looks like you haven't added prices to your items yet, or everything's under $100. That's totally fine!`
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
          content: `Found ${roomItems.length} things in your ${room}:`,
          relatedItems: roomItems.slice(0, 5)
        };
      } else {
        return {
          content: `I don't see anything in your ${room} yet. Maybe it's time to add some stuff?`
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
          content: `Found ${foundItems.length} items matching "${searchTerms}":`,
          relatedItems: foundItems.slice(0, 5)
        };
      } else {
        return {
          content: `Couldn't find anything matching "${searchTerms}". Maybe try a different search term?`
        };
      }
    }

    if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
      return {
        content: `Hey there! I'm Tori, and I know everything about your home inventory. What can I help you find?`
      };
    }

    if (lowerQuery.includes('thank') || lowerQuery.includes('thanks')) {
      return {
        content: `You're so welcome! I love helping you stay organized. Anything else?`
      };
    }

    const responses = [
      "I'm here to help with your inventory! Try asking about specific rooms or items.",
      "You can ask me about your rooms, categories, or search for specific items!",
      "I'm great at finding your stuff - try asking 'What's in my kitchen?' or 'Find my laptop'.",
      "Ask me about your most valuable items, room distributions, or search for anything specific!"
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
    }, 800);
  };

  const handleMouseDown = () => {
    setIsListening(true);
    // In a real implementation, start Web Speech API here
  };

  const handleMouseUp = () => {
    if (isListening) {
      setIsListening(false);
      setIsProcessing(true);
      
      // Simulate voice processing
      timeoutRef.current = setTimeout(() => {
        setIsProcessing(false);
        // Demo response - in real implementation, process actual voice input
        handleVoiceInput("What's in my kitchen?");
      }, 1500);
    }
  };

  const handleMouseLeave = () => {
    if (isListening) {
      handleMouseUp();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (embedded) {
    return (
      <div className="flex flex-col h-full min-h-[500px]">
        {/* Voice Interface - Main Focus */}
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          {/* Big Microphone Button */}
          <div className="relative mb-8">
            <button
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleMouseDown}
              onTouchEnd={handleMouseUp}
              className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl select-none ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 scale-110 shadow-red-500/25'
                  : isProcessing
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/25'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 hover:shadow-emerald-500/25'
              }`}
            >
              {isProcessing ? (
                <Zap className="text-white animate-spin" size={56} />
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
            <h3 className="text-3xl font-bold text-gray-900 mb-3">
              {isProcessing
                ? "Processing..."
                : isListening
                ? "Listening..."
                : "Hold to talk"
              }
            </h3>
            <p className="text-gray-600 text-lg">
              {isProcessing
                ? "Tori is thinking..."
                : isListening
                ? "I'm all ears! 👂"
                : "Press and hold the microphone"
              }
            </p>
          </div>
        </div>

        {/* Recent Messages - Compact at Bottom */}
        {messages.length > 1 && (
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-sm font-semibold text-gray-500 mb-4 text-center">Recent conversation</h4>
            <div className="max-h-48 overflow-y-auto space-y-3">
              {messages.slice(-3).map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.isUser ? 'order-1' : 'order-2'}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm ${
                        message.isUser
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      }`}
                    >
                      <p className="leading-relaxed">{message.content}</p>
                    </div>

                    {message.relatedItems && message.relatedItems.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.relatedItems.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className="bg-white border border-gray-200 rounded-xl p-3 text-sm shadow-sm"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-900">{item.name}</span>
                              <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded-full">{item.room}</span>
                            </div>
                            {item.estimatedValue && (
                              <div>
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
              <p className="text-white text-opacity-80 text-sm">Voice assistant</p>
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
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleMouseDown}
              onTouchEnd={handleMouseUp}
              className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl select-none ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 scale-110'
                  : isProcessing
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 hover:shadow-emerald-500/25'
              }`}
            >
              {isProcessing ? (
                <Zap className="text-white animate-spin" size={56} />
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
                ? "Listening..."
                : "Hold to talk"
              }
            </h3>
          </div>
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
                <div className="bg-gray-100 rounded-xl rounded-bl-md px-3 py-2">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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