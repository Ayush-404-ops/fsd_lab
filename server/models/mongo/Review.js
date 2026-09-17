const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    gameId: { type: Number, required: true, index: true },
    userId: { type: Number, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, required: true, trim: true },
    isRecommended: { type: Boolean, default: true },
    helpfulnessVotes: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    collection: 'reviews'
  }
);

reviewSchema.index({ gameId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
