const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/khong-dung-trong-test';
process.env.JWT_SECRET = 'test-secret-chi-dung-cho-test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../src/models/User');
const Block = require('../src/models/Block');
const Message = require('../src/models/Message');
const { ChatPartner, HumanPartner, ChatError } = require('../src/services/chatPartner.interface');

let mongod;
let alice;
let bob;
const partner = new HumanPartner();

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'aegisai_test_partner' });
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Block.deleteMany({}), Message.deleteMany({})]);
  alice = await User.create({ username: 'alice', passwordHash: 'x' });
  bob = await User.create({ username: 'bob', passwordHash: 'x' });
});

const id = (u) => String(u._id);

describe('ChatPartner', () => {
  test('sendMessage mặc định ném Not implemented', async () => {
    await assert.rejects(new ChatPartner().sendMessage('a', 'b', {}), /Not implemented/);
  });
});

describe('HumanPartner.sendMessage', () => {
  test('lưu tin text với conversationId và extractedLinks', async () => {
    const saved = await partner.sendMessage(id(alice), id(bob), {
      type: 'text',
      content: '  vào https://m0mo-xacminh.xyz/a và http://x.vn nhé ',
    });
    assert.equal(saved.conversationId, [id(alice), id(bob)].sort().join('_'));
    assert.equal(saved.content, 'vào https://m0mo-xacminh.xyz/a và http://x.vn nhé');
    assert.deepEqual(saved.extractedLinks, ['https://m0mo-xacminh.xyz/a', 'http://x.vn']);
    assert.equal(await Message.countDocuments(), 1);
  });

  test('tin ảnh giữ imageUrl, qrData đã làm sạch và gộp link từ QR', async () => {
    const saved = await partner.sendMessage(id(alice), id(bob), {
      type: 'image',
      imageUrl: '/uploads/1710000000-qr.png',
      qrData: { raw: 'https://evil.xyz/pay', isVietQR: false, hack: '$where', amount: 'abc' },
    });
    assert.equal(saved.imageUrl, '/uploads/1710000000-qr.png');
    assert.deepEqual(saved.extractedLinks, ['https://evil.xyz/pay']);
    assert.equal(saved.qrData.raw, 'https://evil.xyz/pay');
    assert.equal(saved.qrData.hack, undefined);
    assert.equal(saved.qrData.amount, undefined);
  });

  test('qrData VietQR được lưu đủ trường', async () => {
    const saved = await partner.sendMessage(id(alice), id(bob), {
      type: 'image',
      imageUrl: '/uploads/a.png',
      qrData: { isVietQR: true, bankBin: '970418', bankName: 'BIDV', accountNumber: '123', amount: 500000, purpose: 'Xac minh' },
    });
    assert.equal(saved.qrData.isVietQR, true);
    assert.equal(saved.qrData.bankName, 'BIDV');
    assert.equal(saved.qrData.amount, 500000);
  });

  test('bị chặn (người gửi chặn người nhận) thì ném lỗi', async () => {
    await Block.create({ blockerId: alice._id, blockedId: bob._id });
    await assert.rejects(partner.sendMessage(id(alice), id(bob), { content: 'hi' }), (err) => {
      assert.ok(err instanceof ChatError);
      assert.equal(err.code, 'CONVERSATION_BLOCKED');
      assert.equal(err.message, 'Không thể gửi tin nhắn vì cuộc trò chuyện đã bị chặn.');
      return true;
    });
    assert.equal(await Message.countDocuments(), 0);
  });

  test('bị chặn theo chiều ngược lại cũng ném lỗi', async () => {
    await Block.create({ blockerId: bob._id, blockedId: alice._id });
    await assert.rejects(partner.sendMessage(id(alice), id(bob), { content: 'hi' }), { code: 'CONVERSATION_BLOCKED' });
  });

  const invalidCases = [
    ['receiverId không phải ObjectId', () => 'abc', { content: 'hi' }, 'INVALID_RECEIVER'],
    ['receiverId là object', () => ({ $ne: null }), { content: 'hi' }, 'INVALID_RECEIVER'],
    ['gửi cho chính mình', () => id(alice), { content: 'hi' }, 'INVALID_RECEIVER'],
    ['người nhận không tồn tại', () => String(new mongoose.Types.ObjectId()), { content: 'hi' }, 'RECEIVER_NOT_FOUND'],
    ['nội dung trống', () => id(bob), { content: '   ' }, 'EMPTY_MESSAGE'],
    ['nội dung quá 2000 ký tự', () => id(bob), { content: 'a'.repeat(2001) }, 'CONTENT_TOO_LONG'],
    ['tin ảnh thiếu imageUrl', () => id(bob), { type: 'image' }, 'INVALID_IMAGE'],
    ['imageUrl trỏ ra ngoài /uploads/', () => id(bob), { type: 'image', imageUrl: 'http://evil.com/a.png' }, 'INVALID_IMAGE'],
    ['imageUrl chứa ..', () => id(bob), { type: 'image', imageUrl: '/uploads/../.env' }, 'INVALID_IMAGE'],
  ];
  for (const [name, receiver, payload, code] of invalidCases) {
    test(`từ chối ${name}`, async () => {
      await assert.rejects(partner.sendMessage(id(alice), receiver(), payload), { code });
      assert.equal(await Message.countDocuments(), 0);
    });
  }

  test('payload không phải object vẫn bị từ chối bằng ChatError', async () => {
    await assert.rejects(partner.sendMessage(id(alice), id(bob), null), { code: 'EMPTY_MESSAGE' });
  });
});
