// TODO (W2-2.2): Giải mã VietQR EMVCo TLV bằng jimp + jsqr (docs/chat-spec.md mục 4).
// Hiện là bản tạm: chưa đọc QR, luôn trả "không phải VietQR". Route upload đã dùng đúng hợp đồng trả về này.
// eslint-disable-next-line no-unused-vars
async function parseImageBuffer(buffer) {
  return { qrData: { isVietQR: false }, extractedLinks: [] };
}

module.exports = { parseImageBuffer };
