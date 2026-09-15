const mongoose = require('mongoose');

const aiCallLogSchema = new mongoose.Schema(
  {
    feature: { type: String, required: true, index: true },
    promptVersion: { type: String, required: true },
    latencyMs: { type: Number, required: true },
    success: { type: Boolean, required: true },
    errorType: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  {
    collection: 'ai_call_logs'
  }
);

module.exports = mongoose.model('AICallLog', aiCallLogSchema);
