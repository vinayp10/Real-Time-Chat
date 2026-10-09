import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import MessageBubble from './MessageBubble';
import LoadingSpinner from '../Common/LoadingSpinner';

const MessageList = () => {
  const { activeConversation, messages, fetchMessages } = useChatStore();
  const { user } = useAuthStore();
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const convMessages = activeConversation ? messages[activeConversation._id] || [] : [];

  useEffect(() => {
    if (activeConversation) {
      setPage(1);
      fetchMessages(activeConversation._id, 1);
    }
  }, [activeConversation, fetchMessages]);

  useEffect(() => {
    // Scroll to bottom on new message
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages.length]);

  const handleScroll = (e) => {
    if (e.target.scrollTop === 0 && !loading && convMessages.length >= 20) {
      setLoading(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(activeConversation._id, nextPage).then(() => setLoading(false));
    }
  };

  return (
    <div 
      className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col space-y-2 relative"
      onScroll={handleScroll}
      ref={containerRef}
    >
      {loading && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-wa-dark-300 rounded-full p-1 shadow-md z-10">
          <LoadingSpinner size="sm" />
        </div>
      )}
      
      {convMessages.length > 0 ? (
        convMessages.map((msg, index) => {
          const senderId = msg.sender?._id || msg.sender;
          const isOwn = senderId === user._id;
          const nextSenderId = convMessages[index + 1]?.sender?._id || convMessages[index + 1]?.sender;
          const showTail = index === convMessages.length - 1 || nextSenderId !== senderId;
          
          return (
            <MessageBubble 
              key={msg._id} 
              message={msg} 
              isOwn={isOwn} 
              showTail={showTail}
              conversation={activeConversation}
            />
          );
        })
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="bg-[#ffeecd] dark:bg-wa-dark-300 px-4 py-2 rounded-lg text-sm text-gray-800 dark:text-gray-200 text-center max-w-sm shadow-sm">
            <span className="block font-medium mb-1">Messages are end-to-end encrypted.</span>
            No one outside of this chat, not even ChatApp, can read or listen to them.
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
