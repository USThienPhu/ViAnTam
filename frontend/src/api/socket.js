import { io } from 'socket.io-client';

// Kết nối Socket.IO dùng chung (singleton) cho cả ứng dụng. Chỉ ChatPage mới gọi connectSocket
// (qua hook useChatSocket); các trang khác và chế độ chat với bot mô phỏng không cần socket.

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Thông báo lỗi handshake do backend trả về (backend/src/sockets/chat.socket.js) khi JWT không dùng được.
// Nếu backend đổi các câu này thì phải đổi ở đây.
const AUTH_ERROR_MESSAGES = [
  'Bạn cần đăng nhập để tiếp tục.',
  'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
];

let socket = null;
let currentToken = null;

export function isAuthSocketError(error) {
  return AUTH_ERROR_MESSAGES.includes(error?.message);
}

export function getSocket() {
  return socket;
}

// Trả về kết nối đang dùng nếu cùng token. Khác token (đổi tài khoản) thì đóng kết nối cũ rồi tạo mới,
// để không bao giờ gửi tin nhắn dưới danh nghĩa tài khoản trước.
export function connectSocket(token) {
  if (typeof token !== 'string' || !token) {
    throw new Error('Cần token đăng nhập để kết nối chat.');
  }

  if (socket && currentToken === token) {
    if (!socket.connected && !socket.active) socket.connect();
    return socket;
  }

  disconnectSocket();
  currentToken = token;
  socket = io(SOCKET_URL, {
    // Dạng hàm: mỗi lần tự kết nối lại vẫn gửi đúng token của kết nối này.
    auth: (cb) => cb({ token }),
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = null;
  currentToken = null;
}
