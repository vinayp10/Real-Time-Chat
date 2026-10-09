import React, { useState } from 'react';
import { Search, MoreVertical, Phone, Video } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocketStore } from '../../stores/socketStore';
import Avatar from '../Common/Avatar';
import TypingIndicator from './TypingIndicator';

const ChatHeader = ({ onContactInfoClick }) => {
  const { activeConversation } = useChatStore();
  const { user } = useAuthStore();
  const { isUserOnline, typingUsers } = useSocketStore();
  const [showMenu, setShowMenu] = useState(false);

  if (!activeConversation) return null;

  const isGroup = activeConversation.type === 'group';
  const otherParticipant = !isGroup 
    ? activeConversation.participants.find(p => (p.user?._id || p.user) !== user._id)?.user
    : null;

  const isOnline = !isGroup && otherParticipant ? isUserOnline(otherParticipant._id) : false;
  
  const name = isGroup ? activeConversation.groupName : otherParticipant?.displayName;
  const avatar = isGroup ? activeConversation.groupAvatar : otherParticipant?.avatar;

  // Check if anyone is typing
  const typingKeys = Object.keys(typingUsers).filter(k => k.startsWith(activeConversation._id));
  const isTyping = typingKeys.length > 0;

  const startCall = (type) => {
    if (!activeConversation) return;
    const callData = {
      conversationId: activeConversation._id,
      callerName: user.displayName,
      callerAvatar: user.avatar,
      calleeName: name,
      calleeAvatar: avatar,
      isCaller: true,
      type
    };
    useSocketStore.getState().socket?.emit('call:initiate', callData);
    useSocketStore.getState().setActiveCall(callData);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-wa-dark-300 border-b border-gray-200 dark:border-wa-dark-200">
      <div className="flex items-center cursor-pointer" onClick={onContactInfoClick}>
        <Avatar src={avatar} alt={name} size="md" className="mr-3" />
        
        <div className="flex flex-col">
          <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
            {name}
          </h2>
          
          <div className="h-5">
            {isTyping ? (
              <TypingIndicator />
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isGroup 
                  ? activeConversation.participants.map(p => p.user?.displayName || '').join(', ')
                  : isOnline ? 'Online' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400">
        <button onClick={() => startCall('video')} className="p-1 hover:text-gray-700 dark:hover:text-gray-200">
          <Video className="w-5 h-5" />
        </button>
        <button onClick={() => startCall('audio')} className="p-1 hover:text-gray-700 dark:hover:text-gray-200">
          <Phone className="w-5 h-5" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-wa-dark-200 mx-2"></div>
        
        <button className="p-1 hover:text-gray-700 dark:hover:text-gray-200">
          <Search className="w-5 h-5" />
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-wa-dark-300 rounded-md shadow-lg z-50 border border-gray-200 dark:border-wa-dark-200 py-1">
              <button 
                onClick={() => { setShowMenu(false); onContactInfoClick?.(); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-wa-dark-200">
                Contact info
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-wa-dark-200">
                Select messages
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-wa-dark-200">
                Close chat
              </button>
              {!isGroup && (
                <button 
                  onClick={() => { setShowMenu(false); alert('SafetyNumberModal not wired in basic demo due to length'); }}
                  className="w-full text-left px-4 py-2 text-sm text-wa-teal-500 hover:bg-gray-100 dark:hover:bg-wa-dark-200 border-t border-gray-100 dark:border-wa-dark-200 mt-1 pt-2"
                >
                  Verify safety number
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
