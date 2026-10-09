import { create } from 'zustand';
import api from '../utils/api';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: {},
  unreadCounts: {},
  
  fetchConversations: async () => {
    try {
      const res = await api.get('/conversations');
      set({ conversations: res.data });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  },

  setActiveConversation: (conv) => {
    set({ activeConversation: conv });
    if (conv) {
      get().clearUnread(conv._id);
    }
  },

  fetchMessages: async (convId, page = 1) => {
    try {
      const res = await api.get(`/messages/${convId}?page=${page}`);
      set((state) => {
        const existingMessages = state.messages[convId] || [];
        // Prevent duplicate messages on pagination
        const newMessages = res.data.filter(
          newMsg => !existingMessages.some(existingMsg => existingMsg._id === newMsg._id)
        );
        return {
          messages: {
            ...state.messages,
            [convId]: [...existingMessages, ...newMessages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          }
        };
      });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  },

  addMessage: (msg) => {
    set((state) => {
      const convId = msg.conversationId;
      const currentMessages = state.messages[convId] || [];
      
      // Prevent duplicates
      if (currentMessages.some(m => m._id === msg._id)) {
        return state;
      }
      
      const updatedMessages = [...currentMessages, msg];
      
      const isUnread = state.activeConversation?._id !== convId;
      const newUnreadCounts = { ...state.unreadCounts };
      if (isUnread) {
        newUnreadCounts[convId] = (newUnreadCounts[convId] || 0) + 1;
      }

      return {
        messages: { ...state.messages, [convId]: updatedMessages },
        unreadCounts: newUnreadCounts
      };
    });
  },

  updateMessageStatus: (msgId, status) => {
    set((state) => {
      const newMessages = { ...state.messages };
      for (const convId in newMessages) {
        newMessages[convId] = newMessages[convId].map(msg => 
          msg._id === msgId ? { ...msg, status } : msg
        );
      }
      return { messages: newMessages };
    });
  },

  deleteMessage: async (msgId, type = 'everyone') => {
    try {
      await api.delete(`/messages/${msgId}/${type}`);
      set((state) => {
        const newMessages = { ...state.messages };
        for (const convId in newMessages) {
          newMessages[convId] = newMessages[convId].filter(msg => msg._id !== msgId);
        }
        return { messages: newMessages };
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  },

  clearUnread: (convId) => {
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [convId]: 0 }
    }));
  }
}));
