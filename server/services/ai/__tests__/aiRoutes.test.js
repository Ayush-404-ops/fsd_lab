/**
 * AI Routes Express Integration Unit Tests
 * Tests /api/ai/triage, /api/ai/summary, and /api/ai/suggest-tags validation and behavior.
 */

const express = require('express');

// Create persistent mock query function
const mockQuery = jest.fn();

// Mock Auth middleware for testing
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, username: 'adminuser', role: 'admin' };
    next();
  },
  requireRole: (...roles) => (req, res, next) => {
    next();
  }
}));

// Mock MySQL pool
jest.mock('../../../config/mysql', () => ({
  getPool: () => ({
    query: mockQuery
  })
}));

// Mock Mongo Review model
jest.mock('../../../models/mongo', () => ({
  Review: {
    find: jest.fn()
  },
  AITriageCache: {},
  AIReviewSummary: {},
  AICallLog: { create: jest.fn() }
}));

// Mock AI Service functions
jest.mock('../index', () => ({
  runSubmissionTriage: jest.fn().mockResolvedValue({
    summary: 'Mock triage summary',
    risk_flags: [],
    missing_info: [],
    suggested_action: 'proceed_normally',
    isFallback: false
  }),
  runReviewSummarizer: jest.fn().mockResolvedValue({
    pros: ['Good visuals'],
    cons: ['Short campaign'],
    overall_sentiment: 'mostly_positive',
    review_count_considered: 8,
    isFallback: false
  }),
  runTagSuggestion: jest.fn().mockResolvedValue({
    suggested_tags: ['pixel art', 'cozy farming sim'],
    reasoning: 'Matches gameplay description.',
    isFallback: false
  })
}));

const { Review } = require('../../../models/mongo');
const triageRouter = require('../../../routes/ai/triage');
const summarizeRouter = require('../../../routes/ai/summarize');
const suggestTagsRouter = require('../../../routes/ai/suggestTags');

describe('AI Express Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/ai/triage', triageRouter);
    app.use('/api/ai/summary', summarizeRouter);
    app.use('/api/ai/suggest-tags', suggestTagsRouter);
  });

  // -------------------------------------------------------------------------
  // 1. Triage Route (/api/ai/triage/:submissionId)
  // -------------------------------------------------------------------------
  describe('POST /api/ai/triage/:submissionId', () => {
    test('returns 404 Not Found if submission ID does not exist in MySQL database', async () => {
      mockQuery.mockResolvedValueOnce([[], []]); // Empty rows array

      const req = { params: { submissionId: '999' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      const handler = triageRouter.stack.find(s => s.route && s.route.path === '/:submissionId').route.stack.slice(-1)[0].handle;
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('not found') }));
    });
  });

  // -------------------------------------------------------------------------
  // 2. Summarize Route (/api/ai/summary/:gameId)
  // -------------------------------------------------------------------------
  describe('GET /api/ai/summary/:gameId', () => {
    test('returns status "insufficient_data" when reviews count is less than 5', async () => {
      mockQuery.mockResolvedValueOnce([[{ id: 1, title: 'Game Title', status: 'published' }], []]);
      Review.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([{ rating: 5 }, { rating: 4 }]) }); // 2 reviews

      const req = { params: { gameId: '1' } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      const handler = summarizeRouter.stack.find(s => s.route && s.route.path === '/:gameId').route.stack.slice(-1)[0].handle;
      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'insufficient_data',
        message: expect.stringContaining('Fewer than 5 reviews')
      }));
    });
  });

  // -------------------------------------------------------------------------
  // 3. Suggest Tags Route (/api/ai/suggest-tags)
  // -------------------------------------------------------------------------
  describe('POST /api/ai/suggest-tags', () => {
    test('returns 400 Bad Request if description exceeds 2000 characters', async () => {
      const longDescription = 'A'.repeat(2050);
      const req = { body: { title: 'Long Game', description: longDescription } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      const handler = suggestTagsRouter.stack.find(s => s.route && s.route.path === '/').route.stack.slice(-1)[0].handle;
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('exceeds the maximum allowed length') }));
    });
  });
});
