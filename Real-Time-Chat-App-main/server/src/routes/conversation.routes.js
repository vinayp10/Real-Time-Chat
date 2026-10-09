const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createGroupSchema,
  updateGroupSchema,
  addMembersSchema,
  updateKeysSchema
} = require('../validators/conversation.validator');
const {
  getConversations,
  getOrCreatePrivateConversation,
  createGroup,
  updateGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  updateGroupKeys,
  getConversation
} = require('../controllers/conversation.controller');

router.use(protect);

router.get('/', getConversations);
router.post('/private', getOrCreatePrivateConversation);
router.post('/group', validate(createGroupSchema), createGroup);
router.put('/group/:id', validate(updateGroupSchema), updateGroup);
router.post('/group/:id/members', validate(addMembersSchema), addGroupMembers);
router.delete('/group/:id/members/:userId', removeGroupMember);
router.post('/group/:id/leave', leaveGroup);
router.put('/group/:id/keys', validate(updateKeysSchema), updateGroupKeys);
router.get('/:id', getConversation);

module.exports = router;
