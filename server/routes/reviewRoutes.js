const express = require('express');
const { getPool } = require('../config/mysql');
const { Review, ActivityLog } = require('../models/mongo');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/reviews/:gameId
 * Public — returns all reviews for a game, sorted by most recent.
 */
router.get('/:gameId', async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    if (!gameId) {
      return res.status(400).json({ error: 'Invalid game ID.' });
    }

    // Verify game exists
    const pool = getPool();
    const [gameRows] = await pool.query(
      "SELECT id FROM games WHERE id = ? AND status = 'published' LIMIT 1",
      [gameId]
    );
    if (gameRows.length === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    const reviews = await Review.find({ gameId })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch usernames for reviewers from MySQL
    const userIds = [...new Set(reviews.map(r => r.userId))];
    let userMap = {};
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const [users] = await pool.query(
        `SELECT id, username, avatar_url FROM users WHERE id IN (${placeholders})`,
        userIds
      );
      userMap = Object.fromEntries(users.map(u => [u.id, { username: u.username, avatarUrl: u.avatar_url }]));
    }

    // Compute aggregate stats
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : null;
    const recommendedCount = reviews.filter(r => r.isRecommended).length;

    const formattedReviews = reviews.map(r => ({
      id: r._id,
      gameId: r.gameId,
      userId: r.userId,
      username: userMap[r.userId]?.username || 'Unknown',
      avatarUrl: userMap[r.userId]?.avatarUrl || null,
      rating: r.rating,
      title: r.title,
      content: r.content,
      isRecommended: r.isRecommended,
      helpfulnessVotes: r.helpfulnessVotes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    return res.json({
      reviews: formattedReviews,
      stats: {
        totalReviews,
        averageRating: avgRating ? Number(avgRating) : null,
        recommendedCount,
        recommendedPercent: totalReviews > 0
          ? Math.round((recommendedCount / totalReviews) * 100)
          : null
      }
    });
  } catch (err) {
    console.error('[Review Route Error] Fetch reviews failed:', err);
    return res.status(500).json({ error: 'Internal server error fetching reviews.' });
  }
});

/**
 * POST /api/reviews/:gameId
 * Authenticated — submit a review for a published game.
 * One review per user per game (enforced by MongoDB unique index).
 */
router.post('/:gameId', authenticateToken, async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    if (!gameId) {
      return res.status(400).json({ error: 'Invalid game ID.' });
    }

    const { rating, title, content, isRecommended } = req.body;

    // Validate required fields
    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Review title is required.' });
    }
    if (title.trim().length > 120) {
      return res.status(400).json({ error: 'Review title must be at most 120 characters.' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Review content is required.' });
    }

    // Verify game exists and is published
    const pool = getPool();
    const [gameRows] = await pool.query(
      'SELECT id, status, developer_id FROM games WHERE id = ? LIMIT 1',
      [gameId]
    );
    if (gameRows.length === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }
    if (gameRows[0].status !== 'published') {
      return res.status(400).json({ error: 'Reviews can only be submitted for published games.' });
    }
    // Developers cannot review their own game
    if (gameRows[0].developer_id === req.user.id) {
      return res.status(403).json({ error: 'You cannot review your own game.' });
    }

    // Check for duplicate review
    const existingReview = await Review.findOne({ gameId, userId: req.user.id });
    if (existingReview) {
      return res.status(409).json({ error: 'You have already reviewed this game. You can update your existing review.' });
    }

    const review = await Review.create({
      gameId,
      userId: req.user.id,
      rating,
      title: title.trim(),
      content: content.trim(),
      isRecommended: isRecommended !== undefined ? Boolean(isRecommended) : rating >= 3
    });

    // Log activity
    try {
      await ActivityLog.create({
        userId: req.user.id,
        action: 'REVIEW_SUBMITTED',
        entityType: 'review',
        entityId: String(review._id),
        metadata: { gameId, rating, isRecommended: review.isRecommended },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (logErr) {
      console.warn('[ActivityLog] Failed to log review submission:', logErr.message);
    }

    return res.status(201).json({
      message: 'Review submitted successfully.',
      review: {
        id: review._id,
        gameId: review.gameId,
        userId: review.userId,
        rating: review.rating,
        title: review.title,
        content: review.content,
        isRecommended: review.isRecommended,
        createdAt: review.createdAt
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You have already reviewed this game.' });
    }
    console.error('[Review Route Error] Submit review failed:', err);
    return res.status(500).json({ error: 'Internal server error submitting review.' });
  }
});

/**
 * PUT /api/reviews/:gameId
 * Authenticated — update your own review.
 */
router.put('/:gameId', authenticateToken, async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    if (!gameId) {
      return res.status(400).json({ error: 'Invalid game ID.' });
    }

    const { rating, title, content, isRecommended } = req.body;

    const existingReview = await Review.findOne({ gameId, userId: req.user.id });
    if (!existingReview) {
      return res.status(404).json({ error: 'You have not reviewed this game yet.' });
    }

    if (rating !== undefined) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
      }
      existingReview.rating = rating;
    }
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Review title cannot be empty.' });
      }
      existingReview.title = title.trim();
    }
    if (content !== undefined) {
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: 'Review content cannot be empty.' });
      }
      existingReview.content = content.trim();
    }
    if (isRecommended !== undefined) {
      existingReview.isRecommended = Boolean(isRecommended);
    }

    await existingReview.save();

    return res.json({
      message: 'Review updated successfully.',
      review: {
        id: existingReview._id,
        gameId: existingReview.gameId,
        userId: existingReview.userId,
        rating: existingReview.rating,
        title: existingReview.title,
        content: existingReview.content,
        isRecommended: existingReview.isRecommended,
        updatedAt: existingReview.updatedAt
      }
    });
  } catch (err) {
    console.error('[Review Route Error] Update review failed:', err);
    return res.status(500).json({ error: 'Internal server error updating review.' });
  }
});

/**
 * DELETE /api/reviews/:gameId
 * Authenticated — delete your own review.
 */
router.delete('/:gameId', authenticateToken, async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    if (!gameId) {
      return res.status(400).json({ error: 'Invalid game ID.' });
    }

    const result = await Review.findOneAndDelete({ gameId, userId: req.user.id });
    if (!result) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    return res.json({ message: 'Review deleted successfully.' });
  } catch (err) {
    console.error('[Review Route Error] Delete review failed:', err);
    return res.status(500).json({ error: 'Internal server error deleting review.' });
  }
});

module.exports = router;
