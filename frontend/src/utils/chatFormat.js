// Hàm định dạng và xử lý danh sách tin nhắn cho trang chat.

const amountFormatter = new Intl.NumberFormat('vi-VN');

// 500000 -> "500.000đ". Giá trị không phải số hữu hạn dương thì trả chuỗi rỗng.
export function formatAmount(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return '';
  return `${amountFormatter.format(amount)}đ`;
}

// "2026-11-28T14:05:00Z" -> "14:05" (giờ địa phương). Giá trị sai thì trả chuỗi rỗng.
export function formatTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Chữ cái đầu của username, viết hoa, dùng làm avatar.
export function getInitial(username) {
  const first = typeof username === 'string' ? username.trim().charAt(0) : '';
  return first ? first.toUpperCase() : '?';
}

// Id của người còn lại trong một tin nhắn 1-1.
export function getPeerId(message, currentUserId) {
  return String(message.senderId) === String(currentUserId)
    ? String(message.receiverId)
    : String(message.senderId);
}

// Gộp hai danh sách tin nhắn: bỏ trùng theo _id, sắp xếp cũ -> mới.
// Dùng khi tin realtime đến trong lúc lịch sử đang tải, hoặc tin của mình được server phát lại.
export function mergeMessages(current, incoming) {
  const byId = new Map();
  for (const message of [...current, ...incoming]) {
    byId.set(String(message._id), message);
  }
  return [...byId.values()].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (diff !== 0 && !Number.isNaN(diff)) return diff;
    return String(a._id).localeCompare(String(b._id));
  });
}
