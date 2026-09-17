const rateLimit = require('express-rate-limit');

/**
 * Express rate limiter specifically for AI routes (/api/ai/*).
 * Capped per user ID (or IP address if unauthenticated).
 * Default: 10 requests per minute per user/IP.
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: Number(process.env.AI_RATE_LIMIT_PER_MIN) || 10,
  keyGenerator: (req) => {
    // Rate limit per logged in user ID if available, fallback to IP address
    return req.user?.id ? `user_${req.user.id}` : (req.ip || '127.0.0.1');
  },
  validate: { xForwardedForHeader: false, default: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many AI requests. Please slow down and try again in a minute.'
  }
});

module.exports = aiRateLimiter;
