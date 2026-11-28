import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ImagePlus, LoaderCircle, SendHorizontal } from 'lucide-react';
import { uploadImage } from '../api/chatApi';
import getErrorMessage from '../api/getErrorMessage';
import { useToast } from '../context/ToastContext';
import { getInitial } from '../utils/chatFormat';
import FlaggedBanner from './FlaggedBanner';
import ChatSafetyActions from './ChatSafetyActions';
import MessageBubble from './MessageBubble';

const MAX_CONTENT_LENGTH = 2000; // khớp giới hạn của backend (chatPartner.interface.js)
const COUNTER_THRESHOLD = 1800;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // khớp giới hạn của backend (middlewares/upload.js)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const STICK_TO_BOTTOM_PX = 80; // cách đáy không quá 80px thì coi là đang đọc tin mới nhất
const NOT_CONNECTED_MESSAGE = 'Chưa kết nối tới máy chủ. Vui lòng thử lại sau ít giây.';
const UPLOADING_MESSAGE = 'Đang tải ảnh lên & giải mã QR...';

const STATUS_LABELS = {
  connected: { text: 'Đã kết nối', dot: 'bg-risk-low-accent' },
  connecting: { text: 'Đang kết nối...', dot: 'bg-risk-medium-accent' },
  disconnected: { text: 'Mất kết nối', dot: 'bg-risk-high-accent' },
};

/**
 * Khung chat 1-1 với một người dùng.
 *
 * Props:
 *  - selectedUser: { id, username, isFlagged, reportCount, isBlockedByMe, hasBlockedMe }
 *  - currentUserId: id của mình, để biết tin nào là của mình
 *  - messages, loading, loadError, onRetry: lịch sử cuộc trò chuyện (do ChatPage tải)
 *  - connectionStatus: 'connecting' | 'connected' | 'disconnected' (từ useChatSocket)
 *  - sendMessage(payload): trả true nếu đã gửi qua socket, false nếu chưa kết nối
 *  - onBlockChange(nextBlocked): chuyển tiếp từ ChatSafetyActions để ChatPage cập nhật trạng thái chặn
 *  - onBack: quay lại danh sách người dùng (nút chỉ hiện trên màn hình nhỏ)
 * Lỗi thoáng qua (upload sai định dạng, chưa kết nối...) hiện qua toast dùng chung (ToastContext).
 */
