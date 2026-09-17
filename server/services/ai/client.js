const { Anthropic } = require('@anthropic-ai/sdk');

let customClient = null;

/**
 * Get or initialize the Anthropic SDK client.
 */
function getClient() {
  if (customClient) {
    return customClient;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY || 'dummy_key_for_dev';
  return new Anthropic({ apiKey });
}

/**
 * Override the Anthropic SDK client (primarily for unit testing with mocks).
 * @param {Object} mockClient 
 */
function setClient(mockClient) {
  customClient = mockClient;
}

/**
 * Reset client back to default initialization.
 */
function resetClient() {
  customClient = null;
}

/**
 * Returns the configured model identifier for a specific feature.
 * @param {string} feature - 'triage' | 'summarizer' | 'tag'
 */
function getModelForFeature(feature) {
  switch (feature) {
    case 'triage':
      return process.env.AI_TRIAGE_MODEL || 'claude-3-5-haiku-20241022';
    case 'summarizer':
      return process.env.AI_SUMMARY_MODEL || 'claude-3-5-sonnet-20241022';
    case 'tag':
      return process.env.AI_TAG_MODEL || 'claude-3-5-haiku-20241022';
    default:
      return process.env.AI_TRIAGE_MODEL || 'claude-3-5-haiku-20241022';
  }
}

/**
 * Helper to determine if an error is transient (retriable).
 * Retries on 5xx, 429, timeouts, and network connection errors.
 * Does NOT retry on 4xx (400 bad request, 401 unauthenticated, 403 forbidden, etc).
 * @param {Error} error 
 */
function isTransientError(error) {
  if (!error) return false;
  const status = error.status || error.statusCode;
  if (status) {
    if (status >= 500) return true;
    if (status === 429) return true;
    if (status >= 400 && status < 500) return false;
  }
  const code = error.code || error.name;
  if (
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ENOTFOUND' ||
    code === 'APIConnectionError' ||
    code === 'APITimeoutError' ||
    code === 'RateLimitError' ||
    code === 'InternalServerError' ||
    error.message?.includes('timeout') ||
    error.message?.includes('connection')
  ) {
    return true;
  }
  return false;
}

/**
 * Helper for sleep/delay in backoff.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Claude via Anthropic Messages API with transient error retry logic.
 *
 * @param {Object} options
 * @param {string} options.prompt - The user message prompt
 * @param {string} options.systemPrompt - System prompt instructions
 * @param {string} options.feature - 'triage' | 'summarizer' | 'tag'
 * @param {string} [options.model] - Optional model override
 * @param {number} [options.maxTokens=1000] - Max output tokens
 * @returns {Promise<{ text: string, latencyMs: number }>}
 */
async function callClaude({ prompt, systemPrompt, feature, model, maxTokens = 1000 }) {
  const client = getClient();
  const targetModel = model || getModelForFeature(feature);
  const startTime = Date.now();

  const maxTransientRetries = 1;
  let attempt = 0;
  let backoffMs = 500;

  while (attempt <= maxTransientRetries) {
    try {
      attempt++;
      const response = await client.messages.create({
        model: targetModel,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      });

      const latencyMs = Date.now() - startTime;
      const text = response.content?.[0]?.text || '';
      return { text, latencyMs, modelUsed: targetModel };
    } catch (err) {
      const transient = isTransientError(err);
      if (transient && attempt <= maxTransientRetries) {
        console.warn(`[AI Client] Transient error on attempt ${attempt} (${err.message}). Retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
        backoffMs *= 2;
        continue;
      }
      // Non-transient error or retries exhausted
      err.isTransient = transient;
      throw err;
    }
  }
}

module.exports = {
  getClient,
  setClient,
  resetClient,
  getModelForFeature,
  isTransientError,
  callClaude
};
