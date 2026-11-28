const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const QRCode = require('qrcode');
const { Jimp } = require('jimp');

const { parseImageBuffer, parseQrText, parseTLV } = require('../src/services/qrParser.service');
const bankBins = require('../src/config/bankBins.json');

const tlv = (tag, value) => `${tag}${String(value.length).padStart(2, '0')}${value}`;

// Dựng chuỗi VietQR đúng cấu trúc EMVCo: Tag 38 (NAPAS) > Tag 01 > Tag 00 (BIN) + Tag 01 (STK).
function buildVietQR({ bin, account, amount, purpose }) {
  const beneficiary = tlv('00', bin) + tlv('01', account);
  const tag38 = tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', 'QRIBFTTA');
  return (
    '000201' +
    '010212' +
    tlv('38', tag38) +
    '5303704' +
    (amount === undefined ? '' : tlv('54', String(amount))) +
    '5802VN' +
    (purpose === undefined ? '' : tlv('62', tlv('08', purpose))) +
    '63040000'
  );
}

const png = (text, options = {}) => QRCode.toBuffer(text, { type: 'png', margin: 4, scale: 6, ...options });

describe('bankBins.json', () => {
  test('có đủ 10 ngân hàng theo spec', () => {
    assert.deepEqual(bankBins, {
      970418: 'BIDV',
      970422: 'MBBank',
      970436: 'Vietcombank',
      970407: 'Techcombank',
      970416: 'ACB',
      970432: 'VPBank',
      970415: 'VietinBank',
      970403: 'Sacombank',
      970423: 'TPBank',
      970405: 'Agribank',
    });
  });
});

describe('parseTLV', () => {
  test('tách các cặp tag/độ dài/giá trị', () => {
    const map = parseTLV('000201' + '0102' + '12' + '540510000');
    assert.equal(map.get('00'), '01');
    assert.equal(map.get('01'), '12');
    assert.equal(map.get('54'), '10000');
  });

  test('chuỗi rỗng trả Map rỗng', () => {
    assert.equal(parseTLV('').size, 0);
  });

  test('giữ giá trị của tag xuất hiện đầu tiên', () => {
    assert.equal(parseTLV('0102AA0102BB').get('01'), 'AA');
  });

  const malformed = [
    ['độ dài vượt quá chuỗi', '0105AB'],
    ['độ dài không phải số', '01XXAB'],
    ['tag không phải số', 'AB02CD'],
    ['thiếu phần độ dài', '010'],
    ['độ dài âm', '01-1A'],
  ];
  for (const [name, input] of malformed) {
    test(`trả null khi ${name}`, () => {
      assert.equal(parseTLV(input), null);
    });
  }

  test('không phải chuỗi thì trả null', () => {
    assert.equal(parseTLV(undefined), null);
    assert.equal(parseTLV(123), null);
  });
});

