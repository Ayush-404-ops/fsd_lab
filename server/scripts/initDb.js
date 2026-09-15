require('dotenv').config();
const { connectMySQL } = require('../config/mysql');
const { connectMongo } = require('../config/mongo');
const mongoModels = require('../models/mongo');

async function runDbInit() {
  console.log('=== IndieVault Database Initialization ===');

  console.log('\n1. Initializing MySQL schema...');
  const pool = await connectMySQL();
  if (pool) {
    console.log('✅ MySQL schema & default roles verified.');
  } else {
    console.error('❌ MySQL connection failed. Please check MySQL service.');
  }

  console.log('\n2. Initializing MongoDB connection & models...');
  const mongoConn = await connectMongo();
  if (mongoConn) {
    console.log('Registered MongoDB Models:');
    for (const [modelName, model] of Object.entries(mongoModels)) {
      await model.init(); // ensure indexes are compiled
      console.log(`  - ${modelName} (Collection: "${model.collection.name}")`);
    }
    console.log('✅ MongoDB models & indexes compiled successfully.');
    await mongoConn.close();
    console.log('[MongoDB] Connection closed.');
  } else {
    console.error('❌ MongoDB connection failed. Please check MongoDB service.');
  }

  if (pool) {
    await pool.end();
    console.log('[MySQL] Pool closed.');
  }

  console.log('\n=== Database Initialization Complete ===');
  process.exit(0);
}

runDbInit().catch((err) => {
  console.error('Initialization error:', err);
  process.exit(1);
});
