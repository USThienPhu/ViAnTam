import { useCallback, useEffect, useRef, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket, isAuthSocketError } from '../api/socket';
import { useAuth } from '../context/AuthContext';

/**
 * Kết nối Socket.IO trong suốt thời gian component dùng hook này còn hiển thị (dùng ở ChatPage).
 * Rời trang thì tự ngắt kết nối. Token bị server từ chối thì tự đăng xuất.
 *
 * Tham số: { onMessage(message), onError({ message, code }) }
 *   - onMessage: server phát 'receive_message' (cả tin mình gửi lẫn tin nhận được, đã lưu DB).
 *   - onError: server phát 'message_error' (bị chặn, nội dung sai...). message là tiếng Việt, hiển thị được.
 * Trả về: { status: 'connecting' | 'connected' | 'disconnected', sendMessage(payload) }
 *   - sendMessage({ receiverId, type, content, imageUrl, qrData }) trả true nếu đã gửi đi,
 *     false nếu socket chưa kết nối (khi đó UI nên báo "Mất kết nối").
 */
export default function useChatSocket({ onMessage, onError } = {}) {
  const { token, logout } = useAuth();
  const [status, setStatus] = useState('connecting');

  // Giữ callback mới nhất mà không phải kết nối lại mỗi lần component render.
  const handlers = useRef({ onMessage, onError });
  handlers.current = { onMessage, onError };

  useEffect(() => {
    if (!token) {
      setStatus('disconnected');
      return undefined;
    }

    const socket = connectSocket(token);
    setStatus(socket.connected ? 'connected' : 'connecting');

    const handleConnect = () => setStatus('connected');
    const handleDisconnect = () => setStatus('disconnected');
    const handleConnectError = (error) => {
      if (isAuthSocketError(error)) {
        // Token hết hạn hoặc tài khoản đã bị xóa: giống xử lý 401 của axios.
        logout();
        return;
      }
      setStatus('connecting'); // lỗi mạng: socket.io tự thử kết nối lại
    };
    const handleMessage = (message) => handlers.current.onMessage?.(message);
    const handleMessageError = (error) => handlers.current.onError?.(error);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('receive_message', handleMessage);
    socket.on('message_error', handleMessageError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('receive_message', handleMessage);
      socket.off('message_error', handleMessageError);
      disconnectSocket();
    };
  }, [token, logout]);

  const sendMessage = useCallback((payload) => {
    const socket = getSocket();
    if (!socket || !socket.connected) return false;
    socket.emit('send_message', payload);
    return true;
  }, []);

  return { status, sendMessage };
}
