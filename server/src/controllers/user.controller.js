const User = require('../models/User');

const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }

    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: { $regex: escapedQuery, $options: 'i' } },
            { email: { $regex: escapedQuery, $options: 'i' } },
            { phoneNumber: { $regex: escapedQuery, $options: 'i' } }
          ]
        }
      ]
    })
    .select('-password')
    .limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { displayName, about, avatar } = req.body;
    const user = await User.findById(req.user._id);
    
    if (displayName) user.displayName = displayName;
    if (about !== undefined) user.about = about;
    if (avatar) user.avatar = avatar;

    await user.save();
    
    const updatedUser = await User.findById(req.user._id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePublicKey = async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) {
      return res.status(400).json({ message: 'Public key is required' });
    }

    const user = await User.findById(req.user._id);
    user.publicKey = publicKey;
    await user.save();

    res.json({ message: 'Public key updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPublicKey = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('publicKey');
    if (!user || !user.publicKey) {
      return res.status(404).json({ message: 'Public key not found' });
    }
    res.json({ publicKey: user.publicKey });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  searchUsers,
  getUserProfile,
  updateProfile,
  updatePublicKey,
  getPublicKey
};
