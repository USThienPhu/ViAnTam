// Chuyển lỗi axios thành thông báo tiếng Việt để hiển thị cho người dùng.
export default function getErrorMessage(error, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
  if (!error?.response) {
    return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  }
  const message = error.response.data?.message;
  return typeof message === 'string' && message ? message : fallback;
}
