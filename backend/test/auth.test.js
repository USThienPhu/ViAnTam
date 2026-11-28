const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Đặt biến môi trường TRƯỚC khi nạp app. dotenv không ghi đè biến đã có,
// nên test không bao giờ dùng MONGODB_URI thật của Atlas trong backend/.env.
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/khong-dung-trong-test';
process.env.JWT_SECRET = 'test-secret-chi-dung-cho-test';

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { app, io } = require('../src/app');
const User = require('../src/models/User');
const { adminOnly } = require('../src/middlewares/auth');

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'aegisai_test' });
  await User.init(); // đảm bảo index unique đã được tạo trước khi test
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  io.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await mongoose.connection.collection('blocks').deleteMany({});
});

async function register(username = 'nguyen_van_a', password = 'password123') {
  return request(app).post('/api/auth/register').send({ username, password });
}

describe('GET /api/health', () => {
  test('trả 200 và trạng thái kết nối DB', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok', db: 'connected' });
  });
});

describe('POST /api/auth/register', () => {
  test('đăng ký thành công trả 201, token và user (không lộ passwordHash)', async () => {
    const res = await register();
    assert.equal(res.status, 201);
    assert.equal(typeof res.body.token, 'string');
    assert.equal(res.body.user.username, 'nguyen_van_a');
    assert.equal(res.body.user.role, 'user');
    assert.ok(res.body.user.id);
    assert.equal(JSON.stringify(res.body).includes('passwordHash'), false);
  });

  test('mật khẩu được băm, không lưu dạng thô', async () => {
    await register('nguyen_van_a', 'password123');
    const saved = await User.findOne({ username: 'nguyen_van_a' }).select('+passwordHash');
    assert.notEqual(saved.passwordHash, 'password123');
    assert.match(saved.passwordHash, /^\$2[aby]\$/);
  });

  test('token chứa id, username, role và hết hạn sau 7 ngày', async () => {
    const res = await register();
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    assert.equal(payload.id, res.body.user.id);
    assert.equal(payload.username, 'nguyen_van_a');
    assert.equal(payload.role, 'user');
    assert.equal(payload.exp - payload.iat, 7 * 24 * 60 * 60);
  });

  test('user mới luôn có role "user" dù client gửi role admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ke_gian', password: 'password123', role: 'admin', isFlagged: true });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'user');
    const saved = await User.findOne({ username: 'ke_gian' });
    assert.equal(saved.role, 'user');
    assert.equal(saved.isFlagged, false);
  });

  const invalidCases = [
    ['username quá ngắn', { username: 'ab', password: 'password123' }],
    ['username quá dài', { username: 'a'.repeat(31), password: 'password123' }],
    ['username có ký tự đặc biệt', { username: 'nguyen van a!', password: 'password123' }],
    ['username có dấu tiếng Việt', { username: 'nguyễn_a', password: 'password123' }],
    ['mật khẩu dưới 6 ký tự', { username: 'nguyen_van_a', password: '12345' }],
    ['mật khẩu quá 72 byte', { username: 'nguyen_van_a', password: 'a'.repeat(73) }],
    ['thiếu username', { password: 'password123' }],
    ['thiếu password', { username: 'nguyen_van_a' }],
    ['username là object', { username: { $ne: null }, password: 'password123' }],
    ['password là số', { username: 'nguyen_van_a', password: 123456 }],
  ];
  for (const [name, body] of invalidCases) {
    test(`từ chối ${name} bằng 400`, async () => {
      const res = await request(app).post('/api/auth/register').send(body);
      assert.equal(res.status, 400);
      assert.equal(res.body.message, 'Tên đăng nhập hoặc mật khẩu không hợp lệ.');
    });
  }

  test('không gửi body vẫn trả 400, không làm sập server', async () => {
    const res = await request(app).post('/api/auth/register');
    assert.equal(res.status, 400);
  });

  test('JSON sai cú pháp trả 400 với thông báo tiếng Việt', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"username": ');
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_JSON');
  });

  test('trùng username trả 409', async () => {
    await register();
    const res = await register();
    assert.equal(res.status, 409);
    assert.equal(res.body.message, 'Tên đăng nhập đã tồn tại.');
  });

  test('trùng username chỉ khác hoa/thường vẫn trả 409', async () => {
    await register('HoTro_MoMo_247');
    const res = await register('hotro_momo_247');
    assert.equal(res.status, 409);
  });

  test('giữ nguyên cách viết hoa/thường khi lưu và trả về', async () => {
    const res = await register('HoTro_MoMo_247');
    assert.equal(res.body.user.username, 'HoTro_MoMo_247');
  });

  test('hai yêu cầu đăng ký trùng tên cùng lúc: một thành công, một 409', async () => {
    const results = await Promise.all([register('dong_thoi'), register('dong_thoi')]);
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409]);
    assert.equal(await User.countDocuments({ usernameLower: 'dong_thoi' }), 1);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register('HoTro_MoMo_247', 'password123');
  });

  test('đăng nhập đúng trả 200, token và user có isFlagged', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'HoTro_MoMo_247', password: 'password123' });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.token, 'string');
    assert.deepEqual(
      { ...res.body.user, id: undefined },
      { id: undefined, username: 'HoTro_MoMo_247', role: 'user', isFlagged: false }
    );
    assert.equal(JSON.stringify(res.body).includes('passwordHash'), false);
  });

  test('đăng nhập không phân biệt hoa/thường ở username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'hotro_momo_247', password: 'password123' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.username, 'HoTro_MoMo_247');
  });

  test('mật khẩu vẫn phân biệt hoa/thường', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'HoTro_MoMo_247', password: 'PASSWORD123' });
    assert.equal(res.status, 401);
  });

  test('sai mật khẩu và sai username trả cùng một thông báo 401', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ username: 'HoTro_MoMo_247', password: 'sai_mat_khau' });
    const wrongUser = await request(app)
      .post('/api/auth/login')
      .send({ username: 'khong_ton_tai', password: 'password123' });
    assert.equal(wrongPassword.status, 401);
    assert.equal(wrongUser.status, 401);
    assert.equal(wrongPassword.body.message, 'Sai tên đăng nhập hoặc mật khẩu.');
    assert.deepEqual(wrongUser.body, wrongPassword.body);
  });

  test('chặn NoSQL injection: username/password là object', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: { $ne: null }, password: { $ne: null } });
    assert.equal(res.status, 401);
  });

  test('thiếu thông tin trả 401, không làm sập server', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    assert.equal(res.status, 401);
  });
});

