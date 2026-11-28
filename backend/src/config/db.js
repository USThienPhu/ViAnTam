const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

async function connectDB() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`[db] Đã kết nối MongoDB (database: ${mongoose.connection.name})`);
}

module.exports = connectDB;
