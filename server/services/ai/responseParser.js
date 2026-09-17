/**
 * IndieVault AI Response Parser
 * Sanitizes JSON strings from raw LLM output, validates schemas per feature,
 * and handles malformed-JSON retry logic per Architecture §4 & Prompt Spec.
 */

class MalformedResponseError extends Error {
  constructor(message, rawText, validationErrors = []) {
    super(message);
    this.name = 'MalformedResponseError';
    this.rawText = rawText;
    this.validationErrors = validationErrors;
  }
}

/**
 * Extracts and cleans JSON string from raw text output.
 * Handles markdown fences like ```json ... ``` or extraneous preamble text.
 * @param {string} rawText 
 * @returns {string}
 */
function sanitizeJsonResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new MalformedResponseError('Raw response is empty or non-string', rawText);
  }

  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // Locate first '{' and last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new MalformedResponseError('No valid JSON object boundaries found in output', rawText);
  }

  return cleaned.substring(firstBrace, lastBrace + 1);
}

/**
 * Parses JSON and validates against schema for the specified feature.
 * @param {string} feature - 'triage' | 'summarizer' | 'tag'
 * @param {string} rawText 
 * @returns {Object} Parsed and validated object
 */
function parseAndValidate(feature, rawText) {
  const jsonString = sanitizeJsonResponse(rawText);
  let parsed;

  try {
    parsed = JSON.parse(jsonString);
  } catch (parseErr) {
    throw new MalformedResponseError(`Failed to parse JSON: ${parseErr.message}`, rawText);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new MalformedResponseError('Response JSON root is not an object', rawText);
  }

  const errors = [];

  switch (feature) {
    case 'triage': {
      if (typeof parsed.summary !== 'string') {
        errors.push('Field "summary" must be a string');
      }
      if (!Array.isArray(parsed.risk_flags)) {
        errors.push('Field "risk_flags" must be an array of strings');
      }
      if (!Array.isArray(parsed.missing_info)) {
        errors.push('Field "missing_info" must be an array of strings');
      }
      const validActions = ['proceed_normally', 'needs_admin_attention'];
      if (!validActions.includes(parsed.suggested_action)) {
        errors.push(`Field "suggested_action" must be one of: ${validActions.join(', ')}`);
      }
      break;
    }
    case 'summarizer': {
      if (!Array.isArray(parsed.pros)) {
        errors.push('Field "pros" must be an array of strings');
      }
      if (!Array.isArray(parsed.cons)) {
        errors.push('Field "cons" must be an array of strings');
      }
      const validSentiments = ['mostly_positive', 'mixed', 'mostly_negative'];
      if (!validSentiments.includes(parsed.overall_sentiment)) {
        errors.push(`Field "overall_sentiment" must be one of: ${validSentiments.join(', ')}`);
      }
      if (typeof parsed.review_count_considered !== 'number' || isNaN(parsed.review_count_considered)) {
        errors.push('Field "review_count_considered" must be a valid integer number');
      }
      // Enforce array length caps per Prompt Spec
      if (Array.isArray(parsed.pros) && parsed.pros.length > 5) {
        parsed.pros = parsed.pros.slice(0, 5);
      }
      if (Array.isArray(parsed.cons) && parsed.cons.length > 5) {
        parsed.cons = parsed.cons.slice(0, 5);
      }
      break;
    }
    case 'tag': {
      if (!Array.isArray(parsed.suggested_tags)) {
        errors.push('Field "suggested_tags" must be an array of strings');
      }
      if (typeof parsed.reasoning !== 'string') {
        errors.push('Field "reasoning" must be a string');
      }
      break;
    }
    default:
      errors.push(`Unknown feature type: ${feature}`);
  }

  if (errors.length > 0) {
    throw new MalformedResponseError(`Schema validation failed: ${errors.join('; ')}`, rawText, errors);
  }

  return parsed;
}

/**
 * Executes callClaude with automatic single-retry logic on malformed JSON output.
 * Per Architecture §4: Retries once with a stricter JSON enforcement prompt if output fails validation.
 *
 * @param {Object} params
 * @param {Function} params.callClaudeFn - Function that calls Claude client
 * @param {string} params.feature - 'triage' | 'summarizer' | 'tag'
 * @param {string} params.prompt - User message prompt
 * @param {string} params.systemPrompt - System prompt
 * @param {number} [params.maxTokens]
 * @returns {Promise<{ parsedData: Object, latencyMs: number, retried: boolean }>}
 */
async function executeWithRetry({ callClaudeFn, feature, prompt, systemPrompt, maxTokens }) {
  let totalLatencyMs = 0;

  // First Attempt
  const firstRes = await callClaudeFn({ prompt, systemPrompt, feature, maxTokens });
  totalLatencyMs += firstRes.latencyMs || 0;

  try {
    const parsedData = parseAndValidate(feature, firstRes.text);
    return {
      parsedData,
      latencyMs: totalLatencyMs,
      modelUsed: firstRes.modelUsed,
      retried: false
    };
  } catch (firstErr) {
    if (!(firstErr instanceof MalformedResponseError)) {
      throw firstErr;
    }

    console.warn(`[AI ResponseParser] First attempt for feature "${feature}" produced malformed response (${firstErr.message}). Retrying once with stricter JSON reminder...`);

    // Stricter System Prompt for Retry
    const stricterSystemPrompt = `${systemPrompt}\n\nCRITICAL REMINDER: Your previous response failed schema validation. Return ONLY a raw, valid JSON object matching the requested schema. Do NOT wrap response in markdown (\`\`\`json) and do NOT output preamble or conversational text.`;

    const secondRes = await callClaudeFn({ prompt, systemPrompt: stricterSystemPrompt, feature, maxTokens });
    totalLatencyMs += secondRes.latencyMs || 0;

    try {
      const parsedData = parseAndValidate(feature, secondRes.text);
      return {
        parsedData,
        latencyMs: totalLatencyMs,
        modelUsed: secondRes.modelUsed,
        retried: true
      };
    } catch (secondErr) {
      console.error(`[AI ResponseParser] Retry also produced malformed response for feature "${feature}". Triggering fallback.`);
      throw secondErr;
    }
  }
}

module.exports = {
  MalformedResponseError,
  sanitizeJsonResponse,
  parseAndValidate,
  executeWithRetry
};
