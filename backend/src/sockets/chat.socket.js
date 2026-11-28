const User = require('../models/User');
const { verifyToken } = require('../middlewares/auth');
const { HumanPartner, ChatError } = require('../services/chatPartner.interface');

const humanPartner = new HumanPartner();

const userRoom = (userId) => `user_${userId}`;

function registerChatSocket(io) {
  // Xác thực JWT khi handshake: client gửi io(url, { auth: { token } }).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) {
        return next(new Error('Bạn cần đăng nhập để tiếp tục.'));
      }
      const payload = verifyToken(token);
      const exists = await User.exists({ _id: payload.id });
      if (!exists) {
        return next(new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'));
      }
      socket.userId = String(payload.id);
      return next();
    } catch (err) {
      return next(new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.userId));

    socket.on('send_message', async (payload) => {
      try {
        const body = payload && typeof payload === 'object' ? payload : {};
        const saved = await humanPartner.sendMessage(socket.userId, body.receiverId, body);
        io.to(userRoom(saved.senderId)).to(userRoom(saved.receiverId)).emit('receive_message', saved);
      } catch (err) {
        if (err instanceof ChatError) {
          socket.emit('message_error', { message: err.message, code: err.code });
          return;
        }
        console.error('[socket] send_message lỗi:', err);
        socket.emit('message_error', {
          message: 'Không thể gửi tin nhắn. Vui lòng thử lại sau.',
          code: 'INTERNAL_ERROR',
        });
      }
    });
  });
}

module.exports = { registerChatSocket, userRoom };
