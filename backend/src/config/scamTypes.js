// Danh sách loại lừa đảo cố định (docs/ai-scam-detection-spec.md mục 2.2).
// Phải giống hệt SCAM_TYPES trong ai-service/schemas.py.
const SCAM_TYPES = Object.freeze([
  'Giả danh ngân hàng / ví điện tử',
  'Giả danh cơ quan chức năng',
  'Đánh cắp mã OTP / tài khoản',
  'Lừa đảo tuyển cộng tác viên / việc làm',
  'Lừa đảo đầu tư',
  'Link giả mạo (phishing)',
  'Lừa cài ứng dụng điều khiển từ xa',
  'Lừa đảo tình cảm',
  'Khác',
  'Chưa xác định',
]);

module.exports = SCAM_TYPES;
