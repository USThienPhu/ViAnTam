// Điểm Heuristic luôn được tính (docs/ai-scam-detection-spec.md mục 3.2).
// Chỉ tính tín hiệu do đối phương tạo ra (sender === 'target').
const { normalizeLookalike, BRANDS } = require('./linkAnalyzer.service');

const PHISHING = 'Link giả mạo (phishing)';
const IMPERSONATE_FINANCE = 'Giả danh ngân hàng / ví điện tử';

const KEYWORD_GROUPS = [
  {
    score: 40,
    scamType: 'Lừa đảo tuyển cộng tác viên / việc làm',
    keywords: ['ung truoc', 'nap tien', 'nap truoc', 'hoa hong', 'ctv', 'cong tac vien'],
    explanation: 'Mời làm cộng tác viên hoặc yêu cầu ứng/nạp tiền trước để nhận việc, nhận hoa hồng.',
  },
  {
    score: 35,
    scamType: 'Đánh cắp mã OTP / tài khoản',
    keywords: ['otp', 'ma xac nhan', 'mat khau', 'ma xac thuc'],
    explanation: 'Hỏi mã OTP, mật khẩu hoặc mã xác nhận.',
  },
  {
    score: 35,
    scamType: 'Lừa cài ứng dụng điều khiển từ xa',
    keywords: ['ultraviewer', 'teamviewer', 'anydesk', 'cai ung dung', 'cai app', 'chia se man hinh'],
    explanation: 'Yêu cầu cài ứng dụng hoặc chia sẻ màn hình, có thể để chiếm quyền điều khiển máy.',
  },
  {
    score: 30,
    scamType: 'Giả danh cơ quan chức năng',
    keywords: ['cong an', 'vien kiem sat', 'toa an', 'vneid', 'co quan dieu tra'],
    explanation: 'Nhắc tới cơ quan chức năng, thường gặp trong kịch bản giả danh.',
  },
  {
    score: 30,
    scamType: 'Lừa đảo đầu tư',
    keywords: ['loi nhuan', 'lai suat cao', 'dau tu', 'x2 tai khoan'],
    explanation: 'Mời đầu tư hoặc hứa hẹn lợi nhuận.',
  },
  {
    score: 20,
    scamType: null,
    keywords: ['khoa vinh vien', 'bi khoa', 'trong 10 phut', 'ngay lap tuc', 'giu bi mat'],
    explanation: 'Tạo áp lực thời gian hoặc đe dọa khóa tài khoản, yêu cầu giữ bí mật.',
  },
  {
    score: 15,
    scamType: null,
    keywords: ['telegram', 'qua zalo', 'ket ban zalo', 'nhan tin zalo'],
    explanation: 'Rủ chuyển cuộc trò chuyện sang nền tảng khác.',
  },
].map((g) => ({
  ...g,
  patterns: g.keywords.map((k) => new RegExp(`(^|[^a-z0-9])${k.replace(/ /g, '\\s+')}($|[^a-z0-9])`)),
}));

function stripVietnamese(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function computeHeuristic(input) {
  const messages = (input.messages || []).filter((m) => m.sender === 'target');
  const links = (input.links || []).filter((l) => l.sender === 'target');
  const qrs = (input.qrTransfers || []).filter((q) => q.sender === 'target');
  const contributions = [];
  const suspiciousSigns = [];
  const add = (score, scamType, sign) => {
    contributions.push({ score, scamType });
    if (sign) suspiciousSigns.push(sign);
  };

  for (const link of links) {
    const flags = link.flags || [];
    const strong = flags.includes('apk_download') || link.safe_browsing_flagged;
    if (strong || flags.length > 0) {
      const reasons = [...flags, ...(link.safe_browsing_flagged ? ['safe_browsing'] : [])].join(', ');
      add(strong ? 40 : 25, PHISHING, { quote: link.url, explanation: `Đường link có dấu hiệu rủi ro: ${reasons}.` });
    }
  }
  if (qrs.length > 0) add(15, null);
  if ([...links, ...qrs].some((s) => s.blacklistPending)) add(10, null);
  if ((input.targetReportCount || 0) >= 3) add(15, null);

  const username = normalizeLookalike(input.targetUsername);
  if (BRANDS.some((b) => username.includes(b))) {
    add(15, IMPERSONATE_FINANCE, {
      quote: input.targetUsername,
      explanation: 'Tên tài khoản chứa tên thương hiệu tài chính, có thể là giả danh.',
    });
  }

  for (const group of KEYWORD_GROUPS) {
    const hit = messages.find((m) => group.patterns.some((p) => p.test(stripVietnamese(m.text))));
    if (hit) add(group.score, group.scamType, { quote: String(hit.text).slice(0, 200), explanation: group.explanation });
  }

  const score = Math.min(100, contributions.reduce((sum, c) => sum + c.score, 0));
  const typed = contributions.filter((c) => c.scamType).sort((a, b) => b.score - a.score);
  const seen = new Set();
  return {
    score,
    scamType: typed[0]?.scamType ?? 'Chưa xác định',
    suspiciousSigns: suspiciousSigns.filter((s) => !seen.has(s.quote) && seen.add(s.quote)),
  };
}

module.exports = { computeHeuristic, stripVietnamese };
