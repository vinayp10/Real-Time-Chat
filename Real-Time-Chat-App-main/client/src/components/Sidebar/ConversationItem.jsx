import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useSocketStore } from '../../stores/socketStore';
import { useCrypto } from '../../hooks/useCrypto';
import Avatar from '../Common/Avatar';

const ConversationItem = ({ conversation, isActive }) => {
  const { user } = useAuthStore();
  const { setActiveConversation, unreadCounts } = useChatStore();
  const { isUserOnline } = useSocketStore();
  const { decrypt } = useCrypto();
  const [decryptedPreview, setDecryptedPreview] = useState('');

  const isGroup = conversation.type === 'group';
  const otherParticipant = !isGroup 
    ? conversation.participants.find(p => (p.user?._id || p.user) !== user._id)?.user
    : null;

  const isOnline = !isGroup && otherParticipant ? isUserOnline(otherParticipant._id) : false;
  
  const name = isGroup ? conversation.groupName : otherParticipant?.displayName;
  const avatar = isGroup ? conversation.groupAvatar : otherParticipant?.avatar;
  const lastMessage = conversation.lastMessage;
  const unreadCount = unreadCounts[conversation._id] || 0;

  useEffect(() => {
    let isMounted = true;
    const decryptPreview = async () => {
      if (!lastMessage || !lastMessage.text) return;

      if (lastMessage.text === 'Encrypted message' && conversation.type === 'private') {
        // Last message text is just a placeholder, the actual preview would need the ciphertext.
        // For simplicity in UI preview:
        if (isMounted) setDecryptedPreview('Encrypted message');
      } else {
        if (isMounted) setDecryptedPreview(lastMessage.text || '');
      }
    };
    decryptPreview();
    return () => { isMounted = false; };
  }, [lastMessage, conversation, user, decrypt]);

  return (
    <div 
      onClick={() => setActiveConversation(conversation)}
      className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-wa-dark-300 transition-colors ${
        isActive ? 'bg-gray-100 dark:bg-wa-dark-300' : ''
      }`}
    >
      <div className="relative mr-3">
        <Avatar src={avatar} alt={name} size="md" />
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-wa-dark-400 rounded-full"></span>
        )}
      </div>
      
      <div className="flex-1 min-w-0 border-b border-gray-100 dark:border-wa-dark-200 pb-3">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="text-base font-normal text-gray-900 dark:text-gray-100 truncate">
            {name}
          </h3>
          {lastMessage?.timestamp && (
            <span className={`text-xs ${unreadCount > 0 ? 'text-wa-teal-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
              {format(new Date(lastMessage.timestamp), 'HH:mm')}
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate pr-4">
            {decryptedPreview || 'No messages yet'}
          </p>
          {unreadCount > 0 && (
            <span className="bg-wa-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
