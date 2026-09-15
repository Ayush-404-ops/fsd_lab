const mongoose = require('mongoose');

const aiTriageCacheSchema = new mongoose.Schema(
  {
    submissionId: { type: Number, required: true, unique: true, index: true },
    contentHash: { type: String, required: true },
    promptVersion: { type: String, required: true },
    summary: { type: String, required: true },
    riskFlags: [{ type: String }],
    missingInfo: [{ type: String }],
    suggestedAction: {
      type: String,
      enum: ['proceed_normally', 'needs_admin_attention'],
      default: 'proceed_normally'
    }
  },
  {
    timestamps: true,
    collection: 'ai_triage_cache'
  }
);

module.exports = mongoose.model('AITriageCache', aiTriageCacheSchema);
