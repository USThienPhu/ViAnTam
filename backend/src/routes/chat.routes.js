const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');

const Message = require('../models/Message');
const { authMiddleware } = require('../middlewares/auth');
const { uploadImage } = require('../middlewares/upload');
const qrParserService = require('../services/qrParser.service');
const { makeConversationId } = require('../utils/conversation');

// chat.routes được mount tại /api/messages: GET /:targetUserId, POST /upload

const router = express.Router();

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
const HISTORY_LIMIT = 100;

router.post('/upload', authMiddleware, ...uploadImage, async (req, res, next) => {
  try {
    // Tên file do server tự sinh, không dùng tên client gửi lên (tránh path traversal / ghi đè).
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${req.file.detectedExt}`;
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, fileName), req.file.buffer);

    const { qrData, extractedLinks } = await qrParserService.parseImageBuffer(req.file.buffer);
    return res.status(200).json({ imageUrl: `/uploads/${fileName}`, qrData, extractedLinks });
  } catch (err) {
    return next(err);
  }
});

router.get('/:targetUserId', authMiddleware, async (req, res, next) => {
  try {
    const { targetUserId } = req.params;
    if (!/^[a-f\d]{24}$/i.test(targetUserId) || !mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ message: 'Người dùng không hợp lệ.', code: 'INVALID_USER_ID' });
    }

    const conversationId = makeConversationId(req.user.id, targetUserId);
    const latest = await Message.find({ conversationId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(HISTORY_LIMIT)
      .lean();

    return res.status(200).json(latest.reverse());
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
