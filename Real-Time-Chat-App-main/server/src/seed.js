require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Conversation = require('./models/Conversation');

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGO_uRL;
    if (!mongoUri || mongoUri.includes('USERNAME:PASSWORD')) {
      throw new Error('Set MONGODB_URI to a persistent MongoDB database before seeding.');
    }

    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected for Seeding');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const usersData = [
      { username: 'alice', email: 'alice@example.com', displayName: 'Alice', about: 'Hello, I am Alice.' },
      { username: 'bob', email: 'bob@example.com', displayName: 'Bob', about: 'Bob here!' },
      { username: 'charlie', email: 'charlie@example.com', displayName: 'Charlie', about: 'Charlie from sales' },
      { username: 'diana', email: 'diana@example.com', displayName: 'Diana', about: 'Diana the dev' },
      { username: 'eve', email: 'eve@example.com', displayName: 'Eve', about: 'Eve the eavesdropper' }
    ];

    const demoUsers = await Promise.all(usersData.map((userData) => User.findOneAndUpdate(
      { email: userData.email },
      { $setOnInsert: { ...userData, password: hashedPassword } },
      { new: true, upsert: true }
    )));
    console.log(`Ensured ${demoUsers.length} demo users exist`);

    const [alice, bob, charlie] = demoUsers;

    const privatePairs = [[alice, bob], [alice, charlie]];
    for (const [firstUser, secondUser] of privatePairs) {
      await Conversation.findOneAndUpdate(
        {
          type: 'private',
          'participants.user': { $all: [firstUser._id, secondUser._id] },
        },
        {
          $setOnInsert: {
            type: 'private',
            participants: [{ user: firstUser._id }, { user: secondUser._id }],
          },
        },
        { upsert: true, new: true }
      );
    }

    console.log('Ensured 2 private conversations exist. Create groups in the app after members have encryption keys.');
    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedDB();
