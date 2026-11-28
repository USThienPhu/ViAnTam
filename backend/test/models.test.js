const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/khong-dung-trong-test';
process.env.JWT_SECRET = 'test-secret-chi-dung-cho-test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../src/models/User');
const Message = require('../src/models/Message');
const Report = require('../src/models/Report');
const Block = require('../src/models/Block');
const Blacklist = require('../src/models/Blacklist');
const ScamCheck = require('../src/models/ScamCheck');
const { makeConversationId } = require('../src/utils/conversation');

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'aegisai_models_test' });
  await Promise.all([
    User.init(),
    Message.init(),
    Report.init(),
    Block.init(),
    Blacklist.init(),
    ScamCheck.init(),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Message.deleteMany({}),
    Report.deleteMany({}),
    Block.deleteMany({}),
    Blacklist.deleteMany({}),
    ScamCheck.deleteMany({}),
  ]);
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
  test('unique theo (blockerId, blockedId) và cho phép chiều ngược lại', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    await Block.create({ blockerId: a, blockedId: b });
    await assert.rejects(Block.create({ blockerId: a, blockedId: b }), { code: 11000 });
    await Block.create({ blockerId: b, blockedId: a });
  });
});

describe('Mongoose models & indexes (W3-1.1)', () => {
  test('đăng ký đúng tên collection trong MongoDB', () => {
    assert.equal(User.collection.collectionName, 'users');
    assert.equal(Message.collection.collectionName, 'messages');
    assert.equal(Report.collection.collectionName, 'reports');
    assert.equal(Block.collection.collectionName, 'blocks');
    assert.equal(Blacklist.collection.collectionName, 'blacklist');
    assert.equal(ScamCheck.collection.collectionName, 'scam_checks');
  });

  test('tạo Message với dữ liệu text và VietQR đầy đủ giá trị mặc định', async () => {
    const senderId = new mongoose.Types.ObjectId();
    const receiverId = new mongoose.Types.ObjectId();
    const conversationId = makeConversationId(senderId, receiverId);

    const textMsg = await Message.create({
      conversationId,
      senderId,
      receiverId,
      content: 'Xin chào',
    });

    assert.equal(textMsg.type, 'text');
    assert.equal(textMsg.imageUrl, '');
    assert.deepEqual(textMsg.extractedLinks, []);
    assert.equal(textMsg.qrData.isVietQR, false);

    const qrMsg = await Message.create({
      conversationId,
      senderId,
      receiverId,
      type: 'image',
      imageUrl: '/uploads/qr.png',
      extractedLinks: ['http://m0mo-xacminh.xyz'],
      qrData: {
        raw: '000201...',
        isVietQR: true,
        bankBin: '970418',
        bankName: 'BIDV',
        accountNumber: '123456789',
        amount: 500000,
        purpose: 'Xac minh',
      },
    });

    assert.equal(qrMsg.type, 'image');
    assert.equal(qrMsg.qrData.bankName, 'BIDV');
    assert.equal(qrMsg.qrData.amount, 500000);
  });

  test('Blacklist chặn trùng type + value và kiểm tra enum type', async () => {
    const item = await Blacklist.create({
      type: 'bank_account',
      value: '123456789',
      bankBin: '970418',
    });

    assert.equal(item.reportCount, 1);
    assert.equal(item.status, 'pending');

    await assert.rejects(
      () => Blacklist.create({ type: 'bank_account', value: '123456789' }),
      (err) => err.code === 11000
    );

    await assert.rejects(
      () => Blacklist.create({ type: 'phone', value: '0901234567' }),
      (err) => err.name === 'ValidationError'
    );
  });

  test('Report chặn trùng reporterId + reportedUserId và kiểm tra độ dài mô tả / enum reason', async () => {
    const reporterId = new mongoose.Types.ObjectId();
    const reportedUserId = new mongoose.Types.ObjectId();

    const report = await Report.create({
      reporterId,
      reportedUserId,
      reason: 'phishing',
      description: 'Gửi link giả mạo ví điện tử',
    });
    assert.equal(report.status, 'open');

    await assert.rejects(
      () =>
        Report.create({
          reporterId,
          reportedUserId,
          reason: 'phishing',
        }),
      (err) => err.code === 11000
    );

    await assert.rejects(
      () =>
        Report.create({
          reporterId: new mongoose.Types.ObjectId(),
          reportedUserId,
          reason: 'invalid_reason',
        }),
      (err) => err.name === 'ValidationError'
    );

    await assert.rejects(
      () =>
        Report.create({
          reporterId: new mongoose.Types.ObjectId(),
          reportedUserId,
          reason: 'other',
          description: 'a'.repeat(501),
        }),
      (err) => err.name === 'ValidationError'
    );
  });

  test('ScamCheck lưu đầy đủ trường (bao gồm analysisSource) và kiểm tra biên điểm 0..100', async () => {
    const requesterId = new mongoose.Types.ObjectId();
    const targetUserId = new mongoose.Types.ObjectId();

    const check = await ScamCheck.create({
      requesterId,
      targetUserId,
      conversationId: makeConversationId(requesterId, targetUserId),
      initialScore: 52,
      finalScore: 52,
      riskLevel: 'medium',
      suspiciousSigns: [{ quote: 'Ứng trước tiền đơn hàng', explanation: 'Dấu hiệu việc làm CTV yêu cầu nạp tiền' }],
      advice: ['Không chuyển tiền trước khi xác minh.'],
      clarificationQuestions: [
        {
          questionCode: 'deposit_for_job',
          questionText: 'Bạn có phải nạp/chuyển tiền trước để được nhận việc hoặc rút tiền công?',
        },
      ],
    });

    assert.equal(check.scamType, 'Chưa xác định');
    assert.equal(check.analysisSource, 'llm');
    assert.equal(check.userFeedback, null);
    assert.equal(check.clarificationQuestions[0].answer, null);
    assert.equal(check.clarificationQuestions[0].scoreDelta, 0);

    await assert.rejects(
      () =>
        ScamCheck.create({
          requesterId,
          targetUserId,
          conversationId: 'c1',
          initialScore: 101,
          finalScore: 50,
          riskLevel: 'high',
        }),
      (err) => err.name === 'ValidationError'
    );

    await assert.rejects(
      () =>
        ScamCheck.create({
          requesterId,
          targetUserId,
          conversationId: 'c1',
          initialScore: -1,
          finalScore: 0,
          riskLevel: 'low',
        }),
      (err) => err.name === 'ValidationError'
    );
  });
});
