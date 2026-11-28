const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/khong-dung-trong-test';
process.env.JWT_SECRET = 'test-secret-chi-dung-cho-test';

const mongoose = require('mongoose');
const request = require('supertest');
const QRCode = require('qrcode');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { app, io } = require('../src/app');
const User = require('../src/models/User');
const Message = require('../src/models/Message');
const { signToken } = require('../src/middlewares/auth');
const { makeConversationId } = require('../src/utils/conversation');

const UPLOAD_DIR = path.resolve(__dirname, '../uploads');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

let mongod;
let alice;
let bob;
let carol;
const createdFiles = [];

const auth = (user) => ({ Authorization: `Bearer ${signToken(user)}` });

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'aegisai_test_chat_routes' });
});

after(async () => {
  for (const file of createdFiles) fs.rmSync(path.join(UPLOAD_DIR, file), { force: true });
  io.close();
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Message.deleteMany({})]);
  alice = await User.create({ username: 'alice', passwordHash: 'x' });
  bob = await User.create({ username: 'bob', passwordHash: 'x' });
  carol = await User.create({ username: 'carol', passwordHash: 'x' });
});

function msg(from, to, content, createdAt) {
  return { conversationId: makeConversationId(from._id, to._id), senderId: from._id, receiverId: to._id, content, createdAt };
}

describe('GET /api/messages/:targetUserId', () => {
  test('chưa đăng nhập trả 401', async () => {
    const res = await request(app).get(`/api/messages/${bob._id}`);
    assert.equal(res.status, 401);
  });

  test('targetUserId không hợp lệ trả 400', async () => {
    const res = await request(app).get('/api/messages/abc').set(auth(alice));
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_USER_ID');
  });

  test('chỉ trả tin của đúng cuộc trò chuyện, theo thứ tự cũ -> mới, cả hai chiều', async () => {
    await Message.create([
      msg(alice, bob, 'một', new Date('2026-01-01T00:00:01Z')),
      msg(bob, alice, 'hai', new Date('2026-01-01T00:00:02Z')),
      msg(alice, carol, 'khác', new Date('2026-01-01T00:00:03Z')),
    ]);
    const fromAlice = await request(app).get(`/api/messages/${bob._id}`).set(auth(alice));
    const fromBob = await request(app).get(`/api/messages/${alice._id}`).set(auth(bob));
    assert.deepEqual(fromAlice.body.map((m) => m.content), ['một', 'hai']);
    assert.deepEqual(fromBob.body.map((m) => m.content), ['một', 'hai']);
  });

  test('tối đa 100 tin gần nhất', async () => {
    const docs = Array.from({ length: 105 }, (_, i) => msg(alice, bob, `m${i}`, new Date(2026, 0, 1, 0, 0, i)));
    await Message.create(docs);
    const res = await request(app).get(`/api/messages/${bob._id}`).set(auth(alice));
    assert.equal(res.body.length, 100);
    assert.equal(res.body[0].content, 'm5');
    assert.equal(res.body[99].content, 'm104');
  });

  test('chưa có tin nhắn trả mảng rỗng', async () => {
    const res = await request(app).get(`/api/messages/${bob._id}`).set(auth(alice));
    assert.deepEqual(res.body, []);
  });
});

describe('POST /api/messages/upload', () => {
  test('chưa đăng nhập trả 401', async () => {
    const res = await request(app).post('/api/messages/upload').attach('image', PNG, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(res.status, 401);
  });

  test('upload thành công trả imageUrl truy cập được qua /uploads', async () => {
    const res = await request(app)
      .post('/api/messages/upload')
      .set(auth(alice))
      .attach('image', PNG, { filename: '../../evil name.png', contentType: 'image/png' });
    assert.equal(res.status, 200);
    assert.match(res.body.imageUrl, /^\/uploads\/\d+-[a-f0-9]{12}\.png$/);
    assert.deepEqual(res.body.qrData, { isVietQR: false });
    assert.deepEqual(res.body.extractedLinks, []);
    createdFiles.push(path.basename(res.body.imageUrl));

    const file = await request(app).get(res.body.imageUrl);
    assert.equal(file.status, 200);
    assert.deepEqual(file.body, PNG);
  });

  test('upload ảnh VietQR thật trả qrData đã giải mã, ảnh vẫn mở được', async () => {
    const tlv = (tag, value) => `${tag}${String(value.length).padStart(2, '0')}${value}`;
    const beneficiary = tlv('00', '970418') + tlv('01', '123456789');
    const raw =
      '000201010212' +
      tlv('38', tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', 'QRIBFTTA')) +
      '5303704' + tlv('54', '500000') + '5802VN' + tlv('62', tlv('08', 'Xac minh')) + '63040000';
    const qrPng = await QRCode.toBuffer(raw, { type: 'png', margin: 4, scale: 6 });

    const res = await request(app)
      .post('/api/messages/upload')
      .set(auth(alice))
      .attach('image', qrPng, { filename: 'qr.png', contentType: 'image/png' });
    assert.equal(res.status, 200);
    createdFiles.push(path.basename(res.body.imageUrl));
    assert.equal(res.body.qrData.isVietQR, true);
    assert.equal(res.body.qrData.bankName, 'BIDV');
    assert.equal(res.body.qrData.accountNumber, '123456789');
    assert.equal(res.body.qrData.amount, 500000);
    assert.equal(res.body.qrData.purpose, 'Xac minh');
    assert.deepEqual(res.body.extractedLinks, []);
    assert.equal((await request(app).get(res.body.imageUrl)).status, 200);
  });

  test('upload ảnh QR chứa link trả extractedLinks', async () => {
    const qrPng = await QRCode.toBuffer('https://m0mo-xacminh.xyz/pay', { type: 'png', margin: 4, scale: 6 });
    const res = await request(app)
      .post('/api/messages/upload')
      .set(auth(alice))
      .attach('image', qrPng, { filename: 'qr.png', contentType: 'image/png' });
    assert.equal(res.status, 200);
    createdFiles.push(path.basename(res.body.imageUrl));
    assert.equal(res.body.qrData.isVietQR, false);
    assert.deepEqual(res.body.extractedLinks, ['https://m0mo-xacminh.xyz/pay']);
  });

  test('sai định dạng trả 400', async () => {
    const res = await request(app)
      .post('/api/messages/upload')
      .set(auth(alice))
      .attach('image', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    assert.equal(res.status, 400);
  });

  test('thiếu file trả 400', async () => {
    const res = await request(app).post('/api/messages/upload').set(auth(alice));
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'NO_FILE');
  });
});
