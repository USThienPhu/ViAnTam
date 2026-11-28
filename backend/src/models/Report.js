const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: ['impersonation', 'investment_scam', 'job_scam', 'phishing', 'other'],
      required: true,
    },
    description: { type: String, maxlength: 500, default: '' },
    evidenceMessageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
  },
  { timestamps: true }
);

reportSchema.index({ reporterId: 1, reportedUserId: 1 }, { unique: true });
reportSchema.index({ reportedUserId: 1, createdAt: -1 });

module.exports = mongoose.models.Report || mongoose.model('Report', reportSchema);
