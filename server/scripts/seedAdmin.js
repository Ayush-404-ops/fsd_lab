/**
 * Seed an admin user into the database.
 * Usage: node scripts/seedAdmin.js
 *
 * Admin Credentials:
 *   Username: admin
 *   Email:    admin@indievault.com
 *   Password: Admin@123
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'indievault'
};

async function seedAdmin() {
  const connection = await mysql.createConnection(dbConfig);
  console.log('[Seed] Connected to MySQL.');

  // Ensure admin role exists (id=4 per schema.sql)
  const [roleRows] = await connection.query(
    "SELECT id FROM roles WHERE name = 'admin' LIMIT 1"
  );
  if (roleRows.length === 0) {
    console.error('[Seed] ERROR: "admin" role not found. Run the server first to initialize schema.');
    process.exit(1);
  }
  const adminRoleId = roleRows[0].id;

  // Check if admin user already exists
  const [existing] = await connection.query(
    "SELECT id FROM users WHERE username = 'admin' OR email = 'admin@indievault.com' LIMIT 1"
  );

  if (existing.length > 0) {
    console.log('[Seed] Admin user already exists (id=' + existing[0].id + '). Updating password...');
    const hash = await bcrypt.hash('Admin@123', 10);
    await connection.query(
      'UPDATE users SET password_hash = ?, role_id = ? WHERE id = ?',
      [hash, adminRoleId, existing[0].id]
    );
    console.log('[Seed] ✅ Admin password updated.');
  } else {
    const hash = await bcrypt.hash('Admin@123', 10);
    const [result] = await connection.query(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@indievault.com', hash, adminRoleId]
    );
    console.log('[Seed] ✅ Admin user created with id=' + result.insertId);
  }

  console.log('\n  ┌─────────────────────────────────┐');
  console.log('  │  Admin Login Credentials        │');
  console.log('  │  Username: admin                │');
  console.log('  │  Email:    admin@indievault.com  │');
  console.log('  │  Password: Admin@123            │');
  console.log('  └─────────────────────────────────┘\n');

  await connection.end();
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
