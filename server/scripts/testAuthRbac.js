require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { connectMySQL, getPool } = require('../config/mysql');
const { connectMongo } = require('../config/mongo');
const authRoutes = require('../routes/authRoutes');
const testRoutes = require('../routes/testRoutes');

async function runAuthRbacTests() {
  console.log('=== Starting Auth & RBAC Integration Tests ===\n');

  // Initialize DB connections
  await connectMongo();
  const pool = await connectMySQL();
  if (!pool) {
    console.error('❌ Database connection failed. Aborting tests.');
    process.exit(1);
  }

  // Set up Express test app on random available port
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/test', testRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failCount++;
    }
  }

  async function apiRequest(method, endpoint, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  const timestamp = Date.now();
  const playerUser = {
    username: `player_${timestamp}`,
    email: `player_${timestamp}@test.com`,
    password: 'password123',
    role: 'player'
  };

  const devUser = {
    username: `dev_${timestamp}`,
    email: `dev_${timestamp}@test.com`,
    password: 'password123',
    role: 'developer'
  };

  let playerToken = '';
  let devToken = '';
  let adminToken = '';
  let playerUserId = null;

  try {
    // Test 1: Register Player
    console.log('1. Testing Public Registration (Player)...');
    const regPlayerRes = await apiRequest('POST', '/api/auth/register', playerUser);
    assert(regPlayerRes.status === 201, 'Player registration returned HTTP 201');
    assert(regPlayerRes.data.user?.role === 'player', 'Registered user role is "player"');
    assert(Boolean(regPlayerRes.data.token), 'JWT token returned upon registration');
    playerToken = regPlayerRes.data.token;
    playerUserId = regPlayerRes.data.user?.id;

    // Test 2: Register Developer
    console.log('\n2. Testing Public Registration (Developer)...');
    const regDevRes = await apiRequest('POST', '/api/auth/register', devUser);
    assert(regDevRes.status === 201, 'Developer registration returned HTTP 201');
    assert(regDevRes.data.user?.role === 'developer', 'Registered user role is "developer"');
    devToken = regDevRes.data.token;

    // Test 3: Reject Public Admin Registration
    console.log('\n3. Testing Public Registration Security Guard (Admin Attempt)...');
    const regAdminAttempt = await apiRequest('POST', '/api/auth/register', {
      username: `fakeadmin_${timestamp}`,
      email: `fakeadmin_${timestamp}@test.com`,
      password: 'password123',
      role: 'admin'
    });
    assert(regAdminAttempt.status === 400, 'Public admin registration rejected with HTTP 400');
    assert(regAdminAttempt.data.error.includes('Public registration is only allowed for'), 'Proper security guard error message returned');

    // Test 4: Reject Public Curator Registration
    console.log('\n4. Testing Public Registration Security Guard (Curator Attempt)...');
    const regCuratorAttempt = await apiRequest('POST', '/api/auth/register', {
      username: `fakecurator_${timestamp}`,
      email: `fakecurator_${timestamp}@test.com`,
      password: 'password123',
      role: 'curator'
    });
    assert(regCuratorAttempt.status === 400, 'Public curator registration rejected with HTTP 400');

    // Test 5: Login
    console.log('\n5. Testing Login...');
    const loginRes = await apiRequest('POST', '/api/auth/login', {
      email: playerUser.email,
      password: playerUser.password
    });
    assert(loginRes.status === 200, 'Login successful with HTTP 200');
    assert(loginRes.data.user?.role === 'player', 'Login payload includes correct role');

    // Test 6: GET /api/auth/me
    console.log('\n6. Testing Protected Profile (/api/auth/me)...');
    const meRes = await apiRequest('GET', '/api/auth/me', null, playerToken);
    assert(meRes.status === 200, '/me returned HTTP 200');
    assert(meRes.data.user?.username === playerUser.username, 'Profile username matches registered user');

    // Test 7: Public Endpoint
    console.log('\n7. Testing RBAC Public Endpoint...');
    const pubRes = await apiRequest('GET', '/api/test/public');
    assert(pubRes.status === 200, 'Public endpoint returns HTTP 200 without token');

    // Test 8: RBAC Player Route
    console.log('\n8. Testing RBAC Player Route...');
    const playerRouteRes = await apiRequest('GET', '/api/test/player', null, playerToken);
    assert(playerRouteRes.status === 200, 'Player token allowed on player route');

    // Test 9: RBAC Developer Route (Forbidden for Player)
    console.log('\n9. Testing RBAC Developer Route (Player Token vs Developer Route)...');
    const devRouteByPlayer = await apiRequest('GET', '/api/test/developer', null, playerToken);
    assert(devRouteByPlayer.status === 403, 'Player token rejected on developer route with HTTP 403 Forbidden');

    // Test 10: RBAC Developer Route (Allowed for Developer)
    console.log('\n10. Testing RBAC Developer Route (Developer Token)...');
    const devRouteByDev = await apiRequest('GET', '/api/test/developer', null, devToken);
    assert(devRouteByDev.status === 200, 'Developer token allowed on developer route');

    // Test 11: Seed Admin User & Test Admin Route
    console.log('\n11. Testing Admin Access...');
    const adminPassHash = await bcrypt.hash('adminpassword123', 10);
    const [adminInsert] = await pool.query(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, 4)',
      [`admin_${timestamp}`, `admin_${timestamp}@test.com`, adminPassHash]
    );

    const adminLoginRes = await apiRequest('POST', '/api/auth/login', {
      email: `admin_${timestamp}@test.com`,
      password: 'adminpassword123'
    });
    assert(adminLoginRes.status === 200, 'Admin user logged in');
    adminToken = adminLoginRes.data.token;

    const adminRouteRes = await apiRequest('GET', '/api/test/admin', null, adminToken);
    assert(adminRouteRes.status === 200, 'Admin token allowed on admin route');

    // Test 12: Admin Role Promotion
    console.log('\n12. Testing Admin Role Promotion Endpoint...');
    const promoteRes = await apiRequest('POST', '/api/auth/promote', {
      userId: playerUserId,
      newRole: 'curator'
    }, adminToken);

    assert(promoteRes.status === 200, 'Admin promoted player to curator successfully');

    // Verify Promoted Role
    const curatorLoginRes = await apiRequest('POST', '/api/auth/login', {
      email: playerUser.email,
      password: playerUser.password
    });
    assert(curatorLoginRes.data.user?.role === 'curator', 'Re-login reflects updated role "curator"');

    const curatorRouteRes = await apiRequest('GET', '/api/test/curator', null, curatorLoginRes.data.token);
    assert(curatorRouteRes.status === 200, 'Promoted curator token allowed on curator test route');

    // Test 13: Rate Limiting Enforcement
    console.log('\n13. Testing Auth Rate Limiting Enforcement...');
    let rateLimitedStatus = null;
    let rateLimitedErrorMsg = null;
    // We already made ~5 auth requests above. Send rapid login requests until limit (15 max) is exceeded.
    for (let i = 0; i < 15; i++) {
      const res = await apiRequest('POST', '/api/auth/login', {
        email: playerUser.email,
        password: playerUser.password
      });
      if (res.status === 429) {
        rateLimitedStatus = res.status;
        rateLimitedErrorMsg = res.data?.error;
        break;
      }
    }
    assert(rateLimitedStatus === 429, 'Auth rate limiter enforced HTTP 429 after threshold exceeded');
    assert(Boolean(rateLimitedErrorMsg) && rateLimitedErrorMsg.includes('Too many authentication attempts'), 'Rate limiter returned correct retry warning message');

  } catch (err) {
    console.error('Unexpected test exception:', err);
    failCount++;
  } finally {
    server.close();
    await pool.end();
    const { connection } = require('mongoose');
    if (connection) await connection.close();
  }

  console.log(`\n=== Integration Test Results: ${passCount} Passed, ${failCount} Failed ===`);
  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAuthRbacTests();
