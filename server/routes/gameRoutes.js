const express = require('express');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/mysql');
const { ActivityLog } = require('../models/mongo');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ALL_TAGS } = require('../config/microTags');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_super_secret_key_here';
const VALID_MICRO_TAGS = new Set(ALL_TAGS);

// Helper function to extract user from optional Bearer token
function parseOptionalUser(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Helper function to generate URL slug from title
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

/**
 * Accept JSON request arrays and multipart-style JSON strings while keeping
 * discovery tags constrained to the static micro-tag catalogue.
 */
function parseMicroTags(rawTags) {
  if (rawTags === undefined || rawTags === null || rawTags === '') {
    return { tags: [] };
  }

  let parsedTags = rawTags;
  if (typeof rawTags === 'string') {
    try {
      parsedTags = JSON.parse(rawTags);
    } catch (err) {
      return { error: 'Tags must be an array or a JSON-encoded array.' };
    }
  }

  if (!Array.isArray(parsedTags)) {
    return { error: 'Tags must be an array.' };
  }
  if (parsedTags.length > 8) {
    return { error: 'Choose no more than 8 micro-tags.' };
  }

  const tags = parsedTags.map((tag) => (
    typeof tag === 'string' ? tag.trim() : null
  ));

  if (tags.some((tag) => !tag)) {
    return { error: 'Each tag must be a non-empty string.' };
  }
  if (new Set(tags).size !== tags.length) {
    return { error: 'Tags must not contain duplicates.' };
  }

  const invalidTag = tags.find((tag) => !VALID_MICRO_TAGS.has(tag));
  if (invalidTag) {
    return { error: `"${invalidTag}" is not a supported micro-tag.` };
  }

  return { tags };
}

/**
 * POST /api/games
 * Creates a new game draft listing
 * Protected: Developer or Admin
 */
router.post('/', authenticateToken, requireRole('developer', 'admin'), async (req, res) => {
  try {
    const { title, description, price, primary_genre, tags, thumbnail_url, banner_url } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Game title is required.' });
    }

    const tagResult = parseMicroTags(tags);
    if (tagResult.error) {
      return res.status(400).json({ error: tagResult.error });
    }
    const selectedTags = tagResult.tags;

    const pool = getPool();
    const developerId = req.user.id;

    // Generate unique slug
    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = 'game';
    let slug = baseSlug;

    // Check slug uniqueness
    const [existingSlugs] = await pool.query('SELECT id FROM games WHERE slug = ? LIMIT 1', [slug]);
    if (existingSlugs.length > 0) {
      slug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const parsedPrice = isNaN(Number(price)) ? 0.0 : Math.max(0, Number(price));
    const formattedTags = JSON.stringify(selectedTags);

    const [insertResult] = await pool.query(
      `INSERT INTO games (title, slug, developer_id, description, price, status, primary_genre, tags, thumbnail_url, banner_url)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      [
        title.trim(),
        slug,
        developerId,
        description || null,
        parsedPrice,
        primary_genre || null,
        formattedTags,
        thumbnail_url || null,
        banner_url || null
      ]
    );

    const gameId = insertResult.insertId;

    // Log event in MongoDB ActivityLog
    try {
      await ActivityLog.create({
        userId: developerId,
        action: 'GAME_CREATED',
        entityType: 'game',
        entityId: String(gameId),
        metadata: { title: title.trim(), slug, price: parsedPrice },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (logErr) {
      console.warn('[ActivityLog] Failed to log game creation:', logErr.message);
    }

    return res.status(201).json({
      message: 'Game draft created successfully.',
      game: {
        id: gameId,
        title: title.trim(),
        slug,
        developerId,
        description: description || null,
        price: parsedPrice,
        status: 'draft',
        primaryGenre: primary_genre || null,
        tags: selectedTags,
        thumbnailUrl: thumbnail_url || null,
        bannerUrl: banner_url || null
      }
    });
  } catch (err) {
    console.error('[Game Route Error] Create game failed:', err);
    return res.status(500).json({ error: 'Internal server error creating game draft.' });
  }
});

/**
 * GET /api/games
 * Public catalog listing with role-based visibility filtering:
 * - Anonymous / Player: sees only status = 'published'
 * - Developer: sees status = 'published' OR their own drafts/submissions
 * - Admin: sees ALL games
 */
router.get('/', async (req, res) => {
  try {
    const user = parseOptionalUser(req);
    const pool = getPool();

    let query = `
      SELECT g.id, g.title, g.slug, g.developer_id, g.description, g.price, g.status,
             g.primary_genre, g.tags, g.thumbnail_url, g.banner_url, g.release_date, g.created_at,
             u.username AS developer_username
      FROM games g
      JOIN users u ON g.developer_id = u.id
    `;
    const queryParams = [];

    if (!user || user.role === 'player') {
      query += ` WHERE g.status = 'published'`;
    } else if (user.role === 'developer') {
      query += ` WHERE g.status = 'published' OR g.developer_id = ?`;
      queryParams.push(user.id);
    } else if (user.role === 'admin') {
      // Admins see all
    } else if (user.role === 'curator') {
      query += ` WHERE g.status = 'published'`;
    }

    query += ` ORDER BY g.created_at DESC`;

    const [games] = await pool.query(query, queryParams);

    const formattedGames = games.map((g) => ({
      id: g.id,
      title: g.title,
      slug: g.slug,
      developerId: g.developer_id,
      developerUsername: g.developer_username,
      description: g.description,
      price: Number(g.price),
      status: g.status,
      primaryGenre: g.primary_genre,
      tags: typeof g.tags === 'string' ? JSON.parse(g.tags || '[]') : g.tags || [],
      thumbnailUrl: g.thumbnail_url,
      bannerUrl: g.banner_url,
      releaseDate: g.release_date,
      createdAt: g.created_at
    }));

    return res.json({ games: formattedGames });
  } catch (err) {
    console.error('[Game Route Error] List games failed:', err);
    return res.status(500).json({ error: 'Internal server error fetching game catalog.' });
  }
});

// Register static paths before the parameterized /:id detail route.
router.get('/search', searchGames);

/**
 * GET /api/games/:id
 * Specific game details with visibility filtering
 */
router.get('/:id', async (req, res) => {
  try {
    const gameId = Number(req.params.id);
    if (!gameId) {
      return res.status(400).json({ error: 'Invalid game ID.' });
    }

    const user = parseOptionalUser(req);
    const pool = getPool();

    const [rows] = await pool.query(
      `SELECT g.id, g.title, g.slug, g.developer_id, g.description, g.price, g.status,
              g.primary_genre, g.tags, g.thumbnail_url, g.banner_url, g.release_date, g.created_at,
              u.username AS developer_username
       FROM games g
       JOIN users u ON g.developer_id = u.id
       WHERE g.id = ?
       LIMIT 1`,
      [gameId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    const game = rows[0];

    // Visibility Enforcement
    if (game.status !== 'published') {
      if (!user) {
        return res.status(404).json({ error: 'Game not found.' });
      }
      if (user.role === 'player' || user.role === 'curator') {
        return res.status(404).json({ error: 'Game not found.' });
      }
      if (user.role === 'developer' && game.developer_id !== user.id) {
        return res.status(404).json({ error: 'Game not found.' });
      }
      // Admins and owning developers proceed
    }

    return res.json({
      game: {
        id: game.id,
        title: game.title,
        slug: game.slug,
        developerId: game.developer_id,
        developerUsername: game.developer_username,
        description: game.description,
        price: Number(game.price),
        status: game.status,
        primaryGenre: game.primary_genre,
        tags: typeof game.tags === 'string' ? JSON.parse(game.tags || '[]') : game.tags || [],
        thumbnailUrl: game.thumbnail_url,
        bannerUrl: game.banner_url,
        releaseDate: game.release_date,
        createdAt: game.created_at
      }
    });
  } catch (err) {
    console.error('[Game Route Error] Get game by ID failed:', err);
    return res.status(500).json({ error: 'Internal server error fetching game details.' });
  }
});

/**
 * GET /api/games/search
 * Public search/browse with query, genre filter, tag filter, price range, and pagination.
 */
async function searchGames(req, res) {
  try {
    const { q, genre, tag, minPrice, maxPrice, sort, page, limit: limitParam } = req.query;
    const pool = getPool();

    let query = `
      SELECT g.id, g.title, g.slug, g.developer_id, g.description, g.price, g.status,
             g.primary_genre, g.tags, g.thumbnail_url, g.banner_url, g.release_date, g.created_at,
             u.username AS developer_username
      FROM games g
      JOIN users u ON g.developer_id = u.id
      WHERE g.status = 'published'
    `;
    const queryParams = [];

    // Text search on title and description
    if (q && q.trim()) {
      query += ` AND (g.title LIKE ? OR g.description LIKE ?)`;
      const searchTerm = `%${q.trim()}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    // Genre filter
    if (genre && genre.trim()) {
      query += ` AND g.primary_genre = ?`;
      queryParams.push(genre.trim());
    }

    // Tag filter (search inside JSON array)
    if (tag && tag.trim()) {
      query += ` AND JSON_CONTAINS(g.tags, JSON_QUOTE(?))`;
      queryParams.push(tag.trim());
    }

    // Price range
    if (minPrice !== undefined && !isNaN(Number(minPrice))) {
      query += ` AND g.price >= ?`;
      queryParams.push(Number(minPrice));
    }
    if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
      query += ` AND g.price <= ?`;
      queryParams.push(Number(maxPrice));
    }

    // Sorting
    const sortOptions = {
      'newest': 'g.created_at DESC',
      'oldest': 'g.created_at ASC',
      'price_low': 'g.price ASC',
      'price_high': 'g.price DESC',
      'title_az': 'g.title ASC',
      'title_za': 'g.title DESC'
    };
    const orderBy = sortOptions[sort] || 'g.created_at DESC';
    query += ` ORDER BY ${orderBy}`;

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const perPage = Math.min(50, Math.max(1, parseInt(limitParam) || 12));
    const offset = (pageNum - 1) * perPage;
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(perPage, offset);

    const [games] = await pool.query(query, queryParams);

    // Get total count for pagination metadata
    let countQuery = `SELECT COUNT(*) AS total FROM games g WHERE g.status = 'published'`;
    const countParams = [];
    if (q && q.trim()) {
      countQuery += ` AND (g.title LIKE ? OR g.description LIKE ?)`;
      const searchTerm = `%${q.trim()}%`;
      countParams.push(searchTerm, searchTerm);
    }
    if (genre && genre.trim()) {
      countQuery += ` AND g.primary_genre = ?`;
      countParams.push(genre.trim());
    }
    if (tag && tag.trim()) {
      countQuery += ` AND JSON_CONTAINS(g.tags, JSON_QUOTE(?))`;
      countParams.push(tag.trim());
    }
    if (minPrice !== undefined && !isNaN(Number(minPrice))) {
      countQuery += ` AND g.price >= ?`;
      countParams.push(Number(minPrice));
    }
    if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
      countQuery += ` AND g.price <= ?`;
      countParams.push(Number(maxPrice));
    }

    const [countRows] = await pool.query(countQuery, countParams);
    const total = countRows[0] ? Number(countRows[0].total) : 0;

    const formattedGames = games.map((g) => ({
      id: g.id,
      title: g.title,
      slug: g.slug,
      developerId: g.developer_id,
      developerUsername: g.developer_username,
      description: g.description,
      price: Number(g.price),
      status: g.status,
      primaryGenre: g.primary_genre,
      tags: typeof g.tags === 'string' ? JSON.parse(g.tags || '[]') : g.tags || [],
      thumbnailUrl: g.thumbnail_url,
      bannerUrl: g.banner_url,
      releaseDate: g.release_date,
      createdAt: g.created_at
    }));

    return res.json({
      games: formattedGames,
      pagination: {
        page: pageNum,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage)
      }
    });
  } catch (err) {
    console.error('[Game Route Error] Search games failed:', err);
    return res.status(500).json({ error: 'Internal server error searching games.' });
  }
}

module.exports = router;
