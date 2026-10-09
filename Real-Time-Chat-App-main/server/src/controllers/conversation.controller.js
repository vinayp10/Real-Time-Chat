const Conversation = require('../models/Conversation');
const User = require('../models/User');

const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      'participants.user': req.user._id
    })
      .populate('participants.user', 'username displayName avatar isOnline lastSeen publicKey email phoneNumber')
      .populate('lastMessage.sender', 'username displayName')
      .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrCreatePrivateConversation = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    
    let conversation = await Conversation.findOne({
      type: 'private',
      'participants.user': { $all: [req.user._id, targetUserId] }
    }).populate('participants.user', 'username displayName avatar isOnline lastSeen publicKey email phoneNumber');

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'private',
        participants: [
          { user: req.user._id },
          { user: targetUserId }
        ]
      });
      conversation = await conversation.populate('participants.user', 'username displayName avatar isOnline lastSeen publicKey email phoneNumber');
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createGroup = async (req, res) => {
  try {
    const { participants, groupName, encryptedGroupKeys } = req.body;
    const uniqueParticipants = [...new Set([
      ...participants.map((participantId) => participantId.toString()),
      req.user._id.toString(),
    ])];
    if (uniqueParticipants.length > 50) {
      return res.status(400).json({ message: 'Group limit is 50 members' });
    }

    const wrappedMemberIds = encryptedGroupKeys.map((entry) => entry.user.toString());
    if (new Set(wrappedMemberIds).size !== uniqueParticipants.length
      || uniqueParticipants.some((participantId) => !wrappedMemberIds.includes(participantId))) {
      return res.status(400).json({ message: 'Every group member must have an encrypted group key.' });
    }

    const usersWithKeys = await User.find({
      _id: { $in: uniqueParticipants },
      publicKey: { $type: 'string', $nin: ['', null] },
    }).select('_id');
    if (usersWithKeys.length !== uniqueParticipants.length) {
      return res.status(400).json({ message: 'Every group member must set up encryption before joining.' });
    }

    const conversation = await Conversation.create({
      type: 'group',
      groupName,
      participants: uniqueParticipants.map(id => ({ user: id })),
      groupAdmin: [req.user._id],
      encryptedGroupKeys
    });

    const populated = await Conversation.findById(conversation._id)
      .populate('participants.user', 'username displayName avatar isOnline lastSeen publicKey email phoneNumber')
      .populate('groupAdmin', 'username');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { groupName, groupAvatar } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!conversation.groupAdmin.some(id => id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Only admins can update group' });
    }

    if (groupName) conversation.groupName = groupName;
    if (groupAvatar) conversation.groupAvatar = groupAvatar;
    
    await conversation.save();
    
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addGroupMembers = async (req, res) => {
  try {
    const { participants, encryptedGroupKeys } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!conversation.groupAdmin.some(id => id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    const currentMemberIds = conversation.participants.map((participant) => participant.user.toString());
    const newMemberIds = [...new Set(participants.map((participantId) => participantId.toString()))]
      .filter((participantId) => !currentMemberIds.includes(participantId));

    if (currentMemberIds.length + newMemberIds.length > 50) {
      return res.status(400).json({ message: 'Cannot exceed 50 members' });
    }

    const wrappedMemberIds = encryptedGroupKeys.map((entry) => entry.user.toString());
    if (new Set(wrappedMemberIds).size !== newMemberIds.length
      || newMemberIds.some((participantId) => !wrappedMemberIds.includes(participantId))) {
      return res.status(400).json({ message: 'Every new member must have an encrypted group key.' });
    }

    const usersWithKeys = await User.find({
      _id: { $in: newMemberIds },
      publicKey: { $type: 'string', $nin: ['', null] },
    }).select('_id');
    if (usersWithKeys.length !== newMemberIds.length) {
      return res.status(400).json({ message: 'Every new member must set up encryption before joining.' });
    }

    const newParticipants = newMemberIds.map(id => ({ user: id }));
    conversation.participants.push(...newParticipants);
    conversation.encryptedGroupKeys.push(...encryptedGroupKeys);

    await conversation.save();
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeGroupMember = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!conversation.groupAdmin.some(id => id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    conversation.participants = conversation.participants.filter(
      p => p.user.toString() !== req.params.userId
    );
    conversation.encryptedGroupKeys = conversation.encryptedGroupKeys.filter(
      k => k.user.toString() !== req.params.userId
    );

    await conversation.save();
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ message: 'Group not found' });
    }

    conversation.participants = conversation.participants.filter(
      p => p.user.toString() !== req.user._id.toString()
    );
    conversation.encryptedGroupKeys = conversation.encryptedGroupKeys.filter(
      k => k.user.toString() !== req.user._id.toString()
    );

    await conversation.save();
    res.json({ message: 'Left group successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateGroupKeys = async (req, res) => {
  try {
    const { encryptedGroupKeys } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!conversation.groupAdmin.some((adminId) => adminId.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Only group admins can update group keys' });
    }

    const memberIds = conversation.participants.map((participant) => participant.user.toString());
    const wrappedMemberIds = encryptedGroupKeys.map((entry) => entry.user.toString());
    if (new Set(wrappedMemberIds).size !== memberIds.length
      || memberIds.some((memberId) => !wrappedMemberIds.includes(memberId))) {
      return res.status(400).json({ message: 'Every group member must have an encrypted group key.' });
    }

    conversation.encryptedGroupKeys = encryptedGroupKeys;
    await conversation.save();

    const updatedConversation = await Conversation.findById(conversation._id)
      .populate('participants.user', 'username displayName avatar isOnline lastSeen publicKey email phoneNumber')
      .populate('groupAdmin', 'username');

    res.json(updatedConversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.user': req.user._id
    })
      .populate('participants.user', 'username displayName avatar isOnline lastSeen publicKey email phoneNumber')
      .populate('groupAdmin', 'username');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getConversations,
  getOrCreatePrivateConversation,
  createGroup,
  updateGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  updateGroupKeys,
  getConversation
};
