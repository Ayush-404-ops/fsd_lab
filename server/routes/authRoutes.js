const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getPool } = require('../config/mysql');
const { ActivityLog } = require('../models/mongo');
const { authenticateToken, requireRole } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_super_secret_key_here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Auth Rate Limiter to blunt brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * POST /api/auth/register
 * Public user registration (restricted to 'player' or 'developer' roles)
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // 1. Basic field validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // 2. Role restriction validation
    const requestedRole = (role || 'player').toLowerCase();
    const publicAllowedRoles = ['player', 'developer'];

    if (!publicAllowedRoles.includes(requestedRole)) {
      return res.status(400).json({
        error: 'Public registration is only allowed for "player" or "developer" roles. Admin and Curator roles must be assigned by an administrator.'
      });
    }

    const pool = getPool();

    // 3. Check for existing username or email
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username.trim(), email.trim().toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username or email already in use.' });
    }

    // 4. Resolve role ID from database
    const [roleRows] = await pool.query('SELECT id FROM roles WHERE name = ? LIMIT 1', [requestedRole]);
    if (roleRows.length === 0) {
      return res.status(400).json({ error: `Invalid role "${requestedRole}". Role does not exist.` });
    }
    const roleId = roleRows[0].id;

    // 5. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 6. Insert new user into MySQL
    const [insertResult] = await pool.query(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
      [username.trim(), email.trim().toLowerCase(), passwordHash, roleId]
    );

    const newUserId = insertResult.insertId;

    // 7. Log activity to MongoDB (non-blocking log catch)
    try {
      await ActivityLog.create({
        userId: newUserId,
        action: 'USER_REGISTERED',
        entityType: 'user',
        entityId: String(newUserId),
        metadata: { role: requestedRole },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (logErr) {
      console.warn('[ActivityLog] Failed to log user registration:', logErr.message);
    }

    // 8. Sign JWT token
    const token = jwt.sign(
      { id: newUserId, username: username.trim(), email: email.trim().toLowerCase(), role: requestedRole },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user: {
        id: newUserId,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        role: requestedRole
      }
    });
  } catch (err) {
    console.error('[Auth Route Error] Register failed:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

/**
 * POST /api/auth/login
 * User login with email/username + password
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { login, email, username, password } = req.body;
    const identifier = (login || email || username || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required.' });
    }

    const pool = getPool();

    // Query user and join with roles table to fetch role name
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email, u.password_hash, u.bio, u.avatar_url, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ? OR u.username = ?
       LIMIT 1`,
      [identifier.toLowerCase(), identifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = rows[0];

    // Verify password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Log login activity to MongoDB
    try {
      await ActivityLog.create({
        userId: user.id,
        action: 'USER_LOGGED_IN',
        entityType: 'user',
        entityId: String(user.id),
        metadata: { role: user.role },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (logErr) {
      console.warn('[ActivityLog] Failed to log user login:', logErr.message);
    }

    // Issue JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        bio: user.bio,
        avatarUrl: user.avatar_url
      }
    });
  } catch (err) {
    console.error('[Auth Route Error] Login failed:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * GET /api/auth/me
 * Protected endpoint returning current user details
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email, u.bio, u.avatar_url, u.created_at, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?
       LIMIT 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const user = rows[0];

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('[Auth Route Error] Profile fetch failed:', err);
    return res.status(500).json({ error: 'Internal server error fetching user profile.' });
  }
});

/**
 * POST /api/auth/promote
 * Admin-only endpoint to update a user's role (e.g. promoting to curator or admin)
 */
router.post('/promote', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId, newRole } = req.body;

    if (!userId || !newRole) {
      return res.status(400).json({ error: 'userId and newRole are required.' });
    }

    const targetRole = newRole.toLowerCase();
    const validRoles = ['player', 'developer', 'curator', 'admin'];
    if (!validRoles.includes(targetRole)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: [${validRoles.join(', ')}].` });
    }

    const pool = getPool();

    // Verify target user exists
    const [userRows] = await pool.query('SELECT id, username FROM users WHERE id = ? LIMIT 1', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: `User with ID ${userId} not found.` });
    }

    // Resolve role ID
    const [roleRows] = await pool.query('SELECT id FROM roles WHERE name = ? LIMIT 1', [targetRole]);
    if (roleRows.length === 0) {
      return res.status(400).json({ error: `Role "${targetRole}" does not exist.` });
    }

    const roleId = roleRows[0].id;

    // Update user role in MySQL
    await pool.query('UPDATE users SET role_id = ? WHERE id = ?', [roleId, userId]);

    // Log promotion activity in MongoDB
    try {
      await ActivityLog.create({
        userId: req.user.id,
        action: 'USER_ROLE_PROMOTED',
        entityType: 'user',
        entityId: String(userId),
        metadata: { targetUserId: userId, newRole: targetRole, promotedBy: req.user.id },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (logErr) {
      console.warn('[ActivityLog] Failed to log role promotion:', logErr.message);
    }

    return res.json({
      message: `User "${userRows[0].username}" (ID: ${userId}) updated to role "${targetRole}" successfully.`,
      userId: Number(userId),
      newRole: targetRole
    });
  } catch (err) {
    console.error('[Auth Route Error] Promote failed:', err);
    return res.status(500).json({ error: 'Internal server error updating user role.' });
  }
});

module.exports = router;
