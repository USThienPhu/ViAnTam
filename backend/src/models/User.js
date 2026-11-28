const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true, trim: true, minlength: 3, maxlength: 30 },
    // Bản chữ thường của username, dùng để chống tạo tài khoản trùng tên chỉ khác hoa/thường
    // (ví dụ "Admin" và "admin"). Tự sinh từ username, không nhận từ client.
    usernameLower: { type: String, unique: true, required: true, select: false },
    passwordHash: { type: String, required: true, select: false }, // mặc định ẩn khi query
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    reportCount: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false }, // true khi reportCount >= 3 hoặc Admin gắn cờ
    isSimulatorBot: { type: Boolean, default: false }, // chừa sẵn cho Practice Mode
  },
  { timestamps: true }
);

userSchema.pre('validate', function () {
  if (typeof this.username === 'string') {
    this.usernameLower = this.username.trim().toLowerCase();
  }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
