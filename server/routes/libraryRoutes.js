const express = require('express');
const { getPool } = require('../config/mysql');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All library routes require authentication
router.use(authenticateToken);

/**
 * GET /api/library
 * Returns the current user's owned games.
 */
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT g.id, g.title, g.slug, g.price, g.status, g.primary_genre, g.tags,
              g.thumbnail_url, g.banner_url, g.release_date,
              u.username AS developer_username,
              l.acquired_at
       FROM user_library l
       JOIN games g ON l.game_id = g.id
       JOIN users u ON g.developer_id = u.id
       WHERE l.user_id = ? AND g.status = 'published'
       ORDER BY l.acquired_at DESC`,
      [req.user.id]
    );

    const library = rows.map(g => ({
      id: g.id,
      title: g.title,
      slug: g.slug,
      price: Number(g.price),
      status: g.status,
      primaryGenre: g.primary_genre,
      tags: typeof g.tags === 'string' ? JSON.parse(g.tags || '[]') : g.tags || [],
      thumbnailUrl: g.thumbnail_url,
      bannerUrl: g.banner_url,
      releaseDate: g.release_date,
      developerUsername: g.developer_username,
      acquiredAt: g.acquired_at
    }));

    return res.json({ library });
  } catch (err) {
    console.error('[Library Route Error] Fetch library failed:', err);
    return res.status(500).json({ error: 'Internal server error fetching library.' });
  }
});

/**
 * POST /api/library/:gameId
 * Add a game to the user's library (simulates purchase for demo).
 * In a real system this would be called after payment confirmation.
 */
router.post('/:gameId', async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    if (!gameId) {
      return res.status(400).json({ error: 'Invalid game ID.' });
    }

    const pool = getPool();

    // Verify game exists and is published
    const [gameRows] = await pool.query(
      'SELECT id, title, status, price, developer_id FROM games WHERE id = ? LIMIT 1',
      [gameId]
    );
    if (gameRows.length === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }
    if (gameRows[0].status !== 'published') {
      return res.status(400).json({ error: 'You can only add published games to your library.' });
    }

    // Check if already owned
    const [existing] = await pool.query(
      'SELECT user_id FROM user_library WHERE user_id = ? AND game_id = ?',
      [req.user.id, gameId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'This game is already in your library.' });
    }

    // Add to library
    await pool.query(
      'INSERT INTO user_library (user_id, game_id) VALUES (?, ?)',
      [req.user.id, gameId]
    );

    // Auto-remove from wishlist if present
    await pool.query(
      'DELETE FROM user_wishlist WHERE user_id = ? AND game_id = ?',
      [req.user.id, gameId]
    );

    // Create a stub transaction record for demo purposes
    const game = gameRows[0];
    const platformFee = (Number(game.price) * 0.15).toFixed(2);   // 15% cut
    const devPayout = (Number(game.price) - platformFee).toFixed(2);

    await pool.query(
      `INSERT INTO transactions (buyer_id, game_id, amount, platform_fee, developer_payout, status)
       VALUES (?, ?, ?, ?, ?, 'completed')`,
      [req.user.id, gameId, game.price, platformFee, devPayout]
    );

    return res.status(201).json({
      message: `"${game.title}" added to your library.`,
      transaction: {
        gameId,
        amount: Number(game.price),
        platformFee: Number(platformFee),
        developerPayout: Number(devPayout),
        status: 'completed'
      }
    });
  } catch (err) {
    console.error('[Library Route Error] Add to library failed:', err);
    return res.status(500).json({ error: 'Internal server error adding to library.' });
  }
});

/**
 * GET /api/library/check/:gameId
 * Quick check if a specific game is in the user's library.
 */
router.get('/check/:gameId', async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    if (!gameId) return res.status(400).json({ error: 'Invalid game ID.' });

    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT user_id FROM user_library WHERE user_id = ? AND game_id = ?',
      [req.user.id, gameId]
    );

    return res.json({ inLibrary: rows.length > 0 });
  } catch (err) {
    console.error('[Library Route Error] Check library failed:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