export default function ChatWindow({
  selectedUser,
  currentUserId,
  messages = [],
  loading = false,
  loadError = '',
  onRetry,
  connectionStatus = 'connecting',
  sendMessage,
  onBlockChange,
  onBack,
}) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  // true khi người dùng đang ở gần đáy danh sách: lúc đó tin mới mới tự kéo khung xuống.
  const stickToBottomRef = useRef(true);
  const prevLastIdRef = useRef(null);
  const prevLengthRef = useRef(0);
  // Vị trí cuộn do chính code đặt. Sự kiện scroll đến muộn có thể thấy đáy đã xa hơn vì ảnh vừa nở ra,
  // nên các sự kiện có đúng vị trí này bị bỏ qua để không hiểu nhầm là người dùng cuộn lên.
  const programmaticTopRef = useRef(null);

  // ChatSafetyActions (của TV3) tự đặt lại modal và toast mỗi khi targetUser.isBlockedByMe đổi.
  // Nếu truyền thẳng selectedUser đã cập nhật, toast "Đã chặn" và ReportModal vừa mở sẽ bị đóng ngay.
  // Nên chỉ truyền một bản chụp theo id người dùng; FlaggedBanner và khóa ô nhập vẫn dùng dữ liệu mới nhất.
  const safetyTarget = useMemo(() => selectedUser, [selectedUser.id]);

  const isBlocked = Boolean(selectedUser.isBlockedByMe || selectedUser.hasBlockedMe);
  const isConnected = connectionStatus === 'connected';
  const status = STATUS_LABELS[connectionStatus] || STATUS_LABELS.connecting;
  const trimmed = draft.trim();
  const canSend = isConnected && !isBlocked && !uploading && trimmed.length > 0;
  const canAttach = isConnected && !isBlocked && !uploading;

  const lastMessage = messages[messages.length - 1];
  const lastId = lastMessage ? String(lastMessage._id) : null;

  const scrollToBottom = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
    programmaticTopRef.current = list.scrollTop;
    stickToBottomRef.current = true;
    setHasNewBelow(false);
  }, []);

  // Tự cuộn xuống khi có tin mới ở cuối, nhưng không giật người đang đọc tin cũ:
  // tin của chính mình luôn kéo xuống; tin của người kia chỉ kéo xuống khi đang ở gần đáy,
  // ngược lại hiện nút "Tin nhắn mới". Lịch sử mới tải xong (đang ở đáy) cũng được kéo xuống.
  useEffect(() => {
    const prevLastId = prevLastIdRef.current;
    const prevLength = prevLengthRef.current;
    prevLastIdRef.current = lastId;
    prevLengthRef.current = messages.length;
    if (lastId === prevLastId && messages.length === prevLength) return;

    const lastChanged = lastId !== prevLastId;
    const lastIsMine = lastMessage && String(lastMessage.senderId) === String(currentUserId);
    if ((lastChanged && lastIsMine) || stickToBottomRef.current) {
      scrollToBottom();
    } else if (lastChanged && prevLastId !== null) {
      setHasNewBelow(true);
    }
  }, [messages, lastId, lastMessage, currentUserId, scrollToBottom]);

  function handleScroll() {
    const list = listRef.current;
    if (!list) return;
    if (programmaticTopRef.current !== null && list.scrollTop === programmaticTopRef.current) {
      programmaticTopRef.current = null;
      return;
    }
    programmaticTopRef.current = null;
    const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
    const atBottom = distanceFromBottom <= STICK_TO_BOTTOM_PX;
    stickToBottomRef.current = atBottom;
    if (atBottom) setHasNewBelow(false);
  }

  // Ảnh tải xong làm bong bóng cao lên mà không phát sự kiện cuộn; nếu đang ở đáy thì cuộn lại.
  function handleMediaSettled() {
    if (stickToBottomRef.current) scrollToBottom();
  }

  function notifyError(message) {
    showToast(message, { type: 'error' });
  }

  function handleSend() {
    if (!canSend) return;
    const sent = sendMessage?.({ receiverId: selectedUser.id, type: 'text', content: trimmed });
    if (!sent) {
      notifyError(NOT_CONNECTED_MESSAGE);
      return;
    }
    setDraft('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    handleSend();
  }

  function handleKeyDown(event) {
    // Enter gửi, Shift+Enter xuống dòng. Bỏ qua Enter dùng để chốt chữ khi đang gõ Telex/VNI (IME).
    if (event.key !== 'Enter' || event.shiftKey) return;
    if (event.nativeEvent?.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    handleSend();
  }

  async function handleFileChange(event) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = ''; // cho phép chọn lại đúng file đó lần sau
    if (!file || !canAttach) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      notifyError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      notifyError('Ảnh quá lớn. Dung lượng tối đa là 5MB.');
      return;
    }

    setUploading(true);
    try {
      const { imageUrl, qrData } = await uploadImage(file);
      const sent = sendMessage?.({ receiverId: selectedUser.id, type: 'image', imageUrl, qrData });
      if (!sent) notifyError(NOT_CONNECTED_MESSAGE);
    } catch (error) {
      notifyError(getErrorMessage(error, 'Không thể tải ảnh lên. Vui lòng thử lại.'));
    } finally {
      setUploading(false);
    }
  }

  function renderMessages() {
    if (loading && messages.length === 0) {
      return (
        <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-slate-600">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          Đang tải tin nhắn...
        </p>
      );
    }
    if (loadError && messages.length === 0) {
      return (
        <div role="alert" className="mx-auto max-w-sm py-8 text-center text-sm text-slate-900">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 min-h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 font-medium transition-colors duration-200 hover:bg-slate-100"
          >
            Thử lại
          </button>
        </div>
      );
    }
    if (messages.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-slate-600">
          Chưa có tin nhắn nào. Hãy gửi tin nhắn đầu tiên.
        </p>
      );
    }
    return messages.map((message) => (
      <MessageBubble
        key={message._id}
        message={message}
        isMine={String(message.senderId) === String(currentUserId)}
        onMediaSettled={handleMediaSettled}
      />
    ));
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white" aria-label={`Cuộc trò chuyện với ${selectedUser.username}`}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại danh sách"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-900 transition-colors duration-200 hover:bg-slate-100 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-primary"
            aria-hidden="true"
          >
            {getInitial(selectedUser.username)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">{selectedUser.username}</h2>
            <p className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />
              {status.text}
            </p>
          </div>
        </div>

        {/* Màn hình nhỏ: 3 nút an toàn xuống hàng riêng, tự xuống dòng nếu vẫn chật. */}
        <div className="w-full md:ml-auto md:w-auto">
          <ChatSafetyActions targetUser={safetyTarget} messages={messages} onBlockChange={onBlockChange} />
        </div>
      </header>

      <FlaggedBanner user={selectedUser} />

      <div className="relative min-h-0 flex-1 bg-slate-50">
        <div
          ref={listRef}
          onScroll={handleScroll}
          role="log"
          aria-label="Tin nhắn"
          aria-live="polite"
          className="h-full space-y-3 overflow-y-auto px-4 py-4"
        >
          {renderMessages()}
        </div>

        {hasNewBelow && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 flex min-h-11 -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full bg-brand-primary px-4 text-sm font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-brand-hover"
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
            Tin nhắn mới
          </button>
        )}
      </div>

      {isBlocked && (
        <div role="status" className="border-t border-slate-200 bg-slate-100 px-4 py-2.5 text-center">
          <p className="text-sm font-medium text-slate-900">Cuộc trò chuyện này đã bị chặn.</p>
          <p className="mt-0.5 text-xs text-slate-600">
            {selectedUser.isBlockedByMe
              ? 'Bạn đã chặn người này. Bấm "Bỏ chặn" để nhắn tin lại.'
              : 'Người này đã chặn bạn nên bạn không thể gửi tin nhắn.'}
          </p>
        </div>
      )}

      {!isConnected && !isBlocked && (
        <p role="status" className="border-t border-risk-medium-border bg-risk-medium-bg px-4 py-2 text-center text-sm text-risk-medium-text">
          {connectionStatus === 'disconnected'
            ? 'Mất kết nối, đang thử kết nối lại...'
            : 'Đang kết nối...'}
        </p>
      )}

      {uploading && (
        <p role="status" className="flex items-center justify-center gap-2 border-t border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
          <LoaderCircle className="h-4 w-4 animate-spin text-brand-primary" aria-hidden="true" />
          {UPLOADING_MESSAGE}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          onChange={handleFileChange}
          aria-label="Chọn ảnh để gửi"
          className="hidden"
          tabIndex={-1}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAttach}
          aria-label="Gửi ảnh"
          title="Gửi ảnh (JPG, PNG, WEBP, tối đa 5MB)"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 transition-colors duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {/* Chữ 16px trên mobile để iOS không tự phóng to trang khi chạm vào ô nhập. */}
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_CONTENT_LENGTH}
            rows={1}
            disabled={isBlocked}
            aria-label="Nhập tin nhắn"
            placeholder={isBlocked ? 'Không thể nhắn tin khi cuộc trò chuyện bị chặn' : 'Nhập tin nhắn...'}
            className="max-h-32 min-h-11 w-full resize-none rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          />
          {draft.length >= COUNTER_THRESHOLD && (
            <p className="mt-1 text-right font-mono text-xs text-slate-600">
              {draft.length}/{MAX_CONTENT_LENGTH}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSend}
          className="flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        >
          <SendHorizontal className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Gửi</span>
        </button>
      </form>
    </section>
  );
}
