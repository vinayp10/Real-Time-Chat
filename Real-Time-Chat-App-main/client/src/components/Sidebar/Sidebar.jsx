import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, LogOut, Moon, Sun, Key } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useThemeStore } from '../../stores/themeStore';
import Avatar from '../Common/Avatar';
import ConversationItem from './ConversationItem';
import SearchUsers from './SearchUsers';
import NewGroupModal from './NewGroupModal';
import ProfilePanel from '../Profile/ProfilePanel';

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const { conversations, fetchConversations, activeConversation } = useChatStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  
  const [showSearch, setShowSearch] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = conv.type === 'group' ? conv.groupName : conv.participants.find(p => (p.user?._id || p.user) !== user._id)?.user?.displayName;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-wa-dark-400 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-wa-dark-300 border-b border-gray-200 dark:border-wa-dark-200">
        <div onClick={() => setShowProfilePanel(true)} className="cursor-pointer">
          <Avatar src={user?.avatar} alt={user?.displayName} />
        </div>
        
        <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400">
          <button onClick={() => setShowGroupModal(true)} title="New Group">
            <Plus className="w-6 h-6 hover:text-gray-700 dark:hover:text-gray-200" />
          </button>
          
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} title="Menu">
              <MoreVertical className="w-6 h-6 hover:text-gray-700 dark:hover:text-gray-200" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-wa-dark-300 rounded-md shadow-lg z-50 border border-gray-200 dark:border-wa-dark-200 py-1">
                <button 
                  onClick={toggleDarkMode}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-wa-dark-200 flex items-center"
                >
                  {darkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button 
                  onClick={() => { setShowMenu(false); setShowProfilePanel(true); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-wa-dark-200 flex items-center"
                >
                  Profile
                </button>
                <button 
                  onClick={() => { setShowMenu(false); alert('KeyBackupModal not wired in basic demo due to length'); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-wa-dark-200 flex items-center"
                >
                  <Key className="w-4 h-4 mr-2" /> Backup Keys
                </button>
                <button 
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-wa-dark-200 flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 bg-white dark:bg-wa-dark-400 border-b border-gray-200 dark:border-wa-dark-200">
        <div className="relative flex items-center bg-gray-100 dark:bg-wa-dark-300 rounded-lg px-3 py-1.5">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search or start new chat"
            className="w-full ml-3 bg-transparent outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearch(true)}
          />
          {showSearch && (
            <button 
              onClick={() => { setShowSearch(false); setSearchQuery(''); }}
              className="text-xs text-wa-teal-500 font-medium ml-2"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Conversation List or Search Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {showSearch ? (
          <SearchUsers onClose={() => { setShowSearch(false); setSearchQuery(''); }} />
        ) : (
          filteredConversations.length > 0 ? (
            filteredConversations.map(conv => (
              <ConversationItem 
                key={conv._id} 
                conversation={conv} 
                isActive={activeConversation?._id === conv._id}
              />
            ))
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              No chats found.
            </div>
          )
        )}
      </div>

      {showGroupModal && <NewGroupModal onClose={() => setShowGroupModal(false)} />}
      
      {/* Profile Panel - Slide In */}
      <div 
        className={`absolute inset-0 z-40 bg-white dark:bg-wa-dark-400 transform transition-transform duration-300 ease-in-out ${showProfilePanel ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {showProfilePanel && <ProfilePanel onClose={() => setShowProfilePanel(false)} />}
      </div>
    </div>
  );
};

export default Sidebar;
