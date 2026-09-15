const express = require('express');
const { getPool } = require('../config/mysql');
const { ActivityLog } = require('../models/mongo');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply auth + admin role check to all admin routes
router.use(authenticateToken, requireRole('admin'));

/**
 * GET /api/admin/submissions
 * Fetch admin submission review queue with optional status filter
 */
router.get('/submissions', async (req, res) => {
  try {
    const { status } = req.query;
    const pool = getPool();

    let query = `
      SELECT s.id, s.game_id, s.developer_id, s.version_number, s.build_file_path,
             s.changelog, s.status, s.review_notes, s.review_history, s.reviewed_by,
             s.reviewed_at, s.submitted_at, s.updated_at,
             g.title AS game_title, g.slug AS game_slug, g.price AS game_price, g.status AS game_status,
             u.username AS developer_username, u.email AS developer_email,
             r.username AS reviewer_username
      FROM submissions s
      JOIN games g ON s.game_id = g.id
      JOIN users u ON s.developer_id = u.id
      LEFT JOIN users r ON s.reviewed_by = r.id
    `;

    const queryParams = [];
    if (status && ['pending', 'under_review', 'needs_changes', 'approved', 'rejected'].includes(status.toLowerCase())) {
      query += ` WHERE s.status = ?`;
      queryParams.push(status.toLowerCase());
    }

    query += ` ORDER BY s.submitted_at DESC`;

    const [rows] = await pool.query(query, queryParams);

    const submissions = rows.map((s) => ({
      id: s.id,
      gameId: s.game_id,
      gameTitle: s.game_title,
      gameSlug: s.game_slug,
      gamePrice: Number(s.game_price),
      gameStatus: s.game_status,
      developerId: s.developer_id,
      developerUsername: s.developer_username,
      developerEmail: s.developer_email,
      versionNumber: s.version_number,
      buildFilePath: s.build_file_path,
      changelog: s.changelog,
      status: s.status,
      reviewNotes: s.review_notes,
      reviewHistory: typeof s.review_history === 'string' ? JSON.parse(s.review_history || '[]') : s.review_history || [],
      reviewedBy: s.reviewed_by,
      reviewerUsername: s.reviewer_username,
      reviewedAt: s.reviewed_at,
      submittedAt: s.submitted_at,
      updatedAt: s.updated_at
    }));

    return res.json({ submissions });
  } catch (err) {
    console.error('[Admin Route Error] Fetch submission queue failed:', err);
    return res.status(500).json({ error: 'Internal server error fetching submission queue.' });
  }
});

/**
 * GET /api/admin/submissions/:id
 * Detailed view of a submission. If status is 'pending', automatically claims it
 * by transitioning status to 'under_review' to prevent concurrent reviews.
 */
