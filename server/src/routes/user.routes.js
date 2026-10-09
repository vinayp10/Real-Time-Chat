const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  searchUsers,
  getUserProfile,
  updateProfile,
  updatePublicKey,
  getPublicKey
} = require('../controllers/user.controller');

router.use(protect);

router.get('/search', searchUsers);
router.get('/:id', getUserProfile);
router.put('/profile', updateProfile);
router.put('/public-key', updatePublicKey);
router.get('/:id/public-key', getPublicKey);

module.exports = router;
