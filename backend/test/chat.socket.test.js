const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/khong-dung-trong-test';
process.env.JWT_SECRET = 'test-secret-chi-dung-cho-test';

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { io: connect } = require('socket.io-client');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { server, io } = require('../src/app');
const User = require('../src/models/User');
const Block = require('../src/models/Block');
const Message = require('../src/models/Message');
const { signToken } = require('../src/middlewares/auth');

let mongod;
let url;
let alice;
let bob;
let clients = [];

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'aegisai_test_socket' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  io.close();
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Block.deleteMany({}), Message.deleteMany({})]);
  alice = await User.create({ username: 'alice', passwordHash: 'x' });
  bob = await User.create({ username: 'bob', passwordHash: 'x' });
});

afterEach(() => {
  clients.forEach((c) => c.disconnect());
  clients = [];
});

function open(token) {
  const socket = connect(url, { auth: token === undefined ? {} : { token }, transports: ['websocket'], reconnection: false });
  clients.push(socket);
  return socket;
}

function connected(socket) {
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function once(socket, event, ms = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Quá thời gian chờ "${event}"`)), ms);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

const noEvent = (socket, event, ms = 300) =>
  new Promise((resolve, reject) => {
    const handler = () => reject(new Error(`Không được nhận "${event}"`));
    socket.once(event, handler);
    setTimeout(() => {
      socket.off(event, handler);
      resolve();
    }, ms);
  });

describe('Socket handshake', () => {
  test('thiếu token bị từ chối', async () => {
    await assert.rejects(connected(open()), /đăng nhập/);
  });

  test('token rác bị từ chối', async () => {
    await assert.rejects(connected(open('abc.def.ghi')), /không hợp lệ/);
  });

  test('token ký bằng secret khác bị từ chối', async () => {
    const forged = jwt.sign({ id: String(alice._id), username: 'alice', role: 'user' }, 'secret-khac');
    await assert.rejects(connected(open(forged)), /không hợp lệ/);
  });

  test('token hết hạn bị từ chối', async () => {
    const expired = jwt.sign({ id: String(alice._id), username: 'alice', role: 'user' }, process.env.JWT_SECRET, { expiresIn: -10 });
    await assert.rejects(connected(open(expired)), /không hợp lệ/);
  });

  test('token hợp lệ nhưng user đã bị xóa bị từ chối', async () => {
    const token = signToken(alice);
    await User.deleteOne({ _id: alice._id });
    await assert.rejects(connected(open(token)), /không hợp lệ/);
  });

  test('token hợp lệ kết nối được', async () => {
    const socket = await connected(open(signToken(alice)));
    assert.equal(socket.connected, true);
  });
});

describe('send_message', () => {
  async function pair() {
    const a = await connected(open(signToken(alice)));
    const b = await connected(open(signToken(bob)));
    return { a, b };
  }

  test('hai client gửi/nhận realtime và tin được lưu', async () => {
    const { a, b } = await pair();
    const toB = once(b, 'receive_message');
    const toA = once(a, 'receive_message');
    a.emit('send_message', { receiverId: String(bob._id), type: 'text', content: 'xin chào' });

    const [msgB, msgA] = await Promise.all([toB, toA]);
    assert.equal(msgB.content, 'xin chào');
    assert.equal(msgB.senderId, String(alice._id));
    assert.equal(msgA._id, msgB._id);
    assert.equal(await Message.countDocuments(), 1);
  });

  test('người gửi không bị giả mạo senderId từ payload', async () => {
    const { a, b } = await pair();
    const toB = once(b, 'receive_message');
    a.emit('send_message', { receiverId: String(bob._id), senderId: String(bob._id), content: 'giả mạo' });
    const msg = await toB;
    assert.equal(msg.senderId, String(alice._id));
  });

  test('tin ảnh được gửi kèm imageUrl', async () => {
    const { a, b } = await pair();
    const toB = once(b, 'receive_message');
    a.emit('send_message', { receiverId: String(bob._id), type: 'image', imageUrl: '/uploads/1-qr.png', qrData: { isVietQR: false } });
    const msg = await toB;
    assert.equal(msg.type, 'image');
    assert.equal(msg.imageUrl, '/uploads/1-qr.png');
  });

  test('bị chặn thì nhận message_error và không lưu tin', async () => {
    await Block.create({ blockerId: bob._id, blockedId: alice._id });
    const { a, b } = await pair();
    const err = once(a, 'message_error');
    const none = noEvent(b, 'receive_message');
    a.emit('send_message', { receiverId: String(bob._id), content: 'hi' });
    assert.equal((await err).message, 'Không thể gửi tin nhắn vì cuộc trò chuyện đã bị chặn.');
    await none;
    assert.equal(await Message.countDocuments(), 0);
  });

  test('bỏ chặn xong gửi lại được', async () => {
    await Block.create({ blockerId: bob._id, blockedId: alice._id });
    const { a, b } = await pair();
    const err = once(a, 'message_error');
    a.emit('send_message', { receiverId: String(bob._id), content: 'lần 1' });
    await err;

    await Block.deleteMany({});
    const toB = once(b, 'receive_message');
    a.emit('send_message', { receiverId: String(bob._id), content: 'lần 2' });
    assert.equal((await toB).content, 'lần 2');
  });

  test('payload sai thì nhận message_error', async () => {
    const { a } = await pair();
    for (const payload of [null, 'text', { receiverId: 'abc', content: 'x' }, { receiverId: String(bob._id), content: '' }]) {
      const err = once(a, 'message_error');
      a.emit('send_message', payload);
      assert.ok((await err).message);
    }
    assert.equal(await Message.countDocuments(), 0);
  });

  test('người thứ ba không nhận tin của cuộc trò chuyện khác', async () => {
    const carol = await User.create({ username: 'carol', passwordHash: 'x' });
    const { a, b } = await pair();
    const c = await connected(open(signToken(carol)));
    const none = noEvent(c, 'receive_message');
    const toB = once(b, 'receive_message');
    a.emit('send_message', { receiverId: String(bob._id), content: 'riêng tư' });
    await toB;
    await none;
  });
});
