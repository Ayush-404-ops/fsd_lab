const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/indievault';

async function connectMongo() {
  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Connected successfully to "${mongoURI}"`);
    return mongoose.connection;
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    console.error('[MongoDB] Hint: Check if MongoDB service is running and MONGODB_URI in server/.env is correct');
    return null;
  }
}

module.exports = {
  connectMongo
};
