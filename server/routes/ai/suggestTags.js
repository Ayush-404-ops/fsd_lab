const express = require('express');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { runTagSuggestion } = require('../../services/ai');

const router = express.Router();

/**
 * POST /api/ai/suggest-tags
 * Generates smart micro-tag suggestions based on game description.
 * Protected: Developer or Admin role required.
 */
router.post('/', authenticateToken, requireRole('developer', 'admin'), async (req, res) => {
  try {
    const { title, description, category } = req.body;

    // Server-side input validation per approved plan
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Game title is required for tag suggestions.' });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Game description is required for tag suggestions.' });
    }

    // Enforce 2000 character limit on description before reaching promptBuilder
    if (description.trim().length > 2000) {
      return res.status(400).json({
        error: `Description exceeds the maximum allowed length of 2000 characters for AI analysis (current: ${description.trim().length} characters).`
      });
    }

    // Execute AI Tag Suggestion service
    const tagResult = await runTagSuggestion(
      title.trim(),
      description.trim(),
      category ? category.trim() : 'General'
    );

    return res.json({
      success: true,
      suggestions: tagResult
    });
  } catch (err) {
    console.error('[AI Suggest-Tags Route Error]:', err);
    return res.status(500).json({ error: 'Internal server error generating AI tag suggestions.' });
  }
});

module.exports = router;
