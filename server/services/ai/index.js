/**
 * IndieVault AI Service Module Facade
 * Orchestrates caching, prompt building, API call execution with retries,
 * JSON response parsing, fallback handling, and telemetry logging.
 */

const client = require('./client');
const promptBuilder = require('./promptBuilder');
const responseParser = require('./responseParser');
const cache = require('./cache');
const fallback = require('./fallback');

/**
 * Executes Submission Triage Assistant.
 * @param {Object} submission - Game submission metadata object
 * @returns {Promise<Object>} Triage note (cached, AI-generated, or fallback)
 */
async function runSubmissionTriage(submission = {}) {
  const submissionId = Number(submission.id || submission.submissionId || 0);

  // Compute SHA-256 hash of submission metadata
  const metadataToHash = {
    title: submission.title,
    category: submission.category,
    price: submission.price,
    description: submission.description,
    screenshot_count: submission.screenshot_count ?? submission.screenshotCount ?? (submission.screenshots ? submission.screenshots.length : 0),
    tags: submission.tags
  };
  const contentHash = cache.generateContentHash(metadataToHash);

  // 1. Cache lookup
  if (submissionId) {
    const cached = await cache.getTriageCache(submissionId, contentHash);
    if (cached) {
      return cached;
    }
  }

  // 2. Build Prompt
  const { systemPrompt, userPrompt, promptVersion } = promptBuilder.buildTriagePrompt(submission);

  try {
    // 3. Call Claude & Parse Response with Retry
    const result = await responseParser.executeWithRetry({
      callClaudeFn: client.callClaude,
      feature: 'triage',
      prompt: userPrompt,
      systemPrompt
    });

    const parsed = result.parsedData;

    // 4. Save to Cache
    if (submissionId) {
      await cache.setTriageCache({
        submissionId,
        contentHash,
        promptVersion,
        summary: parsed.summary,
        riskFlags: parsed.risk_flags,
        missingInfo: parsed.missing_info,
        suggestedAction: parsed.suggested_action
      });
    }

    // 5. Log Telemetry
    await cache.logAICall({
      feature: 'triage',
      promptVersion,
      latencyMs: result.latencyMs,
      success: true
    });

    return {
      ...parsed,
      promptVersion,
      isCached: false,
      isFallback: false
    };
  } catch (err) {
    // Log Failure Telemetry (sanitized error category only)
    await cache.logAICall({
      feature: 'triage',
      promptVersion,
      latencyMs: 0,
      success: false,
      error: err
    });

    // 6. Return Fallback
    return {
      ...fallback.getTriageFallback(submission),
      promptVersion
    };
  }
}

/**
 * Executes Review Summarizer for player reviews of a game.
 * @param {number} gameId 
 * @param {string} title 
 * @param {Array} reviews 
 * @returns {Promise<Object>} Review summary (cached, AI-generated, or fallback)
 */
async function runReviewSummarizer(gameId, title, reviews = []) {
  const numericGameId = Number(gameId || 0);
  const totalReviews = Array.isArray(reviews) ? reviews.length : 0;

  // 1. Cache lookup (check staleness <= 10% change in review count)
  if (numericGameId) {
    const cached = await cache.getReviewSummaryCache(numericGameId, totalReviews);
    if (cached) {
      return cached;
    }
  }

  // 2. Build Prompt & Sample Reviews
  const { systemPrompt, userPrompt, promptVersion } = promptBuilder.buildSummarizerPrompt({
    title,
    reviews,
    totalReviews
  });

  try {
    // 3. Call Claude & Parse Response with Retry
    const result = await responseParser.executeWithRetry({
      callClaudeFn: client.callClaude,
      feature: 'summarizer',
      prompt: userPrompt,
      systemPrompt
    });

    const parsed = result.parsedData;

    // 4. Save to Cache
    if (numericGameId) {
      await cache.setReviewSummaryCache({
        gameId: numericGameId,
        promptVersion,
        pros: parsed.pros,
        cons: parsed.cons,
        overallSentiment: parsed.overall_sentiment,
        reviewCountConsidered: parsed.review_count_considered
      });
    }

    // 5. Log Telemetry
    await cache.logAICall({
      feature: 'summarizer',
      promptVersion,
      latencyMs: result.latencyMs,
      success: true
    });

    return {
      ...parsed,
      promptVersion,
      isCached: false,
      isFallback: false
    };
  } catch (err) {
    await cache.logAICall({
      feature: 'summarizer',
      promptVersion,
      latencyMs: 0,
      success: false,
      error: err
    });

    return {
      ...fallback.getReviewSummaryFallback(numericGameId, reviews),
      promptVersion
    };
  }
}

/**
 * Executes Smart Tag Suggestion.
 * @param {string} title 
 * @param {string} description 
 * @param {string} category 
 * @returns {Promise<Object>} Tag suggestions (AI-generated or fallback)
 */
async function runTagSuggestion(title, description, category) {
  // 1. Build Prompt
  const { systemPrompt, userPrompt, promptVersion } = promptBuilder.buildTagPrompt({
    title,
    description,
    category
  });

  try {
    // 2. Call Claude & Parse Response with Retry
    const result = await responseParser.executeWithRetry({
      callClaudeFn: client.callClaude,
      feature: 'tag',
      prompt: userPrompt,
      systemPrompt
    });

    const parsed = result.parsedData;

    // 3. Log Telemetry
    await cache.logAICall({
      feature: 'tag',
      promptVersion,
      latencyMs: result.latencyMs,
      success: true
    });

    return {
      ...parsed,
      promptVersion,
      isFallback: false
    };
  } catch (err) {
    await cache.logAICall({
      feature: 'tag',
      promptVersion,
      latencyMs: 0,
      success: false,
      error: err
    });

    return {
      ...fallback.getTagSuggestionFallback(category),
      promptVersion
    };
  }
}

module.exports = {
  client,
  promptBuilder,
  responseParser,
  cache,
  fallback,
  runSubmissionTriage,
  runReviewSummarizer,
  runTagSuggestion
};
