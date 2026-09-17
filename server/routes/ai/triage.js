const express = require('express');
const { getPool } = require('../../config/mysql');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { runSubmissionTriage } = require('../../services/ai');

const router = express.Router();

/**
 * POST /api/ai/triage/:submissionId
 * Generates or fetches cached AI triage note for a game submission.
 * Protected: Admin only.
 */
router.post('/:submissionId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const submissionId = Number(req.params.submissionId);
    if (!submissionId || isNaN(submissionId)) {
      return res.status(400).json({ error: 'Valid numerical submission ID is required.' });
    }

    const pool = getPool();

    // 1. Fetch submission details from MySQL database first
    const [rows] = await pool.query(
      `SELECT s.id, s.game_id, s.version_number, s.changelog, s.status AS submission_status,
              g.title, g.description, g.price, g.primary_genre AS category, g.tags
       FROM submissions s
       JOIN games g ON s.game_id = g.id
       WHERE s.id = ?
       LIMIT 1`,
      [submissionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `Submission with ID ${submissionId} not found.` });
    }

    const sub = rows[0];

    // Format submission object for AI triage service
    const submissionObj = {
      id: sub.id,
      gameId: sub.game_id,
      title: sub.title,
      description: sub.description,
      category: sub.category,
      price: Number(sub.price || 0),
      versionNumber: sub.version_number,
      changelog: sub.changelog,
      tags: typeof sub.tags === 'string' ? JSON.parse(sub.tags || '[]') : sub.tags || [],
      screenshot_count: 0 // Default screenshot count if not explicitly stored
    };

    // 2. Execute AI Submission Triage Service
    const triageResult = await runSubmissionTriage(submissionObj);

    return res.json({
      success: true,
      submissionId: sub.id,
      triage: triageResult
    });
  } catch (err) {
    console.error('[AI Triage Route Error]:', err);
    return res.status(500).json({ error: 'Internal server error processing AI submission triage.' });
  }
});

module.exports = router;
