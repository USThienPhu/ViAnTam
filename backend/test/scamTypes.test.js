const { test } = require('node:test');
const assert = require('node:assert/strict');
const SCAM_TYPES = require('../src/config/scamTypes');

test('SCAM_TYPES có đúng 10 loại theo spec và không sửa được', () => {
  assert.deepEqual(SCAM_TYPES, [
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
  assert.ok(Object.isFrozen(SCAM_TYPES));
});