describe('GET /api/auth/me', () => {
  test('có token hợp lệ trả 200 với thông tin người dùng', async () => {
    const { body } = await register();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      id: body.user.id,
      username: 'nguyen_van_a',
      role: 'user',
      isFlagged: false,
    });
  });

  test('không có header Authorization trả 401', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('sai định dạng Authorization trả 401', async () => {
    const { body } = await register();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Token ${body.token}`);
    assert.equal(res.status, 401);
  });

  test('token rác trả 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    assert.equal(res.status, 401);
  });

  test('token ký bằng secret khác trả 401', async () => {
    const { body } = await register();
    const forged = jwt.sign({ id: body.user.id, username: 'x', role: 'admin' }, 'secret-khac');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    assert.equal(res.status, 401);
  });

  test('token đã hết hạn trả 401', async () => {
    const { body } = await register();
    const expired = jwt.sign(
      { id: body.user.id, username: 'nguyen_van_a', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: -10 }
    );
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    assert.equal(res.status, 401);
  });

  test('token hợp lệ nhưng user đã bị xóa trả 401', async () => {
    const { body } = await register();
    await User.deleteOne({ username: 'nguyen_van_a' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);
    assert.equal(res.status, 401);
  });
});

describe('adminOnly', () => {
  function run(user) {
    const req = { user };
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    let nextCalled = false;
    adminOnly(req, res, () => {
      nextCalled = true;
    });
    return { res, nextCalled };
  }

  test('admin được đi tiếp', () => {
    const { res, nextCalled } = run({ id: '1', username: 'admin', role: 'admin' });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, null);
  });

  test('user thường bị 403', () => {
    const { res, nextCalled } = run({ id: '2', username: 'u', role: 'user' });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, 'Bạn không có quyền truy cập.');
  });

  test('chưa có req.user bị 403', () => {
    const { res, nextCalled } = run(undefined);
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });
});

describe('GET /api/users', () => {
  test('chưa đăng nhập trả 401', async () => {
    const res = await request(app).get('/api/users');
    assert.equal(res.status, 401);
  });

  test('trả danh sách user khác, không có mình, bot mô phỏng và passwordHash', async () => {
    const me = await register('demo_user');
    await register('HoTro_MoMo_247');
    await register('ChuTro_AnhMinh');
    await User.create({ username: 'Bot_MoPhong', passwordHash: 'x', isSimulatorBot: true });

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${me.body.token}`);
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.map((u) => u.username),
      ['ChuTro_AnhMinh', 'HoTro_MoMo_247']
    );
    const raw = JSON.stringify(res.body);
    assert.equal(raw.includes('passwordHash'), false);
    assert.equal(raw.includes('usernameLower'), false);
    for (const u of res.body) {
      assert.deepEqual(Object.keys(u).sort(), [
        'hasBlockedMe',
        'id',
        'isBlockedByMe',
        'isFlagged',
        'reportCount',
        'username',
      ]);
    }
  });

  test('trả reportCount và isFlagged của đối phương', async () => {
    const me = await register('demo_user');
    await User.create({
      username: 'HoTro_MoMo_247',
      passwordHash: 'x',
      reportCount: 4,
      isFlagged: true,
    });
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${me.body.token}`);
    assert.equal(res.body[0].reportCount, 4);
    assert.equal(res.body[0].isFlagged, true);
  });

  test('gắn đúng cờ isBlockedByMe và hasBlockedMe theo collection blocks', async () => {
    const me = await register('demo_user');
    const a = await register('nguoi_toi_chan');
    const b = await register('nguoi_chan_toi');
    const c = await register('nguoi_binh_thuong');
    const oid = (r) => new mongoose.Types.ObjectId(r.body.user.id);

    await mongoose.connection.collection('blocks').insertMany([
      { blockerId: oid(me), blockedId: oid(a) },
      { blockerId: oid(b), blockedId: oid(me) },
      // Chặn nhau giữa hai người khác không được ảnh hưởng đến mình.
      { blockerId: oid(a), blockedId: oid(c) },
    ]);

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${me.body.token}`);
    const byName = Object.fromEntries(res.body.map((u) => [u.username, u]));

    assert.equal(byName.nguoi_toi_chan.isBlockedByMe, true);
    assert.equal(byName.nguoi_toi_chan.hasBlockedMe, false);
    assert.equal(byName.nguoi_chan_toi.isBlockedByMe, false);
    assert.equal(byName.nguoi_chan_toi.hasBlockedMe, true);
    assert.equal(byName.nguoi_binh_thuong.isBlockedByMe, false);
    assert.equal(byName.nguoi_binh_thuong.hasBlockedMe, false);
  });

  test('chưa có ai chặn thì cả hai cờ đều false', async () => {
    const me = await register('demo_user');
    await register('nguoi_khac');
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${me.body.token}`);
    assert.equal(res.body[0].isBlockedByMe, false);
    assert.equal(res.body[0].hasBlockedMe, false);
  });
});

describe('Đường dẫn không tồn tại', () => {
  test('trả 404 với định dạng lỗi thống nhất', async () => {
    const res = await request(app).get('/api/khong-co');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'NOT_FOUND');
  });
});
