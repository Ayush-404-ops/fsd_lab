/**
 * IndieVault AI Fallback Logic
 * Implements demoable resilience per AI Architecture §5.
 * Provides deterministic, structured fallbacks when AI services are unavailable or failing.
 */

const { MICRO_TAGS } = require('../../config/microTags');

/**
 * Fallback response for Submission Triage Assistant.
 * @param {Object} submission 
 * @returns {Object}
 */
function getTriageFallback(submission = {}) {
  return {
    isFallback: true,
    summary: 'AI triage unavailable — manual review required.',
    risk_flags: [],
    missing_info: [],
    suggested_action: 'needs_admin_attention'
  };
}

/**
 * Fallback response for Review Summarizer.
 * Calculates basic rating metrics from raw reviews if available.
 * @param {number} gameId 
 * @param {Array} [reviews=[]] 
 * @returns {Object}
 */
function getReviewSummaryFallback(gameId, reviews = []) {
  let overallSentiment = 'mixed';

  if (Array.isArray(reviews) && reviews.length > 0) {
    const validRatings = reviews
      .map((r) => Number(r.rating || r.score))
      .filter((val) => !isNaN(val));

    if (validRatings.length > 0) {
      const avgRating = validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length;
      if (avgRating >= 4.0) {
        overallSentiment = 'mostly_positive';
      } else if (avgRating <= 2.5) {
        overallSentiment = 'mostly_negative';
      } else {
        overallSentiment = 'mixed';
      }
    }
  }

  return {
    isFallback: true,
    pros: [],
    cons: [],
    overall_sentiment: overallSentiment,
    review_count_considered: Array.isArray(reviews) ? reviews.length : 0
  };
}

/**
 * Fallback response for Smart Tag Suggestion.
 * Selects static micro-tags from microTags config based on genre/category.
 * @param {string} [category] 
 * @returns {Object}
 */
function getTagSuggestionFallback(category = '') {
  let categoryKey = null;
  const categoryLower = category.toLowerCase();

  if (categoryLower.includes('gameplay') || categoryLower.includes('action') || categoryLower.includes('rpg') || categoryLower.includes('strategy')) {
    categoryKey = 'Gameplay Style';
  } else if (categoryLower.includes('art') || categoryLower.includes('mood') || categoryLower.includes('pixel')) {
    categoryKey = 'Mood & Aesthetic';
  } else if (categoryLower.includes('mechanic') || categoryLower.includes('puzzle') || categoryLower.includes('building')) {
    categoryKey = 'Mechanics & Features';
  } else if (categoryLower.includes('theme') || categoryLower.includes('sci-fi') || categoryLower.includes('horror') || categoryLower.includes('fantasy')) {
    categoryKey = 'Theme & Setting';
  }

  let suggestedTags = [];
  if (categoryKey && MICRO_TAGS[categoryKey]) {
    suggestedTags = MICRO_TAGS[categoryKey].slice(0, 5);
  } else {
    // Default fallback set across popular micro-tags
    suggestedTags = [
      'pixel art',
      'short sessions (< 30 min)',
      'procedural generation',
      'wholesome',
      'controller support'
    ];
  }

  return {
    isFallback: true,
    suggested_tags: suggestedTags,
    reasoning: 'Static default micro-tags provided due to AI service fallback.'
  };
}

module.exports = {
  getTriageFallback,
  getReviewSummaryFallback,
  getTagSuggestionFallback
};