describe('parseQrText', () => {
  test('VietQR BIDV đầy đủ thông tin', () => {
    const raw = buildVietQR({ bin: '970418', account: '123456789', amount: 500000, purpose: 'Xac minh' });
    const { qrData, extractedLinks } = parseQrText(raw);
    assert.deepEqual(qrData, {
      raw,
      isVietQR: true,
      bankBin: '970418',
      bankName: 'BIDV',
      accountNumber: '123456789',
      amount: 500000,
      purpose: 'Xac minh',
    });
    assert.deepEqual(extractedLinks, []);
  });

  for (const [bin, name] of Object.entries(bankBins)) {
    test(`nhận diện đúng ngân hàng ${name} (${bin})`, () => {
      const { qrData } = parseQrText(buildVietQR({ bin, account: '0011223344' }));
      assert.equal(qrData.isVietQR, true);
      assert.equal(qrData.bankName, name);
      assert.equal(qrData.accountNumber, '0011223344');
    });
  }

  test('QR không có số tiền và nội dung thì bỏ trống hai trường đó', () => {
    const { qrData } = parseQrText(buildVietQR({ bin: '970436', account: '999' }));
    assert.equal(qrData.isVietQR, true);
    assert.equal('amount' in qrData, false);
    assert.equal('purpose' in qrData, false);
  });

  test('BIN chưa có trong bankBins.json vẫn là VietQR, bỏ trống tên ngân hàng', () => {
    const { qrData } = parseQrText(buildVietQR({ bin: '999999', account: '555' }));
    assert.equal(qrData.isVietQR, true);
    assert.equal(qrData.bankBin, '999999');
    assert.equal('bankName' in qrData, false);
  });

  test('số tiền có phần thập phân được đọc đúng', () => {
    const { qrData } = parseQrText(buildVietQR({ bin: '970418', account: '1', amount: '1500.5' }));
    assert.equal(qrData.amount, 1500.5);
  });

  for (const bad of ['abc', '-5', '0', '1e5', '0x10', '']) {
    test(`số tiền không hợp lệ "${bad}" thì bỏ trống amount`, () => {
      const raw = buildVietQR({ bin: '970418', account: '1', amount: bad });
      const { qrData } = parseQrText(raw);
      assert.equal(qrData.isVietQR, true);
      assert.equal('amount' in qrData, false);
    });
  }

  test('QR chứa link http/https trả raw, isVietQR=false và đưa vào extractedLinks', () => {
    const { qrData, extractedLinks } = parseQrText('https://m0mo-xacminh.xyz/pay?id=1');
    assert.deepEqual(qrData, { raw: 'https://m0mo-xacminh.xyz/pay?id=1', isVietQR: false });
    assert.deepEqual(extractedLinks, ['https://m0mo-xacminh.xyz/pay?id=1']);
  });

  test('nội dung chữ thường không phải VietQR', () => {
    const { qrData, extractedLinks } = parseQrText('Xin chào');
    assert.deepEqual(qrData, { raw: 'Xin chào', isVietQR: false });
    assert.deepEqual(extractedLinks, []);
  });

  const broken = [
    ['bắt đầu 000201 nhưng không có Tag 38', '000201010212' + '5802VN'],
    ['Tag 38 hỏng', '000201' + tlv('38', 'zzzz')],
    ['Tag 38 thiếu Tag 01', '000201' + tlv('38', tlv('00', 'A000000727'))],
    ['BIN không đủ 6 số', buildVietQR({ bin: '9704', account: '123' })],
    ['BIN có chữ', buildVietQR({ bin: '97041A', account: '123' })],
    ['STK rỗng', buildVietQR({ bin: '970418', account: '' })],
    ['STK chứa ký tự lạ', buildVietQR({ bin: '970418', account: '12 34;<script>' })],
    ['độ dài vượt quá chuỗi', '000201' + '3899' + 'abc'],
  ];
  for (const [name, raw] of broken) {
    test(`chuỗi 000201 ${name} thì không phải VietQR`, () => {
      const { qrData } = parseQrText(raw);
      assert.equal(qrData.isVietQR, false);
      assert.equal('accountNumber' in qrData, false);
    });
  }

  test('raw quá dài bị cắt còn 1000 ký tự', () => {
    const { qrData } = parseQrText('x'.repeat(5000));
    assert.equal(qrData.raw.length, 1000);
  });

  test('đầu vào rỗng hoặc không phải chuỗi không làm lỗi', () => {
    for (const input of ['', '   ', undefined, null]) {
      assert.deepEqual(parseQrText(input), { qrData: { isVietQR: false }, extractedLinks: [] });
    }
  });
});

