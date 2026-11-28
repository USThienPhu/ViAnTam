const { Jimp } = require('jimp');
const jsQR = require('jsqr');

const bankBins = require('../config/bankBins.json');

// Giải mã mã QR chuyển khoản VietQR (chuẩn EMVCo) từ ảnh. Xem docs/chat-spec.md mục 4.
// Hợp đồng với routes/chat.routes.js: parseImageBuffer(buffer) KHÔNG BAO GIỜ ném lỗi,
// luôn trả { qrData, extractedLinks }. Ảnh hỏng, không có QR hay QR lạ đều trả { qrData: { isVietQR: false } }.

const MAX_RAW_LENGTH = 1000; // khớp giới hạn của sanitizeQrData trong chatPartner.interface.js
const MAX_PURPOSE_LENGTH = 200;
const MAX_SCAN_SIDE = 1200; // thu nhỏ ảnh lớn (ảnh chụp điện thoại) trước khi quét để jsQR không chạy quá lâu
const MAX_PIXELS = 25_000_000; // chặn ảnh nén nhỏ nhưng giải nén ra khổng lồ (decompression bomb)

const BIN_PATTERN = /^\d{6}$/;
const ACCOUNT_PATTERN = /^[A-Za-z0-9._-]{1,50}$/;
const AMOUNT_PATTERN = /^\d+(\.\d+)?$/;
const URL_PATTERN = /^https?:\/\//i;

const NOT_VIETQR = () => ({ qrData: { isVietQR: false }, extractedLinks: [] });

/**
 * Tách chuỗi TLV (Tag 2 chữ số + Length 2 chữ số + Value) thành Map<tag, value>.
 * Trả null nếu chuỗi sai định dạng (tag/length không phải số, hoặc length vượt quá phần còn lại).
 * Tag lặp lại thì giữ giá trị xuất hiện đầu tiên.
 */
function parseTLV(str) {
  if (typeof str !== 'string') return null;
  const result = new Map();
  let i = 0;
  while (i < str.length) {
    const tag = str.slice(i, i + 2);
    const lenText = str.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lenText)) return null;
    const len = parseInt(lenText, 10);
    if (i + 4 + len > str.length) return null;
    if (!result.has(tag)) result.set(tag, str.slice(i + 4, i + 4 + len));
    i += 4 + len;
  }
  return result;
}

// Đọc thông tin chuyển khoản VietQR. Trả null nếu không phải VietQR hợp lệ.
function parseVietQR(raw) {
  const root = parseTLV(raw);
  if (!root) return null;

  // Tag 38 = Merchant Account Information (NAPAS); Tag 01 bên trong = thông tin người thụ hưởng.
  const tag38 = parseTLV(root.get('38'));
  const beneficiary = parseTLV(tag38?.get('01'));
  if (!beneficiary) return null;

  const bankBin = beneficiary.get('00');
  const accountNumber = beneficiary.get('01');
  if (!BIN_PATTERN.test(bankBin ?? '') || !ACCOUNT_PATTERN.test(accountNumber ?? '')) return null;

  const info = { isVietQR: true, bankBin, accountNumber };

  const bankName = bankBins[bankBin];
  if (bankName) info.bankName = bankName; // BIN chưa có trong bankBins.json thì để trống tên ngân hàng

  const amountText = root.get('54');
  if (amountText && AMOUNT_PATTERN.test(amountText)) {
    const amount = Number(amountText);
    if (Number.isFinite(amount) && amount > 0) info.amount = amount;
  }

  // Tag 62 = Additional Data; Tag 08 bên trong = nội dung chuyển khoản.
  const purpose = parseTLV(root.get('62'))?.get('08');
  if (purpose) info.purpose = purpose.slice(0, MAX_PURPOSE_LENGTH);

  return info;
}

// Phân loại nội dung chuỗi đọc được từ QR: link, VietQR hay nội dung khác.
function parseQrText(text) {
  const raw = String(text ?? '').trim().slice(0, MAX_RAW_LENGTH);
  if (!raw) return NOT_VIETQR();

  if (URL_PATTERN.test(raw)) {
    return { qrData: { raw, isVietQR: false }, extractedLinks: [raw] };
  }

  if (raw.startsWith('000201')) {
    const info = parseVietQR(String(text).trim());
    if (info) return { qrData: { raw, ...info }, extractedLinks: [] };
  }

  return { qrData: { raw, isVietQR: false }, extractedLinks: [] };
}

// Đọc kích thước ảnh từ header (chưa giải mã). Chỉ hỗ trợ PNG và JPEG; định dạng khác trả null.
function readImageSize(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) return null;

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let i = 2;
    while (i + 4 <= buffer.length) {
      if (buffer[i] !== 0xff) return null;
      const marker = buffer[i + 1];
      if (marker === 0xff) {
        i += 1; // byte đệm
      } else if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
        i += 2; // marker không có độ dài
      } else {
        const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
        if (isFrameHeader) {
          if (i + 9 > buffer.length) return null;
          return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
        }
        const segmentLength = buffer.readUInt16BE(i + 2);
        if (segmentLength < 2) return null;
        i += 2 + segmentLength;
      }
    }
  }
  return null;
}

async function decodeQrFromImage(buffer) {
  const size = readImageSize(buffer);
  if (!size || !size.width || !size.height || size.width * size.height > MAX_PIXELS) return null;

  const image = await Jimp.read(buffer);
  const longestSide = Math.max(image.bitmap.width, image.bitmap.height);
  if (longestSide > MAX_SCAN_SIDE) {
    if (image.bitmap.width >= image.bitmap.height) image.resize({ w: MAX_SCAN_SIDE });
    else image.resize({ h: MAX_SCAN_SIDE });
  }

  const { data, width, height } = image.bitmap;
  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
  const code = jsQR(pixels, width, height);
  return code ? code.data : null;
}

async function parseImageBuffer(buffer) {
  try {
    const text = await decodeQrFromImage(buffer);
    if (text === null) return NOT_VIETQR();
    return parseQrText(text);
  } catch {
    return NOT_VIETQR();
  }
}

module.exports = { parseImageBuffer, parseQrText, parseTLV };
