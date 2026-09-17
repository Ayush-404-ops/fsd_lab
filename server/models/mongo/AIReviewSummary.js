const mongoose = require('mongoose');

const aiReviewSummarySchema = new mongoose.Schema(
  {
    gameId: { type: Number, required: true, unique: true, index: true },
    promptVersion: { type: String, required: true },
    pros: [{ type: String }],
    cons: [{ type: String }],
    overallSentiment: {
      type: String,
      enum: ['mostly_positive', 'mixed', 'mostly_negative'],
      required: true
    },
    reviewCountConsidered: { type: Number, required: true },
    generatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    collection: 'ai_review_summaries'
  }
);

module.exports = mongoose.model('AIReviewSummary', aiReviewSummarySchema);
