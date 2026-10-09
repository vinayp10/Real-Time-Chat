const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const socketHandlers = (io, socket, onlineUsers) => {
  const userId = socket.user._id.toString();

  // Handle multiple tabs (set of socket IDs)
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  // Join personal room for direct user-to-user events (like new conversations)
  socket.join(userId);

  const broadcastOnlineStatus = async () => {
    socket.user.isOnline = true;
    await socket.user.save();
    
    // Broadcast to everyone else that this user is online
    socket.broadcast.emit('user:online', userId);
    
    // Send the current list of online users to the newly connected user
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit('online_users', onlineUserIds);
  };

  broadcastOnlineStatus();

  socket.on('conversation:join', async (conversationId) => {
    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        'participants.user': userId,
      }).select('_id');
      if (conversation) socket.join(conversation._id.toString());
    } catch (error) {
      console.error('Conversation room join failed:', error.message);
    }
  });

  const broadcastToParticipants = async (conversationId, event, data) => {
    socket.to(conversationId.toString()).emit(event, data);
    try {
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        conversation.participants.forEach(p => {
          const participantId = p.user.toString();
          if (participantId !== userId) {
            socket.to(participantId).emit(event, data);
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  socket.on('message:send', async (data) => {
    const conversationId = data?.conversationId;
    const messageId = data?._id;
    if (!conversationId || !messageId) return;

    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        'participants.user': userId,
      }).select('_id');
      if (!conversation) return;

      const message = await Message.findOne({
        _id: messageId,
        conversationId,
        sender: userId,
      })
        .populate('sender', 'username displayName avatar publicKey')
        .populate('replyTo');
      if (!message || !message.ciphertext || !message.iv) return;

      await broadcastToParticipants(conversationId, 'message:receive', {
        ...message.toObject(),
        conversationId: conversation._id.toString(),
      });
    } catch (error) {
      console.error('Message relay validation failed:', error.message);
    }
  });

  socket.on('message:delivered', async (data) => {
    broadcastToParticipants(data.conversationId, 'message:delivered', data);
    try {
      await Message.findByIdAndUpdate(data.messageId, {
        $addToSet: { deliveredTo: { user: userId } }
      });
    } catch (err) {
      console.error('Delivered status update failed:', err);
    }
  });

  socket.on('message:read', async (data) => {
    broadcastToParticipants(data.conversationId, 'message:read', data);
    try {
      await Message.findByIdAndUpdate(data.messageId, {
        $addToSet: { readBy: { user: userId } }
      });
    } catch (err) {
      console.error('Read status update failed:', err);
    }
  });

  socket.on('typing:start', (conversationId) => {
    broadcastToParticipants(conversationId, 'typing:start', {
      conversationId,
      userId
    });
  });

  socket.on('typing:stop', (conversationId) => {
    broadcastToParticipants(conversationId, 'typing:stop', {
      conversationId,
      userId
    });
  });

  // WebRTC Signaling
  socket.on('call:initiate', (data) => {
    broadcastToParticipants(data.conversationId, 'call:incoming', { ...data, callerId: userId });
  });

  socket.on('call:accept', (data) => {
    broadcastToParticipants(data.conversationId, 'call:accepted', { ...data, acceptorId: userId });
  });

  socket.on('call:reject', (data) => {
    broadcastToParticipants(data.conversationId, 'call:rejected', { ...data, rejectorId: userId });
  });

  socket.on('call:end', (data) => {
    broadcastToParticipants(data.conversationId, 'call:ended', { ...data, enderId: userId });
  });

  socket.on('webrtc:offer', (data) => {
    broadcastToParticipants(data.conversationId, 'webrtc:offer', data);
  });

  socket.on('webrtc:answer', (data) => {
    broadcastToParticipants(data.conversationId, 'webrtc:answer', data);
  });

  socket.on('webrtc:ice-candidate', (data) => {
    broadcastToParticipants(data.conversationId, 'webrtc:ice-candidate', data);
  });

  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.user.username}`);
    
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      
      // If no more sockets for this user, they are truly offline
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        
        try {
          const user = await User.findById(userId);
          if (user) {
            user.isOnline = false;
            user.lastSeen = new Date();
            await user.save();
            socket.broadcast.emit('user:offline', {
              userId,
              lastSeen: user.lastSeen
            });
          }
        } catch (error) {
          console.error('Error updating offline status:', error);
        }
      }
    }
  });
};

module.exports = socketHandlers;
