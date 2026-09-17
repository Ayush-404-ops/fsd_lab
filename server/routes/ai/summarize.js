const express = require('express');
const { getPool } = require('../../config/mysql');
const { Review } = require('../../models/mongo');
const { runReviewSummarizer } = require('../../services/ai');

const router = express.Router();

/**
 * GET /api/ai/summary/:gameId
 * Public endpoint — fetches cached review summary for a game.
 * Per Architecture §2 & approved plan: Returns { status: 'insufficient_data' }
 * if fewer than 5 reviews exist, without invoking AI generation.
 */
router.get('/:gameId', async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    if (!gameId || isNaN(gameId)) {
      return res.status(400).json({ error: 'Valid numerical game ID is required.' });
    }

    const pool = getPool();
    const [gameRows] = await pool.query(
      'SELECT id, title, status FROM games WHERE id = ? LIMIT 1',
      [gameId]
    );

    if (gameRows.length === 0) {
      return res.status(404).json({ error: `Game with ID ${gameId} not found.` });
    }

    const game = gameRows[0];

    // Fetch player reviews from MongoDB
    const reviews = await Review.find({ gameId }).lean();

    // Check review count threshold (< 5 reviews returns insufficient_data)
    if (!reviews || reviews.length < 5) {
      return res.json({
        status: 'insufficient_data',
        message: 'Fewer than 5 reviews submitted — AI review summary unavailable.',
        reviewCount: reviews ? reviews.length : 0
      });
    }

    // Run Review Summarizer (reads from MongoDB cache if review count change <= 10%)
    const summaryResult = await runReviewSummarizer(gameId, game.title, reviews);

    return res.json({
      success: true,
      gameId,
      summary: summaryResult
    });
  } catch (err) {
    console.error('[AI Summarize Route Error]:', err);
    return res.status(500).json({ error: 'Internal server error processing AI review summary.' });
  }
});

module.exports = router;
