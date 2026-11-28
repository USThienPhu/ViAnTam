const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const express = require('express');
const request = require('supertest');

const { uploadImage, detectImageExt, MAX_FILE_SIZE } = require('../src/middlewares/upload');

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(32)]);

const app = express();
app.post('/upload', ...uploadImage, (req, res) => {
  res.json({ ext: req.file.detectedExt, size: req.file.size });
});
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => res.status(500).json({ message: err.message }));

describe('detectImageExt', () => {
  test('nhận diện png, jpg, webp', () => {
    assert.equal(detectImageExt(PNG), 'png');
    assert.equal(detectImageExt(JPG), 'jpg');
    assert.equal(detectImageExt(WEBP), 'webp');
  });
  test('trả null với nội dung khác hoặc quá ngắn', () => {
    assert.equal(detectImageExt(Buffer.from('hello world, not an image')), null);
    assert.equal(detectImageExt(Buffer.alloc(4)), null);
  });
});

describe('upload middleware', () => {
  test('ảnh hợp lệ đi qua và có đuôi đúng', async () => {
    const res = await request(app).post('/upload').attach('image', PNG, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(res.status, 200);
    assert.equal(res.body.ext, 'png');
  });

  test('ảnh webp và jpeg được chấp nhận', async () => {
    const w = await request(app).post('/upload').attach('image', WEBP, { filename: 'a.webp', contentType: 'image/webp' });
    const j = await request(app).post('/upload').attach('image', JPG, { filename: 'a.jpg', contentType: 'image/jpeg' });
    assert.equal(w.body.ext, 'webp');
    assert.equal(j.body.ext, 'jpg');
  });

  test('file text bị 400', async () => {
    const res = await request(app).post('/upload').attach('image', Buffer.from('abc'), { filename: 'a.txt', contentType: 'text/plain' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'UNSUPPORTED_FILE_TYPE');
  });

  test('file giả mimetype (nội dung không phải ảnh) bị 400', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('image', Buffer.from('<?php echo 1; ?> khong phai anh'), { filename: 'a.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'UNSUPPORTED_FILE_TYPE');
  });

  test('file quá 5MB bị 400', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_FILE_SIZE)]);
    const res = await request(app).post('/upload').attach('image', big, { filename: 'big.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'FILE_TOO_LARGE');
    assert.equal(res.body.message, 'Ảnh quá lớn. Dung lượng tối đa là 5MB.');
  });

  test('thiếu file bị 400', async () => {
    const res = await request(app).post('/upload').field('x', '1');
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'NO_FILE');
  });

  test('sai tên field bị 400', async () => {
    const res = await request(app).post('/upload').attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_UPLOAD');
  });
});
