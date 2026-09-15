const express = require('express');
const { MICRO_TAGS, ALL_TAGS } = require('../config/microTags');

const router = express.Router();

/**
 * GET /api/tags
 * Public — returns the categorized micro-tag list for submission forms and search filters.
 */
router.get('/', (req, res) => {
  return res.json({
    categories: MICRO_TAGS,
    allTags: ALL_TAGS,
    totalCount: ALL_TAGS.length
  });
});

module.exports = router;
