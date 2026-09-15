const express = require('express');
const { getPool } = require('../config/mysql');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All wishlist routes require authentication
router.use(authenticateToken);

/**
 * GET /api/wishlist
 * Returns the current user's wishlisted games.
 */
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT g.id, g.title, g.slug, g.price, g.status, g.primary_genre, g.tags,
              g.thumbnail_url, g.banner_url, g.release_date,
              u.username AS developer_username,
              w.added_at
       FROM user_wishlist w
       JOIN games g ON w.game_id = g.id
       JOIN users u ON g.developer_id = u.id
       WHERE w.user_id = ? AND g.status = 'published'
       ORDER BY w.added_at DESC`,
      [req.user.id]
    );

    const wishlist = rows.map(g => ({
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
      addedAt: g.added_at
    }));

    return res.json({ wishlist });
  } catch (err) {
    console.error('[Wishlist Route Error] Fetch wishlist failed:', err);
    return res.status(500).json({ error: 'Internal server error fetching wishlist.' });
  }
});

/**
 * POST /api/wishlist/:gameId
 * Add a game to the user's wishlist.
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
      'SELECT id, status FROM games WHERE id = ? LIMIT 1',
      [gameId]
    );
    if (gameRows.length === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }
    if (gameRows[0].status !== 'published') {
      return res.status(400).json({ error: 'You can only wishlist published games.' });
    }

    // Check if already in library (you own it, no need to wishlist)
    const [libRows] = await pool.query(
      'SELECT user_id FROM user_library WHERE user_id = ? AND game_id = ?',
      [req.user.id, gameId]
    );
    if (libRows.length > 0) {
      return res.status(400).json({ error: 'This game is already in your library.' });
    }

    // Insert (ignore duplicate)
    await pool.query(
      'INSERT IGNORE INTO user_wishlist (user_id, game_id) VALUES (?, ?)',
      [req.user.id, gameId]
    );

    return res.status(201).json({ message: 'Game added to wishlist.' });
  } catch (err) {
    console.error('[Wishlist Route Error] Add to wishlist failed:', err);
    return res.status(500).json({ error: 'Internal server error adding to wishlist.' });
  }
});

/**
 * DELETE /api/wishlist/:gameId
 * Remove a game from the user's wishlist.
 */
router.delete('/:gameId', async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    if (!gameId) {
      return res.status(400).json({ error: 'Invalid game ID.' });
    }

    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM user_wishlist WHERE user_id = ? AND game_id = ?',
      [req.user.id, gameId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Game not found in your wishlist.' });
    }

    return res.json({ message: 'Game removed from wishlist.' });
  } catch (err) {
    console.error('[Wishlist Route Error] Remove from wishlist failed:', err);
    return res.status(500).json({ error: 'Internal server error removing from wishlist.' });
  }
});

/**
 * GET /api/wishlist/check/:gameId
 * Quick check if a specific game is in the user's wishlist.
 */
router.get('/check/:gameId', async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    if (!gameId) return res.status(400).json({ error: 'Invalid game ID.' });

    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT user_id FROM user_wishlist WHERE user_id = ? AND game_id = ?',
      [req.user.id, gameId]
    );

    return res.json({ inWishlist: rows.length > 0 });
  } catch (err) {
    console.error('[Wishlist Route Error] Check wishlist failed:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
