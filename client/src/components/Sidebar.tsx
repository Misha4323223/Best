import { UserWithInitials } from "@shared/schema";

interface SidebarProps {
  users: UserWithInitials[];
  currentUser: UserWithInitials;
  selectedUser: UserWithInitials | null;
  onSelectUser: (user: UserWithInitials) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  users,
  currentUser,
  selectedUser,
  onSelectUser,
  isOpen,
  onToggle
}) => {
  // Count online users
  const onlineCount = users.filter(user => user.isOnline).length;
  
  // Get background colors for initials
  const getBackgroundColor = (index: number) => {
    const colors = ["bg-primary", "bg-secondary", "bg-accent"];
    return colors[index % colors.length];
  };
  
  return (
    <div className={`w-64 bg-white border-r border-neutral-200 flex flex-col h-full ${!isOpen ? 'hidden lg:block' : ''}`}>
      <div className="p-4 border-b border-neutral-200">
        <h2 className="font-semibold text-neutral-900">Users</h2>
        <div className="flex items-center text-sm mt-2 text-neutral-700">
          <span className="status-dot bg-status-success mr-1.5 w-2 h-2 rounded-full inline-block"></span>
          <span>{onlineCount} online</span>
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1">
        <ul className="divide-y divide-neutral-200">
          {users.map((user, index) => (
            <li key={user.id} className="hover:bg-neutral-100 transition-colors">
              <button 
                className={`w-full text-left p-3 focus:outline-none focus:bg-neutral-100 ${selectedUser?.id === user.id ? 'bg-neutral-100' : ''}`}
                onClick={() => onSelectUser(user)}
              >
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full ${getBackgroundColor(index)} text-white flex items-center justify-center mr-3 flex-shrink-0`}>
                    <span>{user.initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.username}</p>
                    <div className="flex items-center text-sm text-neutral-700">
                      <span className={`status-dot ${user.isOnline ? 'bg-status-success' : 'bg-neutral-700'} mr-1.5 w-2 h-2 rounded-full inline-block`}></span>
                      <span>{user.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
          
          {users.length === 0 && (
            <li className="p-4 text-neutral-700 text-sm text-center">
              No other users available
            </li>
          )}
        </ul>
      </div>
      
      <div className="border-t border-neutral-200 p-4">
        <button 
          className="lg:hidden w-full py-2 text-center border border-neutral-200 rounded-md text-neutral-700 hover:bg-neutral-100 focus:outline-none"
          onClick={onToggle}
        >
          <span className="material-icons align-middle text-sm mr-1">menu</span>
          <span>Toggle Sidebar</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
