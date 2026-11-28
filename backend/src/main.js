// Entry chạy production: `npm run build` sao chép src/ sang dist/, rồi `pm2 start dist/main.js`.
const { start } = require('./app');

start();
