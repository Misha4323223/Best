import { useState, useRef, useEffect } from "react";
import { MessageWithSender, UserWithInitials } from "@shared/schema";
import MessageBubble from "@/components/MessageBubble";
import BooomerangsLogo from "@/components/BooomerangsLogo";
import { AlertCircle, Send, Menu } from "lucide-react";

interface ChatAreaProps {
  messages: MessageWithSender[];
  currentUser: UserWithInitials;
  selectedUser: UserWithInitials | null;
  onSendMessage: (text: string) => void;
  onOpenSidebar: () => void;
  connectionStatus: "connected" | "disconnected";
}

const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  currentUser,
  selectedUser,
  onSendMessage,
  onOpenSidebar,
  connectionStatus
}) => {
  const [newMessage, setNewMessage] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMessage.trim() && selectedUser) {
      onSendMessage(newMessage.trim());
      setNewMessage("");
    }
  };
  
  // If no user is selected, show a welcome screen with logo
  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6"
        style={{
          background: 'radial-gradient(circle at center, rgba(219, 234, 254, 0.5) 0%, rgba(224, 231, 255, 0.2) 70%)'
        }}>
        <div className="text-center max-w-md p-10 rounded-3xl bg-white shadow-xl"
            style={{borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(59, 130, 246, 0.15)'}}>
          <div className="mb-8">
            <BooomerangsLogo size={140} className="mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-3 leading-tight"
              style={{
                backgroundImage: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent'
              }}>
              BOOOMERANGS AI
            </h1>
            <p className="text-gray-600 mb-8 text-lg">
              Бесплатный доступ к возможностям искусственного интеллекта без платных API ключей
            </p>
          </div>
          
          <div className="py-3 px-5 bg-blue-50 rounded-xl inline-flex items-center"
            style={{border: '1px solid rgba(59, 130, 246, 0.2)'}}>
            <span className="flex items-center text-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Выберите пользователя из списка слева, чтобы начать общение
            </span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col bg-white" 
         style={{boxShadow: '0 0 40px -10px rgba(0, 0, 0, 0.1)'}}>
      {/* Chat Header - Стильный современный заголовок */}
      <div className="border-b border-gray-100 p-4 flex items-center"
           style={{
             background: 'linear-gradient(145deg, rgba(219, 234, 254, 0.9), rgba(224, 231, 255, 0.9))',
             backdropFilter: 'blur(8px)',
             boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.1)'
           }}>
        <div className="lg:hidden mr-3">
          <button 
            className="p-1.5 rounded-full bg-white text-blue-600 hover:text-blue-800 transition-all shadow-md" 
            onClick={onOpenSidebar}
            style={{
              border: '1px solid rgba(59, 130, 246, 0.2)',
              boxShadow: '0 4px 10px -2px rgba(59, 130, 246, 0.2)'
            }}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex items-center justify-between flex-1">
          <div className="flex items-center">
            <div 
              className="w-12 h-12 rounded-full text-white flex items-center justify-center mr-3 flex-shrink-0" 
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)', 
                boxShadow: '0 4px 15px -2px rgba(59, 130, 246, 0.4)'
              }}
            >
              <span className="font-bold text-lg">{selectedUser.initials}</span>
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-xl">{selectedUser.username}</h2>
              <div className="flex items-center text-sm text-gray-600">
                <div className="relative flex items-center">
                  <span 
                    className={`w-3 h-3 rounded-full inline-block mr-1.5 ${selectedUser.isOnline ? '' : 'bg-gray-400'}`}
                    style={selectedUser.isOnline ? {
                      background: '#10b981', 
                      boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
                      animation: selectedUser.isOnline ? 'pulse 2s infinite' : 'none'
                    } : {}}
                  ></span>
                  <span>{selectedUser.isOnline ? 'В сети' : 'Не в сети'}</span>
                  <style jsx>{`
                    @keyframes pulse {
                      0% { opacity: 0.8; transform: scale(0.95); }
                      70% { opacity: 1; transform: scale(1.05); }
                      100% { opacity: 0.8; transform: scale(0.95); }
                    }
                  `}</style>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center bg-white py-2 px-5 rounded-full shadow-md"
               style={{border: '1px solid rgba(59, 130, 246, 0.15)'}}>
            <BooomerangsLogo size={30} className="mr-3" />
            <span 
              className="font-bold text-lg tracking-tight" 
              style={{
                background: 'linear-gradient(to right, #3b82f6, #6366f1, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              BOOOMERANGS AI
            </span>
          </div>
        </div>
      </div>
      
      {/* Messages Area - Современный дизайн чата */}
      <div 
        ref={messagesContainerRef} 
        className="flex-1 overflow-y-auto p-5"
        style={{
          background: 'radial-gradient(circle at center, rgba(243, 244, 246, 0.6) 0%, rgba(249, 250, 251, 0.9) 100%)',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="space-y-5 max-w-5xl mx-auto">
          {/* Начальное сообщение с улучшенным дизайном */}
          {messages.length === 0 && (
            <div className="flex justify-center my-8">
              <div 
                className="bg-white px-6 py-4 rounded-2xl text-gray-700 flex items-center"
                style={{
                  boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.1)'
                }}
              >
                <BooomerangsLogo size={24} className="mr-3" />
                <span>
                  <span 
                    className="font-bold"
                    style={{
                      background: 'linear-gradient(to right, #3b82f6, #6366f1)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    BOOOMERANGS AI
                  </span> готов к диалогу с {selectedUser.username}
                </span>
              </div>
            </div>
          )}
          
          {/* Список сообщений с анимацией появления */}
          <div className="space-y-5">
            {messages.map((message, index) => (
              <div 
                key={message.id} 
                style={{
                  animation: 'fadeIn 0.3s ease-out',
                  animationFillMode: 'both',
                  animationDelay: `${index * 0.05}s`
                }}
              >
                <MessageBubble
                  message={message}
                  isCurrentUser={message.senderId === currentUser.id}
                />
                <style jsx>{`
                  @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Message Input Area - Современный дизайн ввода сообщений */}
      <div 
        className="border-t border-gray-100 p-4 bg-white"
        style={{
          boxShadow: '0 -4px 20px -5px rgba(0, 0, 0, 0.05)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          marginTop: '-20px',
          position: 'relative',
          zIndex: 10
        }}
      >
        {connectionStatus === "disconnected" && (
          <div 
            className="mb-4 p-3 rounded-xl text-sm flex items-center mx-auto max-w-md" 
            style={{
              background: 'rgba(248, 113, 113, 0.1)', 
              color: '#ef4444', 
              border: '1px solid rgba(248, 113, 113, 0.2)',
              animation: 'pulse 2s infinite ease-in-out'
            }}
          >
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <span>Соединение потеряно. Выполняется автоматическое переподключение...</span>
            <style jsx>{`
              @keyframes pulse {
                0% { opacity: 0.8; }
                50% { opacity: 1; }
                100% { opacity: 0.8; }
              }
            `}</style>
          </div>
        )}
        
        <div className="flex items-center max-w-5xl mx-auto">
          <div className="hidden sm:flex mr-4">
            <BooomerangsLogo size={36} />
          </div>
          <form onSubmit={handleSubmit} className="flex-1 flex items-center space-x-3">
            <div className="relative flex-1">
              <input 
                type="text" 
                className="w-full px-6 py-4 border bg-white text-gray-800 text-base"
                style={{
                  borderRadius: '16px',
                  borderColor: 'rgba(209, 213, 219, 0.5)',
                  boxShadow: '0 2px 15px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                placeholder="Введите сообщение..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={connectionStatus === "disconnected"}
                onFocus={(e) => {
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  e.target.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = '0 2px 15px rgba(0, 0, 0, 0.04)';
                  e.target.style.borderColor = 'rgba(209, 213, 219, 0.5)';
                }}
              />
            </div>
            <button 
              type="submit" 
              className="p-4 text-white rounded-xl flex items-center justify-center disabled:opacity-50 transition-all duration-300"
              style={{
                background: newMessage.trim() && !connectionStatus.includes("disconnected") ? 
                            'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)' : 
                            'linear-gradient(135deg, #93c5fd, #a5b4fc)',
                boxShadow: newMessage.trim() && !connectionStatus.includes("disconnected") ? 
                            '0 4px 15px -2px rgba(59, 130, 246, 0.4)' : 
                            '0 4px 10px -5px rgba(59, 130, 246, 0.3)',
                transform: newMessage.trim() && !connectionStatus.includes("disconnected") ? 
                            'scale(1)' : 'scale(0.95)'
              }}
              disabled={connectionStatus === "disconnected" || !newMessage.trim()}
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
