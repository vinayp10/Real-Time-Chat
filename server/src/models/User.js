const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: 'https://www.gravatar.com/avatar/?d=mp'
  },
  about: {
    type: String,
    default: 'Hey there! I am using ChatApp'
  },
  publicKey: {
    type: String
  },
  lastSeen: {
    type: Date
  },
  isOnline: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
