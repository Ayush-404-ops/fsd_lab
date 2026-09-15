const express = require('express');
const path = require('path');
const { getPool } = require('../config/mysql');
const { ActivityLog } = require('../models/mongo');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { uploadBuild } = require('../middleware/upload');

const router = express.Router();

/**
 * POST /api/submissions
 * Submits a game build (creates or updates submission if needs_changes)
 * Protected: Developer, Admin
 */
router.post('/', authenticateToken, requireRole('developer', 'admin'), (req, res, next) => {
  // Handle multer file upload errors gracefully
  uploadBuild.single('buildFile')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { game_id, version_number, changelog } = req.body;
    const gameId = Number(game_id);

    // 1. Validation
    if (!gameId) {
      return res.status(400).json({ error: 'Valid game_id is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Build file upload is required.' });
    }

    if (!version_number || !version_number.trim()) {
      return res.status(400).json({ error: 'Version number is required.' });
    }

    if (!changelog || !changelog.trim()) {
      return res.status(400).json({ error: 'Changelog is required.' });
    }

    const pool = getPool();

    // 2. Fetch game details and enforce ownership
    const [gameRows] = await pool.query('SELECT id, title, developer_id, status FROM games WHERE id = ? LIMIT 1', [gameId]);
    if (gameRows.length === 0) {
      return res.status(404).json({ error: `Game with ID ${gameId} not found.` });
    }

    const game = gameRows[0];
    const isOwner = game.developer_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden. You can only submit builds for games you own.' });
    }

    const serverBuildPath = `/uploads/builds/${path.basename(req.file.path)}`;

    // 3. Check for existing submission (to handle resubmission on needs_changes)
    const [existingSubs] = await pool.query(
      'SELECT id, version_number, status, review_notes, review_history FROM submissions WHERE game_id = ? ORDER BY id DESC LIMIT 1',
      [gameId]
    );

    let submissionId;
    let isResubmission = false;

    if (existingSubs.length > 0 && existingSubs[0].status === 'needs_changes') {
      // RESUBMISSION Logic: Update existing submission record to maintain single audit trail
      isResubmission = true;
      const existingSub = existingSubs[0];
      submissionId = existingSub.id;

      let history = [];
      try {
        history = typeof existingSub.review_history === 'string'
          ? JSON.parse(existingSub.review_history || '[]')
          : existingSub.review_history || [];
      } catch (e) {
        history = [];
      }

      await pool.query(
        `UPDATE submissions
         SET version_number = ?, build_file_path = ?, changelog = ?, status = 'pending',
             review_notes = NULL, reviewed_by = NULL, reviewed_at = NULL, review_history = ?
         WHERE id = ?`,
        [
          version_number.trim(),
          serverBuildPath,
          changelog.trim(),
          JSON.stringify(history),
          submissionId
        ]
      );
    } else {
      // NEW SUBMISSION Logic
      const [insertResult] = await pool.query(
        `INSERT INTO submissions (game_id, developer_id, version_number, build_file_path, changelog, status, review_history)
         VALUES (?, ?, ?, ?, ?, 'pending', '[]')`,
        [
          gameId,
          req.user.id,
          version_number.trim(),
          serverBuildPath,
          changelog.trim()
        ]
      );
      submissionId = insertResult.insertId;
    }

    // Update Game Status to pending_review
    await pool.query("UPDATE games SET status = 'pending_review' WHERE id = ?", [gameId]);

    // Log event in MongoDB ActivityLog
    try {
      await ActivityLog.create({
        userId: req.user.id,
        action: isResubmission ? 'SUBMISSION_RESUBMITTED' : 'SUBMISSION_CREATED',
        entityType: 'submission',
        entityId: String(submissionId),
        metadata: {
          gameId,
          versionNumber: version_number.trim(),
          buildFilePath: serverBuildPath,
          isResubmission
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (logErr) {
      console.warn('[ActivityLog] Failed to log submission event:', logErr.message);
    }

    return res.status(isResubmission ? 200 : 201).json({
      message: isResubmission ? 'Submission updated and resubmitted successfully.' : 'Build submitted for admin review successfully.',
      submission: {
        id: submissionId,
        gameId,
        developerId: req.user.id,
        versionNumber: version_number.trim(),
        buildFilePath: serverBuildPath,
        changelog: changelog.trim(),
        status: 'pending',
        isResubmission
      }
    });
  } catch (err) {
    console.error('[Submission Route Error] Submit build failed:', err);
    return res.status(500).json({ error: 'Internal server error submitting game build.' });
  }
});

/**
 * GET /api/submissions/my
 * Returns list of game submissions owned by the authenticated developer
 * Protected: Developer, Admin
 */
router.get('/my', authenticateToken, requireRole('developer', 'admin'), async (req, res) => {
  try {
    const pool = getPool();
    const developerId = req.user.id;

    const [rows] = await pool.query(
      `SELECT s.id, s.game_id, s.version_number, s.build_file_path, s.changelog,
              s.status, s.review_notes, s.review_history, s.reviewed_at, s.submitted_at, s.updated_at,
              g.title AS game_title, g.slug AS game_slug, g.status AS game_status
       FROM submissions s
       JOIN games g ON s.game_id = g.id
       WHERE s.developer_id = ?
       ORDER BY s.updated_at DESC`,
      [developerId]
    );

    const submissions = rows.map((s) => ({
      id: s.id,
      gameId: s.game_id,
      gameTitle: s.game_title,
      gameSlug: s.game_slug,
      gameStatus: s.game_status,
      versionNumber: s.version_number,
      buildFilePath: s.build_file_path,
      changelog: s.changelog,
      status: s.status,
      reviewNotes: s.review_notes,
      reviewHistory: typeof s.review_history === 'string' ? JSON.parse(s.review_history || '[]') : s.review_history || [],
      reviewedAt: s.reviewed_at,
      submittedAt: s.submitted_at,
      updatedAt: s.updated_at
    }));

    return res.json({ submissions });
  } catch (err) {
    console.error('[Submission Route Error] Fetch my submissions failed:', err);
    return res.status(500).json({ error: 'Internal server error fetching your submissions.' });
  }
});

module.exports = router;
