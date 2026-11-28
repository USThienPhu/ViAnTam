const mongoose = require('mongoose');

const scamCheckSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: String, required: true, index: true },
    initialScore: { type: Number, required: true, min: 0, max: 100 },
    finalScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
    scamType: { type: String, default: 'Chưa xác định' },
    suspiciousSigns: [{ quote: String, explanation: String }],
    advice: [{ type: String }],
    clarificationQuestions: [
      {
        questionCode: String,
        questionText: String,
        answer: { type: String, enum: ['yes', 'no', 'unsure', null], default: null },
        scoreDelta: { type: Number, default: 0 },
      },
    ],
    scoreChangeReason: { type: String, default: '' },
    analysisSource: { type: String, enum: ['llm', 'heuristic'], default: 'llm' },
    userFeedback: { type: String, enum: ['accurate', 'inaccurate', null], default: null },
  },
  { timestamps: true, collection: 'scam_checks' }
);

scamCheckSchema.index({ requesterId: 1, createdAt: -1 });

module.exports = mongoose.models.ScamCheck || mongoose.model('ScamCheck', scamCheckSchema);
