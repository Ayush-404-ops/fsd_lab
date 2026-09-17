const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/test/public
 * Open to everyone (no auth header required)
 */
router.get('/public', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Public test endpoint — accessible by anyone.'
  });
});

/**
 * GET /api/test/player
 * Accessible by player, developer, curator, and admin
 */
router.get('/player', authenticateToken, requireRole('player', 'developer', 'curator', 'admin'), (req, res) => {
  res.json({
    status: 'ok',
    message: 'Player-level test endpoint accessed successfully.',
    user: req.user
  });
});

/**
 * GET /api/test/developer
 * Accessible by developer and admin
 */
router.get('/developer', authenticateToken, requireRole('developer', 'admin'), (req, res) => {
  res.json({
    status: 'ok',
    message: 'Developer-level test endpoint accessed successfully.',
    user: req.user
  });
});

/**
 * GET /api/test/curator
 * Accessible by curator and admin
 */
router.get('/curator', authenticateToken, requireRole('curator', 'admin'), (req, res) => {
  res.json({
    status: 'ok',
    message: 'Curator-level test endpoint accessed successfully.',
    user: req.user
  });
});

/**
 * GET /api/test/admin
 * Accessible strictly by admin
 */
router.get('/admin', authenticateToken, requireRole('admin'), (req, res) => {
  res.json({
    status: 'ok',
    message: 'Admin-level test endpoint accessed successfully.',
    user: req.user
  });
});

module.exports = router;