router.get('/submissions/:id', async (req, res) => {
  try {
    const submissionId = Number(req.params.id);
    if (!submissionId) {
      return res.status(400).json({ error: 'Invalid submission ID.' });
    }

    const pool = getPool();

    const [rows] = await pool.query(
      `SELECT s.id, s.game_id, s.developer_id, s.version_number, s.build_file_path,
              s.changelog, s.status, s.review_notes, s.review_history, s.reviewed_by,
              s.reviewed_at, s.submitted_at, s.updated_at,
              g.title AS game_title, g.slug AS game_slug, g.description AS game_description,
              g.price AS game_price, g.primary_genre AS game_genre, g.tags AS game_tags,
              g.status AS game_status,
              u.username AS developer_username, u.email AS developer_email,
              r.username AS reviewer_username
       FROM submissions s
       JOIN games g ON s.game_id = g.id
       JOIN users u ON s.developer_id = u.id
       LEFT JOIN users r ON s.reviewed_by = r.id
       WHERE s.id = ?
       LIMIT 1`,
      [submissionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    let submission = rows[0];

    // Review Claiming Logic: Claim 'pending' submission for this admin
    if (submission.status === 'pending') {
      await pool.query(
        `UPDATE submissions SET status = 'under_review', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
        [req.user.id, submissionId]
      );

      submission.status = 'under_review';
      submission.reviewed_by = req.user.id;
      submission.reviewer_username = req.user.username;
      submission.reviewed_at = new Date();

      // Log claim action in MongoDB
      try {
        await ActivityLog.create({
          userId: req.user.id,
          action: 'SUBMISSION_CLAIMED_FOR_REVIEW',
          entityType: 'submission',
          entityId: String(submissionId),
          metadata: { gameId: submission.game_id, claimedBy: req.user.id },
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      } catch (logErr) {
        console.warn('[ActivityLog] Failed to log submission claiming:', logErr.message);
      }
    }

    return res.json({
      submission: {
        id: submission.id,
        gameId: submission.game_id,
        gameTitle: submission.game_title,
        gameSlug: submission.game_slug,
        gameDescription: submission.game_description,
        gamePrice: Number(submission.game_price),
        gameGenre: submission.game_genre,
        gameTags: typeof submission.game_tags === 'string' ? JSON.parse(submission.game_tags || '[]') : submission.game_tags || [],
        gameStatus: submission.game_status,
        developerId: submission.developer_id,
        developerUsername: submission.developer_username,
        developerEmail: submission.developer_email,
        versionNumber: submission.version_number,
        buildFilePath: submission.build_file_path,
        changelog: submission.changelog,
        status: submission.status,
        reviewNotes: submission.review_notes,
        reviewHistory: typeof submission.review_history === 'string' ? JSON.parse(submission.review_history || '[]') : submission.review_history || [],
        reviewedBy: submission.reviewed_by,
        reviewerUsername: submission.reviewer_username,
        reviewedAt: submission.reviewed_at,
        submittedAt: submission.submitted_at,
        updatedAt: submission.updated_at
      }
    });
  } catch (err) {
    console.error('[Admin Route Error] Get submission details failed:', err);
    return res.status(500).json({ error: 'Internal server error fetching submission details.' });
  }
});

/**
 * PATCH /api/admin/submissions/:id/review
 * Admin state transition decision (approved | needs_changes | rejected).
 * Enforces mandatory feedback notes for needs_changes and rejected.
 */
router.patch('/submissions/:id/review', async (req, res) => {
  try {
    const submissionId = Number(req.params.id);
    const { status, reviewNotes } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Invalid submission ID.' });
    }

    const targetStatus = (status || '').toLowerCase();
    const validStatuses = ['approved', 'needs_changes', 'rejected'];

    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: [${validStatuses.join(', ')}].` });
    }

    // Enforce mandatory feedback notes for needs_changes or rejected
    if ((targetStatus === 'needs_changes' || targetStatus === 'rejected') && (!reviewNotes || typeof reviewNotes !== 'string' || !reviewNotes.trim())) {
      return res.status(400).json({
        error: `Review feedback notes are mandatory when marking a submission as "${targetStatus}". Please provide explicit notes.`
      });
    }

    const pool = getPool();

    // Fetch existing submission
    const [subRows] = await pool.query(
      'SELECT id, game_id, version_number, status, review_notes, review_history FROM submissions WHERE id = ? LIMIT 1',
      [submissionId]
    );

    if (subRows.length === 0) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    const submission = subRows[0];
    const previousStatus = submission.status;

    // Parse review history and append new decision
    let history = [];
    try {
      history = typeof submission.review_history === 'string'
        ? JSON.parse(submission.review_history || '[]')
        : submission.review_history || [];
    } catch (e) {
      history = [];
    }

    const newHistoryEntry = {
      decision: targetStatus,
      reviewNotes: (reviewNotes || '').trim(),
      reviewedBy: req.user.id,
      reviewerUsername: req.user.username,
      timestamp: new Date().toISOString(),
      versionNumber: submission.version_number
    };
    history.push(newHistoryEntry);

    const cleanNotes = (reviewNotes || '').trim();

    // 1. Update submissions table in MySQL
    await pool.query(
      `UPDATE submissions
       SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = NOW(), review_history = ?
       WHERE id = ?`,
      [targetStatus, cleanNotes, req.user.id, JSON.stringify(history), submissionId]
    );

    // 2. Update games table status in MySQL
    let newGameStatus = 'draft';
    if (targetStatus === 'approved') {
      newGameStatus = 'published';
      await pool.query(
        "UPDATE games SET status = 'published', release_date = COALESCE(release_date, NOW()) WHERE id = ?",
        [submission.game_id]
      );
    } else if (targetStatus === 'rejected') {
      newGameStatus = 'rejected';
      await pool.query("UPDATE games SET status = 'rejected' WHERE id = ?", [submission.game_id]);
    } else if (targetStatus === 'needs_changes') {
      newGameStatus = 'draft';
      await pool.query("UPDATE games SET status = 'draft' WHERE id = ?", [submission.game_id]);
    }

    // 3. Log status transition audit trail in MongoDB ActivityLog
    try {
      await ActivityLog.create({
        userId: req.user.id,
        action: 'SUBMISSION_REVIEWED',
        entityType: 'submission',
        entityId: String(submissionId),
        metadata: {
          gameId: submission.game_id,
          previousStatus,
          newStatus: targetStatus,
          gameStatus: newGameStatus,
          reviewNotes: cleanNotes,
          reviewedBy: req.user.id
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (logErr) {
      console.warn('[ActivityLog] Failed to log submission review:', logErr.message);
    }

    return res.json({
      message: `Submission ${submissionId} review completed with decision "${targetStatus}".`,
      submission: {
        id: submissionId,
        gameId: submission.game_id,
        status: targetStatus,
        reviewNotes: cleanNotes,
        reviewedBy: req.user.id,
        reviewHistory: history
      },
      game: {
        id: submission.game_id,
        status: newGameStatus
      }
    });
  } catch (err) {
    console.error('[Admin Route Error] Review submission failed:', err);
    return res.status(500).json({ error: 'Internal server error executing submission review.' });
  }
});

module.exports = router;
