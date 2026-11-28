const mongoose = require('mongoose');

const User = require('../models/User');
const Block = require('../models/Block');
const Message = require('../models/Message');
const { makeConversationId } = require('../utils/conversation');

const MAX_CONTENT_LENGTH = 2000;
const MAX_FIELD_LENGTH = 200;
const LINK_PATTERN = /https?:\/\/[^\s]+/gi;
const IMAGE_URL_PATTERN = /^\/uploads\/[A-Za-z0-9._-]+$/;

// Lỗi nghiệp vụ có thể hiển thị cho người dùng (socket emit message_error).
class ChatError extends Error {
  constructor(message, code = 'CHAT_ERROR') {
    super(message);
    this.name = 'ChatError';
    this.code = code;
  }
}

// Interface cho Practice Mode (docs/chat-spec.md mục 5).
class ChatPartner {
  // eslint-disable-next-line no-unused-vars
  async sendMessage(senderId, receiverId, payload) {
    throw new Error('Not implemented');
  }
}

function isObjectId(value) {
  return typeof value === 'string' && mongoose.isValidObjectId(value) && /^[a-f\d]{24}$/i.test(value);
}

function optionalString(value, max = MAX_FIELD_LENGTH) {
  return typeof value === 'string' ? value.slice(0, max) : undefined;
}

// Chỉ giữ các trường đã biết với đúng kiểu; bỏ mọi trường lạ do client gửi lên.
function sanitizeQrData(qrData) {
  if (!qrData || typeof qrData !== 'object' || Array.isArray(qrData)) return undefined;
  const clean = {
    raw: optionalString(qrData.raw, 1000),
    isVietQR: qrData.isVietQR === true,
    bankBin: optionalString(qrData.bankBin, 20),
    bankName: optionalString(qrData.bankName),
    accountNumber: optionalString(qrData.accountNumber, 50),
    amount: Number.isFinite(qrData.amount) && qrData.amount >= 0 ? qrData.amount : undefined,
    purpose: optionalString(qrData.purpose),
  };
  return Object.fromEntries(Object.entries(clean).filter(([, v]) => v !== undefined));
}

function extractLinks(content, qrData) {
  const links = new Set(content.match(LINK_PATTERN) || []);
  if (qrData?.raw && /^https?:\/\//i.test(qrData.raw)) links.add(qrData.raw);
  return [...links];
}

// Gửi tin giữa hai người dùng thật: kiểm tra, lưu MongoDB, trả về tin đã lưu.
// Việc phát realtime do chat.socket.js đảm nhiệm.
class HumanPartner extends ChatPartner {
  async sendMessage(senderId, receiverId, payload) {
    const body = payload && typeof payload === 'object' ? payload : {};
    const sender = String(senderId);

    if (!isObjectId(receiverId)) {
      throw new ChatError('Người nhận không hợp lệ.', 'INVALID_RECEIVER');
    }
    if (receiverId === sender) {
      throw new ChatError('Bạn không thể nhắn tin cho chính mình.', 'INVALID_RECEIVER');
    }

    const type = body.type === 'image' ? 'image' : 'text';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (content.length > MAX_CONTENT_LENGTH) {
      throw new ChatError(`Tin nhắn không được dài quá ${MAX_CONTENT_LENGTH} ký tự.`, 'CONTENT_TOO_LONG');
    }

    let imageUrl = '';
    if (type === 'image') {
      if (typeof body.imageUrl !== 'string' || !IMAGE_URL_PATTERN.test(body.imageUrl)) {
        throw new ChatError('Đường dẫn ảnh không hợp lệ.', 'INVALID_IMAGE');
      }
      imageUrl = body.imageUrl;
    } else if (!content) {
      throw new ChatError('Tin nhắn không được để trống.', 'EMPTY_MESSAGE');
    }

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      throw new ChatError('Không tìm thấy người nhận.', 'RECEIVER_NOT_FOUND');
    }

    const blocked = await Block.exists({
      $or: [
        { blockerId: sender, blockedId: receiverId },
        { blockerId: receiverId, blockedId: sender },
      ],
    });
    if (blocked) {
      throw new ChatError('Không thể gửi tin nhắn vì cuộc trò chuyện đã bị chặn.', 'CONVERSATION_BLOCKED');
    }

    const qrData = type === 'image' ? sanitizeQrData(body.qrData) : undefined;
    const saved = await Message.create({
      conversationId: makeConversationId(sender, receiverId),
      senderId: sender,
      receiverId,
      type,
      content,
      imageUrl,
      extractedLinks: extractLinks(content, qrData),
      ...(qrData ? { qrData } : {}),
    });
    return saved.toJSON();
  }
}

// SimulatorBotPartner (P2): gọi SimulatorService.reply(...) khi receiver.isSimulatorBot === true.

module.exports = { ChatPartner, HumanPartner, ChatError, MAX_CONTENT_LENGTH };
