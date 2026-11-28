const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['bank_account', 'link', 'user'], required: true },
    value: { type: String, required: true, index: true },
    bankBin: { type: String, default: '' },
    reportCount: { type: Number, default: 1 },
    status: { type: String, enum: ['pending', 'confirmed', 'dismissed'], default: 'pending' },
    reasonSummary: { type: String, default: '' },
  },
  { timestamps: true, collection: 'blacklist' }
);

blacklistSchema.index({ type: 1, value: 1 }, { unique: true });

module.exports = mongoose.models.Blacklist || mongoose.model('Blacklist', blacklistSchema);
