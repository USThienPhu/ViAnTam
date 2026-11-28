const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/khong-dung-trong-test';
process.env.JWT_SECRET = 'test-secret-chi-dung-cho-test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Message = require('../src/models/Message');
const Block = require('../src/models/Block');
const { makeConversationId } = require('../src/utils/conversation');

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'aegisai_test_models' });
  await Block.init();
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('makeConversationId', () => {
  test('giống nhau với cả hai chiều', () => {
    assert.equal(makeConversationId('b', 'a'), makeConversationId('a', 'b'));
    assert.equal(makeConversationId('b', 'a'), 'a_b');
  });
});

describe('Message', () => {
  test('lưu và đọc lại tin nhắn với giá trị mặc định', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const saved = await Message.create({
      conversationId: makeConversationId(a, b),
      senderId: a,
      receiverId: b,
      content: 'xin chào',
    });
    const found = await Message.findById(saved._id).lean();
    assert.equal(found.type, 'text');
    assert.equal(found.imageUrl, '');
    assert.deepEqual(found.extractedLinks, []);
    assert.equal(found.content, 'xin chào');
  });

  test('từ chối type ngoài text/image', async () => {
    const a = new mongoose.Types.ObjectId();
    await assert.rejects(
      Message.create({ conversationId: 'x', senderId: a, receiverId: a, type: 'video' })
    );
  });
});

describe('Block', () => {
  test('unique theo (blockerId, blockedId)', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    await Block.create({ blockerId: a, blockedId: b });
    await assert.rejects(Block.create({ blockerId: a, blockedId: b }), { code: 11000 });
    await Block.create({ blockerId: b, blockedId: a }); // chiều ngược lại được phép
  });
});
