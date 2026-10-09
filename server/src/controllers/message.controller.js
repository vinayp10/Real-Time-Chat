const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const getMessages = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': req.user._id
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a participant in this conversation' });
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: req.user._id }
    })
      .populate('sender', 'username displayName avatar publicKey')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const { ciphertext, iv, type, replyTo, fileName, fileSize, mimeType } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': req.user._id
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    const message = await Message.create({
      conversationId,
      sender: req.user._id,
      type: type || 'text',
      ciphertext,
      iv,
      replyTo,
      fileName,
      fileSize,
      mimeType,
      deliveredTo: [{ user: req.user._id }],
      readBy: [{ user: req.user._id }]
    });

    conversation.lastMessage = {
      text: type === 'text' ? 'Encrypted message' : `Encrypted ${type}`,
      sender: req.user._id,
      timestamp: new Date()
    };
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username displayName avatar publicKey')
      .populate('replyTo');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteForMe = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (!message.deletedFor.some(id => id.toString() === req.user._id.toString())) {
      message.deletedFor.push(req.user._id);
      await message.save();
    }

    res.json({ message: 'Message deleted for you' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteForEveryone = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    const oneHour = 60 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > oneHour) {
      return res.status(400).json({ message: 'Can only delete for everyone within 1 hour' });
    }

    message.deletedForEveryone = true;
    message.ciphertext = ''; // clear payload
    await message.save();

    res.json({ message: 'Message deleted for everyone' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  deleteForMe,
  deleteForEveryone
};
