const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

const TOKEN_EXPIRES_IN = '7d';

function signToken(user) {
  return jwt.sign(
    { id: String(user._id || user.id), username: user.username, role: user.role },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: TOKEN_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
}

function unauthorized(res, message = 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.') {
  return res.status(401).json({ message, code: 'UNAUTHORIZED' });
}

// Đọc "Authorization: Bearer <token>", gắn req.user = { id, username, role }.
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return unauthorized(res, 'Bạn cần đăng nhập để tiếp tục.');
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, username: payload.username, role: payload.role };
    return next();
  } catch (err) {
    return unauthorized(res);
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền truy cập.', code: 'FORBIDDEN' });
  }
  return next();
}

module.exports = { authMiddleware, adminOnly, signToken, verifyToken };
