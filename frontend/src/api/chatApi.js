import axiosInstance from './axiosInstance';

// Các lời gọi REST của chat. Luôn đi qua axiosInstance để có JWT (convention.md mục 4).

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Backend trả imageUrl dạng "/uploads/xxx.png" (đường dẫn tương đối của backend). Frontend chạy ở origin khác
// (Vite 5173 hoặc Vercel) nên phải ghép với origin của backend mới mở được ảnh.
// Chỉ nhận đường dẫn bắt đầu bằng "/uploads/", mọi giá trị khác trả chuỗi rỗng để không nhúng URL lạ vào <img>.
export function resolveImageUrl(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/uploads/') || imageUrl.includes('..')) {
    return '';
  }
  try {
    return `${new URL(API_URL).origin}${imageUrl}`;
  } catch {
    return '';
  }
}

// GET /api/users -> danh sách người dùng khác, kèm isFlagged, reportCount, isBlockedByMe, hasBlockedMe.
export async function getUsers() {
  const { data } = await axiosInstance.get('/users');
  return data;
}

// GET /api/messages/:targetUserId -> tối đa 100 tin gần nhất, cũ -> mới.
export async function getMessages(targetUserId) {
  const { data } = await axiosInstance.get(`/messages/${encodeURIComponent(targetUserId)}`);
  return data;
}

// POST /api/messages/upload -> { imageUrl, qrData, extractedLinks }.
// Không tự đặt Content-Type: axios/trình duyệt phải tự thêm boundary cho multipart.
export async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const { data } = await axiosInstance.post('/messages/upload', form);
  return data;
}
