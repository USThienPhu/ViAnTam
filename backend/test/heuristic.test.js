const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeHeuristic, stripVietnamese } = require('../src/services/heuristic.service');
const { HO_TRO_MOMO, TUYEN_DUNG_CTV, CHU_TRO } = require('./fixtures/seedConversations');

function convo(overrides = {}) {
  return { targetUsername: 'nguoi_la', targetReportCount: 0, messages: [], links: [], qrTransfers: [], ...overrides };
}
const target = (text) => ({ sender: 'target', text });

describe('stripVietnamese', () => {
  test('bỏ dấu và đ, chữ thường', () => {
    assert.equal(stripVietnamese('Ứng Trước ĐỒNG'), 'ung truoc dong');
  });
});

describe('computeHeuristic với 3 hội thoại seed', () => {
  test('HoTro_MoMo_247 = 90', () => {
    const r = computeHeuristic(HO_TRO_MOMO);
    assert.equal(r.score, 90);
    assert.equal(r.scamType, 'Link giả mạo (phishing)');
  });

  test('TuyenDung_CTV_Online = 40, loại việc làm', () => {
    const r = computeHeuristic(TUYEN_DUNG_CTV);
    assert.equal(r.score, 40);
    assert.equal(r.scamType, 'Lừa đảo tuyển cộng tác viên / việc làm');
    assert.ok(r.suspiciousSigns.some((s) => s.quote.includes('tuyển CTV')));
  });

  test('ChuTro_AnhMinh = 0', () => {
    const r = computeHeuristic(CHU_TRO);
    assert.equal(r.score, 0);
    assert.equal(r.scamType, 'Chưa xác định');
    assert.deepEqual(r.suspiciousSigns, []);
  });
});

describe('quy tắc tín hiệu', () => {
  test('QR và link có cờ do chính người dùng gửi không cộng điểm', () => {
    const r = computeHeuristic(
      convo({
        messages: [{ sender: 'user', text: 'Đây là QR của mình, otp mình tự giữ nhé' }],
        links: [{ url: 'http://m0mo.xyz', flags: ['suspicious_tld'], safe_browsing_flagged: false, sender: 'user', inBlacklist: false, blacklistPending: true }],
        qrTransfers: [{ bankName: 'VCB', accountNumber: '1', sender: 'user', inBlacklist: false, blacklistPending: true }],
      })
    );
    assert.equal(r.score, 0);
  });

  test('blacklist pending chỉ cộng 10 một lần', () => {
    const r = computeHeuristic(
      convo({
        qrTransfers: [
          { bankName: 'A', accountNumber: '1', sender: 'target', inBlacklist: false, blacklistPending: true },
          { bankName: 'B', accountNumber: '2', sender: 'target', inBlacklist: false, blacklistPending: true },
        ],
      })
    );
    assert.equal(r.score, 15 + 10);
  });

  test('link apk hoặc bị Safe Browsing gắn cờ cộng 40, link có cờ khác cộng 25', () => {
    const r = computeHeuristic(
      convo({
        links: [
          { url: 'http://a.com/x.apk', flags: ['apk_download'], safe_browsing_flagged: false, sender: 'target' },
          { url: 'https://bit.ly/a', flags: ['shortened_url'], safe_browsing_flagged: false, sender: 'target' },
        ],
      })
    );
    assert.equal(r.score, 65);
  });

  test('so khớp trọn cụm từ: "đầu tuần" không khớp "dau tu"', () => {
    assert.equal(computeHeuristic(convo({ messages: [target('Đầu tuần sau anh qua lấy đồ nhé')] })).score, 0);
    assert.equal(computeHeuristic(convo({ messages: [target('Em đầu tư cùng chị nhé')] })).score, 30);
  });

  test('mỗi nhóm từ khóa chỉ cộng 1 lần, tổng tối đa 100', () => {
    assert.equal(computeHeuristic(convo({ messages: [target('gửi otp'), target('đọc mã OTP')] })).score, 35);
    const many = computeHeuristic(
      convo({
        targetReportCount: 5,
        messages: [
          target('Tôi là công an, anh cài app UltraViewer, gửi mã OTP, nạp tiền đầu tư ngay lập tức, nhắn qua zalo'),
        ],
      })
    );
    assert.equal(many.score, 100);
  });

  test('username giả brand cộng 15', () => {
    const r = computeHeuristic(convo({ targetUsername: 'CSKH_Vietc0mbank' }));
    assert.equal(r.score, 15);
    assert.equal(r.scamType, 'Giả danh ngân hàng / ví điện tử');
  });
});
