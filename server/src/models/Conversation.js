const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['private', 'group'],
    required: true
  },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now }
  }],
  groupName: String,
  groupAvatar: String,
  groupAdmin: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  encryptedGroupKeys: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    encryptedKey: String,
    iv: String
  }],
  lastMessage: {
    text: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: Date
  }
}, {
  timestamps: true
});

conversationSchema.index({ 'participants.user': 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
