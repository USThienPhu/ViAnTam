import { useEffect, useRef, useState } from 'react';
import { getMessages, getUsers } from '../api/chatApi';
import getErrorMessage from '../api/getErrorMessage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useChatSocket from '../hooks/useChatSocket';
import ChatEmptyIllustration from '../components/ChatEmptyIllustration';
import ChatWindow from '../components/ChatWindow';
import UserSidebar from '../components/UserSidebar';
import { getPeerId, mergeMessages } from '../utils/chatFormat';

// Trang chat 1-1: Sidebar danh sách người dùng (trái) + khung chat (phải).
// Socket chỉ kết nối khi trang này đang mở (useChatSocket), các trang khác không cần realtime.
export default function ChatPage() {
  const { user: me } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [usersReload, setUsersReload] = useState(0);

  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyReload, setHistoryReload] = useState(0);

  const [unreadIds, setUnreadIds] = useState(() => new Set());

  // Callback của socket luôn đọc đúng cuộc trò chuyện đang mở mà không phải đăng ký lại listener.
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const { status, sendMessage } = useChatSocket({
    onMessage: (message) => {
      const peerId = getPeerId(message, me.id);
      if (peerId === selectedIdRef.current) {
        setMessages((prev) => mergeMessages(prev, [message]));
      } else if (String(message.senderId) !== String(me.id)) {
        // Tin mới từ người khác khi đang mở cuộc trò chuyện khác: đánh dấu chấm "tin mới" ở Sidebar.
        setUnreadIds((prev) => new Set(prev).add(peerId));
      }
    },
    onError: (error) => {
      showToast(error?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.');
      // Đối phương vừa chặn mình khi đang chat: khóa ô nhập ngay thay vì chờ tải lại danh sách.
      if (error?.code === 'CONVERSATION_BLOCKED') {
        const peerId = selectedIdRef.current;
        setUsers((prev) =>
          prev.map((user) => (user.id === peerId && !user.isBlockedByMe ? { ...user, hasBlockedMe: true } : user))
        );
      }
    },
  });

  useEffect(() => {
    let cancelled = false;
    setUsersLoading(true);
    setUsersError('');
    getUsers()
      .then((data) => {
        if (!cancelled) setUsers(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!cancelled) setUsersError(getErrorMessage(error, 'Không thể tải danh sách người dùng.'));
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [usersReload]);

  // Tải lịch sử mỗi khi đổi cuộc trò chuyện. Kết quả của cuộc trò chuyện cũ (về muộn) bị bỏ qua.
  // Tin realtime đến trong lúc đang tải được gộp với lịch sử, không bị ghi đè hay trùng.
  useEffect(() => {
    setMessages([]);
    setHistoryError('');
    if (!selectedId) {
      setHistoryLoading(false);
      return undefined;
    }

    let cancelled = false;
    setHistoryLoading(true);
    getMessages(selectedId)
      .then((data) => {
        if (!cancelled) setMessages((prev) => mergeMessages(prev, Array.isArray(data) ? data : []));
      })
      .catch((error) => {
        if (!cancelled) setHistoryError(getErrorMessage(error, 'Không thể tải tin nhắn. Vui lòng thử lại.'));
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, historyReload]);

  const selectedUser = users.find((user) => user.id === selectedId) ?? null;

  function handleSelect(id) {
    setSelectedId(id);
    setUnreadIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function handleBlockChange(blocked) {
    setUsers((prev) => prev.map((user) => (user.id === selectedId ? { ...user, isBlockedByMe: blocked } : user)));
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 bg-white supports-[height:100dvh]:h-[calc(100dvh-3.5rem)]">
      <aside
        aria-label="Danh sách người dùng"
        className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-slate-200 md:w-80 md:shrink-0`}
      >
        <UserSidebar
          users={users}
          loading={usersLoading}
          error={usersError}
          onRetry={() => setUsersReload((n) => n + 1)}
          selectedId={selectedId}
          unreadIds={unreadIds}
          onSelect={handleSelect}
        />
      </aside>

      <div className={`${selectedUser ? 'flex' : 'hidden md:flex'} min-w-0 flex-1`}>
        {selectedUser ? (
          <ChatWindow
            key={selectedUser.id}
            selectedUser={selectedUser}
            currentUserId={me.id}
            messages={messages}
            loading={historyLoading}
            loadError={historyError}
            onRetry={() => setHistoryReload((n) => n + 1)}
            connectionStatus={status}
            sendMessage={sendMessage}
            onBlockChange={handleBlockChange}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 text-center">
            <ChatEmptyIllustration className="h-36 w-auto max-w-full" />
            <h1 className="mt-4 text-base font-semibold text-slate-900">
              Chọn một cuộc trò chuyện để bắt đầu
            </h1>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-600">
              Chọn một người dùng ở danh sách bên trái để nhắn tin. Bạn có thể kiểm tra lừa đảo ngay trong cuộc trò chuyện.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
