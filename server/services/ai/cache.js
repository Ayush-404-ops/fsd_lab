/**
 * IndieVault AI Cache & Telemetry Layer
 * Handles SHA-256 content hashing, MongoDB read/write operations for triage
 * and review summaries, and sanitized execution logging into ai_call_logs.
 */

const crypto = require('crypto');
const { AITriageCache, AIReviewSummary, AICallLog } = require('../../models/mongo');

/**
 * Generates a SHA-256 content hash for arbitrary data (object, array, or string).
 * @param {Object|Array|string} data 
 * @returns {string} Hex SHA-256 string
 */
function generateContentHash(data) {
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data || {});
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Retrieves cached submission triage output if submissionId and contentHash match.
 * @param {number} submissionId 
 * @param {string} contentHash 
 * @returns {Promise<Object|null>}
 */
async function getTriageCache(submissionId, contentHash) {
  try {
    const cached = await AITriageCache.findOne({ submissionId, contentHash }).lean();
    if (!cached) return null;
    return {
      submissionId: cached.submissionId,
      contentHash: cached.contentHash,
      promptVersion: cached.promptVersion,
      summary: cached.summary,
      risk_flags: cached.riskFlags || [],
      missing_info: cached.missingInfo || [],
      suggested_action: cached.suggestedAction,
      createdAt: cached.createdAt,
      isCached: true
    };
  } catch (err) {
    console.error(`[AI Cache] Failed to read triage cache: ${err.message}`);
    return null;
  }
}

/**
 * Stores or updates triage results in AITriageCache collection.
 * @param {Object} data 
 */
async function setTriageCache({ submissionId, contentHash, promptVersion, summary, riskFlags, missingInfo, suggestedAction }) {
  try {
    const updateData = {
      submissionId,
      contentHash,
      promptVersion,
      summary,
      riskFlags: riskFlags || [],
      missingInfo: missingInfo || [],
      suggestedAction: suggestedAction || 'proceed_normally'
    };

    await AITriageCache.findOneAndUpdate(
      { submissionId },
      updateData,
      { upsert: true, new: true, runValidators: true }
    );
  } catch (err) {
    console.error(`[AI Cache] Failed to write triage cache: ${err.message}`);
  }
}

/**
 * Retrieves cached review summary if current review count has not changed by more than 10%.
 * @param {number} gameId 
 * @param {number} currentReviewCount 
 * @returns {Promise<Object|null>}
 */
async function getReviewSummaryCache(gameId, currentReviewCount) {
  try {
    const cached = await AIReviewSummary.findOne({ gameId }).lean();
    if (!cached) return null;

    const previousCount = cached.reviewCountConsidered || 0;
    const diff = Math.abs(currentReviewCount - previousCount);
    const denominator = Math.max(previousCount, 1);
    const percentageChange = diff / denominator;

    // Serve cached summary if review count change <= 10%
    if (percentageChange <= 0.10) {
      return {
        gameId: cached.gameId,
        promptVersion: cached.promptVersion,
        pros: cached.pros || [],
        cons: cached.cons || [],
        overall_sentiment: cached.overallSentiment,
        review_count_considered: cached.reviewCountConsidered,
        generatedAt: cached.generatedAt,
        isCached: true
      };
    }

    // Cache stale (>10% change)
    return null;
  } catch (err) {
    console.error(`[AI Cache] Failed to read review summary cache: ${err.message}`);
    return null;
  }
}

/**
 * Stores or updates review summary in AIReviewSummary collection.
 * @param {Object} data 
 */
async function setReviewSummaryCache({ gameId, promptVersion, pros, cons, overallSentiment, reviewCountConsidered }) {
  try {
    const updateData = {
      gameId,
      promptVersion,
      pros: pros || [],
      cons: cons || [],
      overallSentiment,
      reviewCountConsidered,
      generatedAt: new Date()
    };

    await AIReviewSummary.findOneAndUpdate(
      { gameId },
      updateData,
      { upsert: true, new: true, runValidators: true }
    );
  } catch (err) {
    console.error(`[AI Cache] Failed to write review summary cache: ${err.message}`);
  }
}

/**
 * Categorizes an error for security-compliant telemetry logging.
 * Guarantees that raw error text, stack traces, and request details are NEVER logged.
 * @param {Error} error 
 * @returns {string} Categorized error type string
 */
function categorizeError(error) {
  if (!error) return null;
  if (error.name === 'MalformedResponseError') {
    if (error.message.includes('Schema validation failed')) {
      return 'SCHEMA_VALIDATION_ERROR';
    }
    return 'MALFORMED_JSON_ERROR';
  }
  const status = error.status || error.statusCode;
  if (status === 429) return 'RATE_LIMIT_ERROR';
  if (error.isTransient) return 'TRANSIENT_API_ERROR';
  if (status >= 400 && status < 500) return 'NON_TRANSIENT_API_ERROR';
  if (status >= 500) return 'SERVER_API_ERROR';

  return 'UNKNOWN_ERROR';
}

/**
 * Logs execution metadata into AICallLog collection.
 * STRICT SECURITY REQUIREMENT: Never logs raw error text or user PII.
 * @param {Object} params
 * @param {string} params.feature - 'triage' | 'summarizer' | 'tag'
 * @param {string} params.promptVersion 
 * @param {number} params.latencyMs 
 * @param {boolean} params.success 
 * @param {Error|string} [params.error] - Optional error object to categorize
 */
async function logAICall({ feature, promptVersion, latencyMs, success, error }) {
  try {
    const errorType = success ? null : (typeof error === 'string' ? error : categorizeError(error));

    await AICallLog.create({
      feature,
      promptVersion,
      latencyMs: Math.max(0, Math.round(latencyMs || 0)),
      success: Boolean(success),
      errorType,
      timestamp: new Date()
    });
  } catch (err) {
    console.error(`[AI Telemetry Log] Failed to write call log: ${err.message}`);
  }
}

module.exports = {
  generateContentHash,
  getTriageCache,
  setTriageCache,
  getReviewSummaryCache,
  setReviewSummaryCache,
  categorizeError,
  logAICall
};
