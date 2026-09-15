require('dotenv').config();
const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { connectMySQL, getPool } = require('../config/mysql');
const { connectMongo } = require('../config/mongo');
const authRoutes = require('../routes/authRoutes');
const gameRoutes = require('../routes/gameRoutes');
const submissionRoutes = require('../routes/submissionRoutes');
const adminRoutes = require('../routes/adminRoutes');

async function runSubmissionWorkflowTests() {
  console.log('=== Starting Game Submission & Admin Review Workflow Tests ===\n');

  // Initialize DB connections
  await connectMongo();
  const pool = await connectMySQL();
  if (!pool) {
    console.error('❌ Database connection failed. Aborting tests.');
    process.exit(1);
  }

  // Set up Express test app
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  app.use('/api/auth', authRoutes);
  app.use('/api/games', gameRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/admin', adminRoutes);

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

  async function apiJsonRequest(method, endpoint, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  // Helper for multipart/form-data build file upload
  async function apiFileUploadRequest(endpoint, fields, filePath, token) {
    const fileBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;

    let bodyParts = [];

    // Add text fields
    for (const [key, value] of Object.entries(fields)) {
      bodyParts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      ));
    }

    // Add file field
    bodyParts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="buildFile"; filename="${filename}"\r\nContent-Type: application/zip\r\n\r\n`
    ));
    bodyParts.push(fileBuffer);
    bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const bodyBuffer = Buffer.concat(bodyParts);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(bodyBuffer.length)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: bodyBuffer
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  // Create temporary test zip file for build upload
  const dummyZipPath = path.join(__dirname, 'test_build_v1.zip');
  fs.writeFileSync(dummyZipPath, 'PK\x03\x04Dummy Zip Content for IndieVault Game Build');

  const timestamp = Date.now();
  const devA = { username: `deva_${timestamp}`, email: `deva_${timestamp}@test.com`, password: 'password123', role: 'developer' };
  const devB = { username: `devb_${timestamp}`, email: `devb_${timestamp}@test.com`, password: 'password123', role: 'developer' };

  let tokenDevA, tokenDevB, tokenAdmin;
  let devAId, gameId, submissionId;

  try {
    // 1. Register Developer A & Developer B
    console.log('1. Registering Developers & Admin...');
    const regA = await apiJsonRequest('POST', '/api/auth/register', devA);
    tokenDevA = regA.data.token;
    devAId = regA.data.user.id;

    const regB = await apiJsonRequest('POST', '/api/auth/register', devB);
    tokenDevB = regB.data.token;

    // Seed Admin in DB
    const adminPassHash = await bcrypt.hash('adminpass123', 10);
    await pool.query(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, 4)',
      [`admin_${timestamp}`, `admin_${timestamp}@test.com`, adminPassHash]
    );

    const loginAdmin = await apiJsonRequest('POST', '/api/auth/login', {
      email: `admin_${timestamp}@test.com`,
      password: 'adminpass123'
    });
    tokenAdmin = loginAdmin.data.token;
    assert(Boolean(tokenAdmin), 'Admin logged in successfully');

    // 2. Developer A creates game listing
    console.log('\n2. Developer A creates game draft...');
    const createGameRes = await apiJsonRequest('POST', '/api/games', {
      title: 'Neon Odyssey',
      description: 'A cyberpunk synthwave action adventure game.',
      price: 14.99,
      primary_genre: 'Action',
      tags: ['cyberpunk', 'synthwave', 'indie']
    }, tokenDevA);

    assert(createGameRes.status === 201, 'Game draft created with HTTP 201');
    assert(createGameRes.data.game?.status === 'draft', 'Initial game status is "draft"');
    gameId = createGameRes.data.game.id;

    // 3. Ownership Check: Developer B attempts to submit build for Developer A's game
    console.log('\n3. Testing Ownership Enforcement (Developer B submits for Developer A game)...');
    const devBSubmitRes = await apiFileUploadRequest(
      '/api/submissions',
      { game_id: String(gameId), version_number: '1.0.0', changelog: 'Initial build' },
      dummyZipPath,
      tokenDevB
    );
    assert(devBSubmitRes.status === 403, 'Un-owned game submission blocked with HTTP 403 Forbidden');
    assert(devBSubmitRes.data.error.includes('You can only submit builds for games you own'), 'Correct ownership error message returned');

    // 4. Developer A submits valid build
    console.log('\n4. Developer A submits valid build...');
    const devASubmitRes = await apiFileUploadRequest(
      '/api/submissions',
      { game_id: String(gameId), version_number: '1.0.0', changelog: 'Initial v1.0.0 build release candidate' },
      dummyZipPath,
      tokenDevA
    );

    assert(devASubmitRes.status === 201, 'Build submission created with HTTP 201');
    assert(devASubmitRes.data.submission?.status === 'pending', 'Submission status is "pending"');
    assert(devASubmitRes.data.submission?.buildFilePath.startsWith('/uploads/builds/'), 'Server generated build file path');
    submissionId = devASubmitRes.data.submission.id;

    // Verify game status is updated to pending_review
    const checkGameStatus = await apiJsonRequest('GET', `/api/games/${gameId}`, null, tokenDevA);
    assert(checkGameStatus.data.game?.status === 'pending_review', 'Game status updated to "pending_review"');

    // 5. Admin opens submission (Claiming logic)
    console.log('\n5. Admin opens submission details (Claiming test)...');
    const claimRes = await apiJsonRequest('GET', `/api/admin/submissions/${submissionId}`, null, tokenAdmin);
    assert(claimRes.status === 200, 'Admin fetched submission details');
    assert(claimRes.data.submission?.status === 'under_review', 'Pending submission claimed and transitioned to "under_review"');

    // 6. Mandatory Feedback Notes Check: Admin tries needs_changes without notes
    console.log('\n6. Mandatory Feedback Notes Check (Admin needs_changes without notes)...');
    const noNotesRes = await apiJsonRequest('PATCH', `/api/admin/submissions/${submissionId}/review`, {
      status: 'needs_changes',
      reviewNotes: ''
    }, tokenAdmin);
    assert(noNotesRes.status === 400, 'needs_changes without notes rejected with HTTP 400 Bad Request');
    assert(noNotesRes.data.error.includes('mandatory'), 'Mandatory feedback error returned');

    // 7. Admin submits needs_changes with notes
    console.log('\n7. Admin submits needs_changes with feedback notes...');
    const reviewNeedsChangesRes = await apiJsonRequest('PATCH', `/api/admin/submissions/${submissionId}/review`, {
      status: 'needs_changes',
      reviewNotes: 'Please fix resolution settings and update control mapping.'
    }, tokenAdmin);

    assert(reviewNeedsChangesRes.status === 200, 'Review completed with HTTP 200');
    assert(reviewNeedsChangesRes.data.submission?.status === 'needs_changes', 'Submission status updated to "needs_changes"');
    assert(reviewNeedsChangesRes.data.submission?.reviewHistory.length === 1, 'Review decision recorded in reviewHistory array');

    // 8. Resubmission Logic: Developer A re-submits updated build for existing submission
    console.log('\n8. Developer A re-submits updated build for existing submission...');
    const resubmitRes = await apiFileUploadRequest(
      '/api/submissions',
      { game_id: String(gameId), version_number: '1.0.1', changelog: 'Fixed resolution settings and control mapping per admin feedback' },
      dummyZipPath,
      tokenDevA
    );

    assert(resubmitRes.status === 200, 'Resubmission updated existing record with HTTP 200');
    assert(resubmitRes.data.submission?.id === submissionId, 'Same submission ID updated (single audit trail preserved)');
    assert(resubmitRes.data.submission?.status === 'pending', 'Submission status reset to "pending"');

    // 9. Admin claims & approves submission
    console.log('\n9. Admin claims & approves submission...');
    await apiJsonRequest('GET', `/api/admin/submissions/${submissionId}`, null, tokenAdmin); // Claim it
    const approveRes = await apiJsonRequest('PATCH', `/api/admin/submissions/${submissionId}/review`, {
      status: 'approved',
      reviewNotes: 'Verified resolution fixes. Approved for store publication!'
    }, tokenAdmin);

    assert(approveRes.status === 200, 'Approval succeeded with HTTP 200');
    assert(approveRes.data.submission?.status === 'approved', 'Submission status updated to "approved"');
    assert(approveRes.data.game?.status === 'published', 'Game status updated to "published"');

    // 10. Public Visibility Rules Check
    console.log('\n10. Testing Public Visibility Filtering...');
    const publicCatalogRes = await apiJsonRequest('GET', '/api/games');
    const isNeonOdysseyInPublic = publicCatalogRes.data.games?.some((g) => g.id === gameId);
    assert(isNeonOdysseyInPublic === true, 'Published game "Neon Odyssey" is visible in public catalog');

    // Create unpublished draft game and check public visibility
    const draftRes = await apiJsonRequest('POST', '/api/games', {
      title: 'Secret Unreleased Prototype',
      description: 'Hidden draft'
    }, tokenDevA);
    const draftGameId = draftRes.data.game.id;

    const publicCatalogCheck2 = await apiJsonRequest('GET', '/api/games');
    const isDraftInPublic = publicCatalogCheck2.data.games?.some((g) => g.id === draftGameId);
    assert(isDraftInPublic === false, 'Unpublished draft game is excluded from public catalog for anonymous users');

    const devCatalogCheck = await apiJsonRequest('GET', '/api/games', null, tokenDevA);
    const isDraftInDevCatalog = devCatalogCheck.data.games?.some((g) => g.id === draftGameId);
    assert(isDraftInDevCatalog === true, 'Owning developer can see their own unpublished draft');

  } catch (err) {
    console.error('Unexpected workflow test exception:', err);
    failCount++;
  } finally {
    // Cleanup temporary test file
    if (fs.existsSync(dummyZipPath)) {
      fs.unlinkSync(dummyZipPath);
    }
    server.close();
    await pool.end();
    const { connection } = require('mongoose');
    if (connection) await connection.close();
  }

  console.log(`\n=== Workflow Integration Test Results: ${passCount} Passed, ${failCount} Failed ===`);
  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSubmissionWorkflowTests();
