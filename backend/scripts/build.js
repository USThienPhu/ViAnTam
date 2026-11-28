// Backend là Node.js thuần (CommonJS) nên "build" chỉ sao chép src/ sang dist/.
// Giữ nguyên cấu trúc thư mục để đường dẫn tới .env và uploads/ vẫn đúng khi chạy dist/main.js.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(src, dist, { recursive: true });

console.log(`[build] Đã sao chép ${path.relative(root, src)}/ -> ${path.relative(root, dist)}/`);
