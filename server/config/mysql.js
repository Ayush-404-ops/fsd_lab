const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'indievault',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
};

let pool = null;

async function initializeSchema(connectionPool) {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.warn('[MySQL] Warning: schema.sql not found at', schemaPath);
      return;
    }

    // Execute base schema (roles table & inserts)
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await connectionPool.query(sql);

    // Migration check: Ensure users table has all required blueprint columns
    const [userCols] = await connectionPool.query('DESCRIBE users;');
    const colNames = userCols.map((c) => c.Field);

    if (colNames.includes('name')) {
      await connectionPool.query('ALTER TABLE users MODIFY COLUMN `name` VARCHAR(100) DEFAULT NULL;');
    }
    if (!colNames.includes('username')) {
      await connectionPool.query('ALTER TABLE users ADD COLUMN `username` VARCHAR(50) UNIQUE AFTER id;');
    }
    if (!colNames.includes('role_id')) {
      await connectionPool.query('ALTER TABLE users ADD COLUMN `role_id` INT NOT NULL DEFAULT 1 AFTER password_hash;');
    }
    if (!colNames.includes('bio')) {
      await connectionPool.query('ALTER TABLE users ADD COLUMN `bio` TEXT DEFAULT NULL AFTER role_id;');
    }
    if (!colNames.includes('avatar_url')) {
      await connectionPool.query('ALTER TABLE users ADD COLUMN `avatar_url` VARCHAR(255) DEFAULT NULL AFTER bio;');
    }
    if (!colNames.includes('updated_at')) {
      await connectionPool.query('ALTER TABLE users ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;');
    }

    // Migration check: Ensure submissions table has review_history column
    const [subCols] = await connectionPool.query('DESCRIBE submissions;');
    const subColNames = subCols.map((c) => c.Field);
    if (!subColNames.includes('review_history')) {
      await connectionPool.query('ALTER TABLE submissions ADD COLUMN `review_history` JSON DEFAULT NULL AFTER review_notes;');
    }

    // Migration check: Ensure games table has blueprint columns & updated status enum
    const [gameCols] = await connectionPool.query('DESCRIBE games;');
    const gameColNames = gameCols.map((c) => c.Field);

    if (!gameColNames.includes('slug')) {
      await connectionPool.query('ALTER TABLE games ADD COLUMN `slug` VARCHAR(150) UNIQUE AFTER title;');
    }
    if (!gameColNames.includes('price')) {
      await connectionPool.query('ALTER TABLE games ADD COLUMN `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER description;');
      if (gameColNames.includes('base_price')) {
        await connectionPool.query('UPDATE games SET price = base_price WHERE price = 0.00;');
      }
    }
    if (!gameColNames.includes('primary_genre')) {
      await connectionPool.query('ALTER TABLE games ADD COLUMN `primary_genre` VARCHAR(50) DEFAULT NULL AFTER status;');
    }
    if (!gameColNames.includes('thumbnail_url')) {
      await connectionPool.query('ALTER TABLE games ADD COLUMN `thumbnail_url` VARCHAR(255) DEFAULT NULL AFTER tags;');
    }
    if (!gameColNames.includes('banner_url')) {
      await connectionPool.query('ALTER TABLE games ADD COLUMN `banner_url` VARCHAR(255) DEFAULT NULL AFTER thumbnail_url;');
    }
    if (!gameColNames.includes('release_date')) {
      await connectionPool.query('ALTER TABLE games ADD COLUMN `release_date` DATETIME DEFAULT NULL AFTER banner_url;');
    }
    
    // Update status enum on games table
    await connectionPool.query("ALTER TABLE games MODIFY COLUMN `status` ENUM('draft', 'pending_review', 'published', 'rejected', 'archived') NOT NULL DEFAULT 'draft';");

    console.log('[MySQL] Schema initialization & column migrations complete.');
  } catch (err) {
    console.error(`[MySQL] Schema initialization error: ${err.message}`);
  }
}

async function connectMySQL() {
  try {
    // First connect to MySQL server without database to ensure DB exists
    const serverConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await serverConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
    await serverConnection.end();

    // Create pooled connection for the application
    pool = mysql.createPool(dbConfig);
    const [result] = await pool.query('SELECT 1 + 1 AS solution');
    console.log(`[MySQL] Connected successfully to "${dbConfig.database}" on ${dbConfig.host}:${dbConfig.port}`);

    // Automatically ensure tables and default roles exist
    await initializeSchema(pool);

    return pool;
  } catch (error) {
    console.error(`[MySQL] Connection failed: ${error.message}`);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('[MySQL] Hint: Verify MYSQL_USER and MYSQL_PASSWORD in server/.env');
    }
    return null;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('MySQL pool has not been initialized. Call connectMySQL() first.');
  }
  return pool;
}

module.exports = {
  connectMySQL,
  getPool,
  initializeSchema
};

