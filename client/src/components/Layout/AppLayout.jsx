import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import ChatArea from '../Chat/ChatArea';
import { useChatStore } from '../../stores/chatStore';
import { useSocket } from '../../hooks/useSocket';
import CallModal from '../Modals/CallModal';

const AppLayout = () => {
  const { activeConversation } = useChatStore();
  useSocket(); // Initialize socket connection

  return (
    <div className="flex h-screen w-full bg-wa-dark-100 dark:bg-wa-dark-600 overflow-hidden">
      {/* Mobile: hide sidebar if conversation active, Desktop: always show sidebar */}
      <div className={`w-full md:w-[30%] lg:w-[25%] h-full flex-shrink-0 border-r border-gray-200 dark:border-wa-dark-300 ${activeConversation ? 'hidden md:block' : 'block'}`}>
        <Sidebar />
      </div>

      {/* Mobile: hide chat if no conversation active, Desktop: always show chat area */}
      <div className={`w-full md:w-[70%] lg:w-[75%] h-full flex-col ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        <ChatArea />
      </div>

      {/* WebRTC Call UI */}
      <CallModal />
    </div>
  );
};

export default AppLayout;
