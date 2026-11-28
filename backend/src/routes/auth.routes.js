const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../models/User');
const { authMiddleware, signToken } = require('../middlewares/auth');

// auth.routes được mount tại /api: /api/auth/register, /api/auth/login, /api/auth/me, /api/users

const router = express.Router();

const BCRYPT_COST = 10;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/;
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_BYTES = 72; // bcrypt chỉ dùng tối đa 72 byte đầu của mật khẩu

// Hash giả để login tốn thời gian tương đương dù username không tồn tại.
const DUMMY_HASH = bcrypt.hashSync('khong-ton-tai', BCRYPT_COST);

function isValidUsername(value) {
  return typeof value === 'string' && USERNAME_PATTERN.test(value.trim());
}

function isValidPassword(value) {
  return (
    typeof value === 'string' &&
    value.length >= PASSWORD_MIN_LENGTH &&
    Buffer.byteLength(value, 'utf8') <= PASSWORD_MAX_BYTES
  );
}

router.post('/auth/register', async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};

    if (!isValidUsername(username) || !isValidPassword(password)) {
      return res.status(400).json({
        message: 'Tên đăng nhập hoặc mật khẩu không hợp lệ.',
        code: 'INVALID_INPUT',
      });
    }

    const cleanUsername = username.trim();
    const taken = await User.exists({ usernameLower: cleanUsername.toLowerCase() });
    if (taken) {
      return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại.', code: 'USERNAME_TAKEN' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    let user;
    try {
      user = await User.create({ username: cleanUsername, passwordHash });
    } catch (err) {
      // Hai yêu cầu đăng ký trùng tên gửi gần như cùng lúc: index unique sẽ chặn yêu cầu sau.
      if (err.code === 11000) {
        return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại.', code: 'USERNAME_TAKEN' });
      }
      throw err;
    }

    return res.status(201).json({
      token: signToken(user),
      user: { id: String(user._id), username: user.username, role: user.role },
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};
    const invalidCredentials = () =>
      res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu.', code: 'INVALID_CREDENTIALS' });

    // Chỉ nhận chuỗi để không bị truyền object kiểu { "$ne": null } vào truy vấn MongoDB.
    if (typeof username !== 'string' || typeof password !== 'string') {
      return invalidCredentials();
    }

    const user = await User.findOne({ usernameLower: username.trim().toLowerCase() }).select(
      '+passwordHash'
    );
    const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

    if (!user || !passwordOk) {
      return invalidCredentials();
    }

    return res.status(200).json({
      token: signToken(user),
      user: {
        id: String(user._id),
        username: user.username,
        role: user.role,
        isFlagged: user.isFlagged,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/auth/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(401)
        .json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.', code: 'UNAUTHORIZED' });
    }

    return res.status(200).json({
      id: String(user._id),
      username: user.username,
      role: user.role,
      isFlagged: user.isFlagged,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/users', authMiddleware, async (req, res, next) => {
  try {
    const me = new mongoose.Types.ObjectId(req.user.id);

    const users = await User.find({ _id: { $ne: me }, isSimulatorBot: { $ne: true } })
      .sort({ username: 1 })
      .lean();

    // Model Block thuộc TV3 nên đọc trực tiếp collection "blocks" (blockerId, blockedId).
    // Khi Block.js có trong nhánh chính, thay bằng Block.find(...).
    const blocks = await mongoose.connection
      .collection('blocks')
      .find({ $or: [{ blockerId: me }, { blockedId: me }] })
      .project({ blockerId: 1, blockedId: 1 })
      .toArray();

    const blockedByMe = new Set();
    const blockedMe = new Set();
    for (const block of blocks) {
      if (String(block.blockerId) === req.user.id) blockedByMe.add(String(block.blockedId));
      if (String(block.blockedId) === req.user.id) blockedMe.add(String(block.blockerId));
    }

    return res.status(200).json(
      users.map((u) => ({
        id: String(u._id),
        username: u.username,
        reportCount: u.reportCount,
        isFlagged: u.isFlagged,
        isBlockedByMe: blockedByMe.has(String(u._id)),
        hasBlockedMe: blockedMe.has(String(u._id)),
      }))
    );
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
