const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const env = require('./config/env');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const scamCheckRoutes = require('./routes/scamCheck.routes');
const safetyRoutes = require('./routes/safety.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.CLIENT_URL, methods: ['GET', 'POST'] },
});

// Cho các route (ví dụ safety.routes) lấy io qua req.app.get('io') để emit sự kiện.
app.set('io', io);

app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({ status: 'ok', db: dbConnected ? 'connected' : 'disconnected' });
});

// auth.routes định nghĩa /auth/* và /users; safety.routes định nghĩa /reports và /blocks.
app.use('/api', authRoutes);
app.use('/api/messages', chatRoutes);
app.use('/api/scam-check', scamCheckRoutes);
app.use('/api', safetyRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Không tìm thấy đường dẫn yêu cầu.', code: 'NOT_FOUND' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Dữ liệu gửi lên không đúng định dạng JSON.', code: 'INVALID_JSON' });
  }
  console.error('[error]', err);
  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' : err.message,
    code: err.code || 'INTERNAL_ERROR',
  });
});

async function start() {
  try {
    await connectDB();
    server.listen(env.PORT, () => {
      console.log(`[server] Đang chạy tại http://localhost:${env.PORT}`);
    });
  } catch (err) {
    console.error('[server] Không thể khởi động:', err.message);
    process.exit(1);
  }
}

// Chỉ khởi động khi chạy trực tiếp (npm run dev / start). Khi test import file này thì không tự kết nối DB.
if (require.main === module) {
  start();
}

module.exports = { app, server, io, start };
