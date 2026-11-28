// 3 hội thoại seed theo docs/testing-seed-spec.md, ở dạng input của llmClient.analyzeConversation.
const HO_TRO_MOMO = {
  targetUsername: 'HoTro_MoMo_247',
  targetReportCount: 4,
  messages: [
    { sender: 'target', text: 'Chào bạn, hệ thống phát hiện ví của bạn có giao dịch bất thường.' },
    {
      sender: 'target',
      text: 'Vui lòng truy cập http://m0mo-xacminh.xyz và chuyển 500.000đ vào QR BIDV STK 123456789 để xác minh trong 10 phút, nếu không tài khoản sẽ bị khóa vĩnh viễn.',
    },
  ],
  links: [
    {
      url: 'http://m0mo-xacminh.xyz',
      flags: ['suspicious_tld', 'typosquatting'],
      safe_browsing_flagged: false,
      sender: 'target',
      inBlacklist: true,
      blacklistPending: false,
    },
  ],
  qrTransfers: [
    {
      bankName: 'BIDV',
      accountNumber: '123456789',
      amount: 500000,
      purpose: 'Xac minh',
      sender: 'target',
      inBlacklist: true,
      blacklistPending: false,
    },
  ],
};

const TUYEN_DUNG_CTV = {
  targetUsername: 'TuyenDung_CTV_Online',
  targetReportCount: 1,
  messages: [
    { sender: 'target', text: 'Chào em, bên chị đang tuyển CTV xử lý đơn hàng tại nhà, ngày kiếm 300k-500k, làm lúc rảnh.' },
    { sender: 'user', text: 'Dạ công việc cụ thể là làm gì vậy chị?' },
    {
      sender: 'target',
      text: 'Em chỉ cần xác nhận đơn hàng trên hệ thống bên chị, có thể sẽ cần ứng trước một khoản nhỏ rồi nhận lại cả gốc lẫn hoa hồng ngay nhé.',
    },
  ],
  links: [],
  qrTransfers: [],
};

const CHU_TRO = {
  targetUsername: 'ChuTro_AnhMinh',
  targetReportCount: 0,
  messages: [
    {
      sender: 'target',
      text: 'Minh ơi tháng này tiền phòng 3tr5 với điện nước 300k nhé, tổng 3tr8. Rảnh thì chuyển khoản cho anh như mọi tháng nha.',
    },
    { sender: 'user', text: 'Dạ vâng anh, tối nay đi làm về em chuyển luôn ạ.' },
  ],
  links: [],
  qrTransfers: [],
};

module.exports = { HO_TRO_MOMO, TUYEN_DUNG_CTV, CHU_TRO };
