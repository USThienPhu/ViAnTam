const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/khong-dung-trong-test';
process.env.JWT_SECRET = 'test-secret-chi-dung-cho-test';

const mongoose = require('mongoose');
const request = require('supertest');
const { io: connect } = require('socket.io-client');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { app, server, io } = require('../src/app');
const Block = require('../src/models/Block');

const UPLOAD_DIR = path.resolve(__dirname, '../uploads');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

let mongod;
let url;
const sockets = [];
const createdFiles = [];

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'aegisai_test_chat_e2e' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  sockets.forEach((s) => s.disconnect());
  for (const file of createdFiles) fs.rmSync(path.join(UPLOAD_DIR, file), { force: true });
  io.close();
  await mongoose.disconnect();
  await mongod.stop();
});

const register = async (username) => (await request(app).post('/api/auth/register').send({ username, password: 'password123' })).body;

function open(token) {
  const socket = connect(url, { auth: { token }, transports: ['websocket'], reconnection: false });
  sockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

const once = (socket, event) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Quá thời gian chờ "${event}"`)), 2000);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

describe('Luồng chat 1-1 từ đầu đến cuối (TC-01, TC-05 phía server)', () => {
  test('đăng nhập, upload ảnh, gửi tin text + ảnh, đọc lại lịch sử, chặn/bỏ chặn', async () => {
    const a = await register('demo_user');
    const b = await register('ChuTro_AnhMinh');
    const sa = await open(a.token);
    const sb = await open(b.token);

    // 1. Tin text realtime
    const textToB = once(sb, 'receive_message');
    sa.emit('send_message', { receiverId: b.user.id, type: 'text', content: 'Chào anh, xem https://example.com giúp em' });
    const text = await textToB;
    assert.deepEqual(text.extractedLinks, ['https://example.com']);

    // 2. Upload ảnh rồi gửi tin ảnh
    const up = await request(app)
      .post('/api/messages/upload')
      .set('Authorization', `Bearer ${a.token}`)
      .attach('image', PNG, { filename: 'qr.png', contentType: 'image/png' });
    assert.equal(up.status, 200);
    createdFiles.push(path.basename(up.body.imageUrl));
    assert.equal((await request(app).get(up.body.imageUrl)).status, 200);

    const imageToB = once(sb, 'receive_message');
    sa.emit('send_message', { receiverId: b.user.id, type: 'image', imageUrl: up.body.imageUrl, qrData: up.body.qrData });
    const image = await imageToB;
    assert.equal(image.imageUrl, up.body.imageUrl);

    // 3. Đối phương trả lời, người gửi nhận được
    const replyToA = once(sa, 'receive_message');
    sb.emit('send_message', { receiverId: a.user.id, content: 'Ok em' });
    assert.equal((await replyToA).content, 'Ok em');

    // 4. Lịch sử đọc từ cả hai phía có đủ 3 tin theo thứ tự
    for (const [me, other] of [[a, b], [b, a]]) {
      const history = await request(app).get(`/api/messages/${other.user.id}`).set('Authorization', `Bearer ${me.token}`);
      assert.deepEqual(history.body.map((m) => m.content), ['Chào anh, xem https://example.com giúp em', '', 'Ok em']);
    }

    // 5. Chặn: server từ chối cả hai chiều
    await Block.create({ blockerId: a.user.id, blockedId: b.user.id });
    const errB = once(sb, 'message_error');
    sb.emit('send_message', { receiverId: a.user.id, content: 'còn đó không' });
    assert.equal((await errB).code, 'CONVERSATION_BLOCKED');
    const errA = once(sa, 'message_error');
    sa.emit('send_message', { receiverId: b.user.id, content: 'tôi chặn rồi' });
    assert.equal((await errA).code, 'CONVERSATION_BLOCKED');

    // 6. Bỏ chặn: gửi lại được, lịch sử không có tin bị từ chối
    await Block.deleteMany({});
    const again = once(sa, 'receive_message');
    sb.emit('send_message', { receiverId: a.user.id, content: 'giờ được rồi' });
    assert.equal((await again).content, 'giờ được rồi');
    const final = await request(app).get(`/api/messages/${b.user.id}`).set('Authorization', `Bearer ${a.token}`);
    assert.equal(final.body.length, 4);
  });
});