describe('parseImageBuffer', () => {
  test('ảnh PNG chứa VietQR BIDV được giải mã đúng', async () => {
    const raw = buildVietQR({ bin: '970418', account: '123456789', amount: 500000, purpose: 'Xac minh' });
    const { qrData } = await parseImageBuffer(await png(raw));
    assert.equal(qrData.isVietQR, true);
    assert.equal(qrData.bankName, 'BIDV');
    assert.equal(qrData.accountNumber, '123456789');
    assert.equal(qrData.amount, 500000);
    assert.equal(qrData.purpose, 'Xac minh');
    assert.equal(qrData.raw, raw);
  });

  for (const [bin, name] of [['970422', 'MBBank'], ['970436', 'Vietcombank']]) {
    test(`ảnh PNG chứa VietQR ${name}`, async () => {
      const { qrData } = await parseImageBuffer(await png(buildVietQR({ bin, account: '0987654321', amount: 20000 })));
      assert.equal(qrData.isVietQR, true);
      assert.equal(qrData.bankName, name);
      assert.equal(qrData.accountNumber, '0987654321');
      assert.equal(qrData.amount, 20000);
    });
  }

  test('ảnh JPEG chứa VietQR được giải mã', async () => {
    const pngBuffer = await png(buildVietQR({ bin: '970436', account: '1122334455', amount: 100000 }));
    const jpeg = await (await Jimp.read(pngBuffer)).getBuffer('image/jpeg');
    assert.equal(jpeg[0], 0xff);
    const { qrData } = await parseImageBuffer(jpeg);
    assert.equal(qrData.isVietQR, true);
    assert.equal(qrData.bankName, 'Vietcombank');
    assert.equal(qrData.accountNumber, '1122334455');
  });

  test('ảnh lớn được thu nhỏ trước khi quét mà vẫn giải mã được', async () => {
    const raw = buildVietQR({ bin: '970422', account: '7777', amount: 1 });
    const big = await png(raw, { scale: 1, width: 3000 });
    assert.ok(big.readUInt32BE(16) >= 3000);
    const { qrData } = await parseImageBuffer(big);
    assert.equal(qrData.isVietQR, true);
    assert.equal(qrData.accountNumber, '7777');
  });

  test('ảnh QR chứa link trả extractedLinks', async () => {
    const { qrData, extractedLinks } = await parseImageBuffer(await png('https://evil.xyz/pay'));
    assert.deepEqual(qrData, { raw: 'https://evil.xyz/pay', isVietQR: false });
    assert.deepEqual(extractedLinks, ['https://evil.xyz/pay']);
  });

  test('ảnh QR có chuỗi 000201 nhưng hỏng thì không phải VietQR', async () => {
    const { qrData } = await parseImageBuffer(await png('000201' + tlv('38', 'zzzz')));
    assert.equal(qrData.isVietQR, false);
  });

  test('ảnh không có QR trả isVietQR=false', async () => {
    const blank = await new Jimp({ width: 200, height: 200, color: 0xffffffff }).getBuffer('image/png');
    assert.deepEqual(await parseImageBuffer(blank), { qrData: { isVietQR: false }, extractedLinks: [] });
  });

  const garbage = [
    ['không phải ảnh', Buffer.from('day khong phai la anh, chi la van ban dai hon hai muoi bon byte')],
    ['PNG bị cắt cụt', Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20, 7)])],
    ['buffer rỗng', Buffer.alloc(0)],
    ['undefined', undefined],
    ['null', null],
    ['chuỗi', 'abc'],
  ];
  for (const [name, input] of garbage) {
    test(`đầu vào ${name} không ném lỗi, trả isVietQR=false`, async () => {
      assert.deepEqual(await parseImageBuffer(input), { qrData: { isVietQR: false }, extractedLinks: [] });
    });
  }

  test('ảnh WEBP không giải mã, trả isVietQR=false mà không lỗi', async () => {
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(64)]);
    assert.deepEqual(await parseImageBuffer(webp), { qrData: { isVietQR: false }, extractedLinks: [] });
  });

  test('ảnh khai báo kích thước khổng lồ bị từ chối trước khi giải nén', async () => {
    const header = Buffer.alloc(64);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header);
    header.writeUInt32BE(65000, 16);
    header.writeUInt32BE(65000, 20);
    const started = Date.now();
    assert.deepEqual(await parseImageBuffer(header), { qrData: { isVietQR: false }, extractedLinks: [] });
    assert.ok(Date.now() - started < 1000);
  });
});
