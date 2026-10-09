const mongoose = require('mongoose');
const fs = require('fs');
const os = require('os');
const path = require('path');

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGO_uRL;

    if (!uri || uri.includes('USERNAME:PASSWORD') || uri.includes('127.0.0.1')) {
      const dbPath = process.env.CHATAPP_MONGO_DB_PATH
        || path.join(os.tmpdir(), 'chatapp-mongodb');
      fs.mkdirSync(dbPath, { recursive: true });
      console.log(`No usable MongoDB URI provided; starting local persistent MongoDB at ${dbPath}`);

      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create({
        instance: {
          dbPath,
          storageEngine: 'wiredTiger',
        },
      });
      uri = mongoServer.getUri();
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('\n======================================================');
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('======================================================\n');
    process.exit(1);
  }
};

module.exports = connectDB;
