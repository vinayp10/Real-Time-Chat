import { create } from 'zustand';
import { io } from 'socket.io-client';
import { useChatStore } from './chatStore';

export const useSocketStore = create((set, get) => ({
  socket: null,
  onlineUsers: new Map(),
  typingUsers: {},
  
  // Call State
  incomingCall: null,
  activeCall: null,

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),
  clearCall: () => set({ incomingCall: null, activeCall: null }),

  connect: () => {
    if (get().socket?.connected) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL
      || import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '')
      || window.location.origin;
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // Join all conversation rooms
      const conversations = useChatStore.getState().conversations;
      conversations.forEach((conv) => {
        socket.emit('conversation:join', conv._id);
      });
    });

    // Online status events
    socket.on('user:online', (userId) => {
      set((state) => {
        const newOnline = new Map(state.onlineUsers);
        newOnline.set(userId, true);
        return { onlineUsers: newOnline };
      });
    });

    socket.on('user:offline', ({ userId }) => {
      set((state) => {
        const newOnline = new Map(state.onlineUsers);
        newOnline.delete(userId);
        return { onlineUsers: newOnline };
      });
    });

    // Message events — server emits 'message:receive'
    socket.on('message:receive', (message) => {
      if (!message?._id || !message.ciphertext || !message.iv || !message.sender || !message.conversationId) {
        return;
      }

      useChatStore.getState().addMessage(message);
      useChatStore.getState().fetchConversations();

      const activeConv = useChatStore.getState().activeConversation;
      if (activeConv?._id === message.conversationId) {
        socket.emit('message:read', {
          messageId: message._id,
          conversationId: message.conversationId,
        });
      } else {
        socket.emit('message:delivered', {
          messageId: message._id,
          conversationId: message.conversationId,
        });
      }
    });

    socket.on('message:delivered', ({ messageId }) => {
      useChatStore.getState().updateMessageStatus(messageId, 'delivered');
    });

    socket.on('message:read', ({ messageId }) => {
      useChatStore.getState().updateMessageStatus(messageId, 'read');
    });

    // Typing events — server emits 'typing:start' / 'typing:stop'
    socket.on('typing:start', ({ conversationId, userId }) => {
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [`${conversationId}_${userId}`]: true,
        },
      }));
    });

    socket.on('typing:stop', ({ conversationId, userId }) => {
      set((state) => {
        const newTyping = { ...state.typingUsers };
        delete newTyping[`${conversationId}_${userId}`];
        return { typingUsers: newTyping };
      });
    });

    // Conversation updates
    socket.on('conversation:updated', () => {
      useChatStore.getState().fetchConversations();
    });

    // Call events
    socket.on('call:incoming', (data) => {
      // Don't interrupt if already in a call
      if (get().activeCall) {
        socket.emit('call:reject', { conversationId: data.conversationId });
        return;
      }
      set({ incomingCall: data });
    });

    socket.on('call:ended', () => {
      set({ incomingCall: null, activeCall: null });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, onlineUsers: new Map(), typingUsers: {} });
    }
  },

  joinConversation: (convId) => {
    const { socket } = get();
    if (socket) socket.emit('conversation:join', convId);
  },

  sendMessage: (data) => {
    const { socket } = get();
    if (socket) socket.emit('message:send', data);
  },

  markDelivered: (data) => {
    const { socket } = get();
    if (socket) socket.emit('message:delivered', data);
  },

  markRead: (data) => {
    const { socket } = get();
    if (socket) socket.emit('message:read', data);
  },

  startTyping: (convId) => {
    const { socket } = get();
    if (socket) socket.emit('typing:start', convId);
  },

  stopTyping: (convId) => {
    const { socket } = get();
    if (socket) socket.emit('typing:stop', convId);
  },

  isUserOnline: (userId) => {
    return get().onlineUsers.has(userId);
  },
}));
