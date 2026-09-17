const express = require('express');
const triageRoutes = require('./triage');
const summarizeRoutes = require('./summarize');
const suggestTagsRoutes = require('./suggestTags');

const router = express.Router();

router.use('/triage', triageRoutes);
router.use('/summary', summarizeRoutes);
router.use('/suggest-tags', suggestTagsRoutes);

module.exports = router;
