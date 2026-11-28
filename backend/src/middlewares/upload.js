const multer = require('multer');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const UNSUPPORTED_MESSAGE = 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      const err = new Error(UNSUPPORTED_MESSAGE);
      err.code = 'UNSUPPORTED_FILE_TYPE';
      return cb(err);
    }
    return cb(null, true);
  },
});

// Nhận dạng định dạng thật từ vài byte đầu, không tin Content-Type do client khai báo.
function detectImageExt(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

function badRequest(res, message, code) {
  return res.status(400).json({ message, code });
}

// Dùng: router.post('/upload', authMiddleware, ...uploadImage, handler)
// Sau khi qua, req.file.buffer là ảnh hợp lệ và req.file.detectedExt là đuôi file thật.
function receiveImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return badRequest(res, 'Ảnh quá lớn. Dung lượng tối đa là 5MB.', 'FILE_TOO_LARGE');
      }
      return badRequest(res, 'Dữ liệu tải lên không hợp lệ.', 'INVALID_UPLOAD');
    }
    if (err.code === 'UNSUPPORTED_FILE_TYPE') {
      return badRequest(res, UNSUPPORTED_MESSAGE, 'UNSUPPORTED_FILE_TYPE');
    }
    return next(err);
  });
}

function verifyImageContent(req, res, next) {
  if (!req.file) {
    return badRequest(res, 'Vui lòng chọn một ảnh để tải lên.', 'NO_FILE');
  }
  const ext = detectImageExt(req.file.buffer);
  if (!ext) {
    return badRequest(res, UNSUPPORTED_MESSAGE, 'UNSUPPORTED_FILE_TYPE');
  }
  req.file.detectedExt = ext;
  return next();
}

const uploadImage = [receiveImage, verifyImageContent];

module.exports = { uploadImage, detectImageExt, MAX_FILE_SIZE, ALLOWED_MIME };
