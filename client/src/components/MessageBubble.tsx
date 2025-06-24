import { MessageWithSender } from "@shared/schema";

interface MessageBubbleProps {
  message: MessageWithSender;
  isCurrentUser: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser }) => {
  // Format timestamp
  const messageTime = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  if (isCurrentUser) {
    return (
      <div className="flex items-end justify-end mb-4">
        <div className="flex flex-col space-y-1 items-end">
          <div 
            className="p-3 max-w-[80%] break-words text-white relative"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              borderRadius: '18px 18px 4px 18px',
              boxShadow: '0 4px 15px -3px rgba(59, 130, 246, 0.3)'
            }}
          >
            <p className="text-[15px]">{message.text}</p>
            <div 
              className="absolute w-3 h-3 transform rotate-45 z-[-1]"
              style={{
                bottom: '-5px',
                right: '-2px',
                background: '#6366f1'
              }}
            ></div>
          </div>
          <div className="flex items-center text-xs text-gray-500 pr-2 mt-1">
            <span>{messageTime}</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 ml-1" 
              style={{color: '#3b82f6'}}
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              {message.status === "read" ? 
                <path d="M18 6L9 17l-5-5"/> : 
                <path d="M5 12l5 5L20 7"/>
              }
            </svg>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-end mb-4">
      <div className="flex flex-col space-y-1 max-w-[80%]">
        <div className="flex items-end">
          <div 
            className="w-8 h-8 rounded-full text-white flex items-center justify-center mr-2 flex-shrink-0 mb-1"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              boxShadow: '0 4px 10px -2px rgba(99, 102, 241, 0.3)'
            }}
          >
            <span className="font-medium">{message.sender.initials}</span>
          </div>
          <div 
            className="p-3 break-words relative bg-white"
            style={{
              borderRadius: '18px 18px 18px 4px',
              boxShadow: '0 4px 15px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(243, 244, 246, 1)'
            }}
          >
            <p className="text-[15px] text-gray-800">{message.text}</p>
            <div 
              className="absolute w-3 h-3 transform rotate-45 z-[-1]"
              style={{
                bottom: '-5px',
                left: '-2px',
                background: 'white',
                borderBottom: '1px solid rgba(243, 244, 246, 1)',
                borderLeft: '1px solid rgba(243, 244, 246, 1)'
              }}
            ></div>
          </div>
        </div>
        <div className="flex items-center">
          <span className="text-xs text-gray-500 ml-10">{messageTime}</span>
          {message.sender.username === "BOOOMERANGS AI" && (
            <span 
              className="ml-2 text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                fontWeight: '500'
              }}
            >
              AI
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
