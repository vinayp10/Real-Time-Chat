const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { sendMessageSchema } = require('../validators/message.validator');
const { getMessages, sendMessage, deleteForMe, deleteForEveryone } = require('../controllers/message.controller');

router.use(protect);

router.get('/:conversationId', getMessages);
router.post('/:conversationId', validate(sendMessageSchema), sendMessage);
router.delete('/:id/me', deleteForMe);
router.delete('/:id/everyone', deleteForEveryone);

module.exports = router;
