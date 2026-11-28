const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true }, // [senderId, receiverId].sort().join('_')
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image'], default: 'text' },
    content: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    extractedLinks: [{ type: String }],
    qrData: {
      raw: String,
      isVietQR: { type: Boolean, default: false },
      bankBin: String,
      bankName: String,
      accountNumber: String,
      amount: Number,
      purpose: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
