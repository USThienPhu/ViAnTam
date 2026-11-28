const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeUrl,
  normalizeLookalike,
  levenshteinDistance,
  analyzeLink,
  analyzeLinks,
  checkSafeBrowsing,
  clearSafeBrowsingCache,
} = require('../src/services/linkAnalyzer.service');

const NO_SB = { apiKey: '' };

function fakeFetch(responseFactory) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return responseFactory();
  };
  return { fetchImpl, calls };
}

beforeEach(() => clearSafeBrowsingCache());

describe('normalizeUrl', () => {
  test('bỏ khoảng trắng, dấu câu cuối, hạ chữ thường scheme + host, bỏ / cuối', () => {
    assert.equal(normalizeUrl('  HTTP://M0MO-XacMinh.XYZ/, '), 'http://m0mo-xacminh.xyz');
    assert.equal(normalizeUrl('https://Shopee.vn/Path/ABC/'), 'https://shopee.vn/Path/ABC');
  });
});

describe('normalizeLookalike', () => {
  test('đổi ký tự dễ nhầm', () => {
    assert.equal(normalizeLookalike('M0M0'), 'momo');
    assert.equal(normalizeLookalike('vietcornbank'), 'vietcombank');
    assert.equal(normalizeLookalike('5h0pee'), 'shopee');
  });
});

describe('levenshteinDistance', () => {
  test('tính đúng khoảng cách', () => {
    assert.equal(levenshteinDistance('momo', 'memo'), 1);
    assert.equal(levenshteinDistance('', 'abc'), 3);
    assert.equal(levenshteinDistance('bidv', 'bidv'), 0);
  });
});

describe('analyzeLink', () => {
  test('m0mo-xacminh.xyz bị gắn suspicious_tld và typosquatting', async () => {
    const r = await analyzeLink('http://m0mo-xacminh.xyz', NO_SB);
    assert.deepEqual(r, {
      url: 'http://m0mo-xacminh.xyz',
      flags: ['suspicious_tld', 'typosquatting'],
      safe_browsing_flagged: false,
    });
  });

  test('tên miền chính chủ và tên miền ngắn không liên quan không bị gắn cờ', async () => {
    for (const url of [
      'https://momo.vn',
      'https://www.vietcombank.com.vn/abc',
      'https://dichvucong.gov.vn/p/home',
      'https://shop.com',
    ]) {
      const r = await analyzeLink(url, NO_SB);
      assert.deepEqual(r.flags, [], url);
    }
  });

  test('tên miền ngân hàng thật gần giống brand không bị gắn typosquatting', async () => {
    for (const url of [
      'https://vpbank.com.vn',
      'https://tpbank.vn',
      'https://hdbank.com.vn',
      'https://abbank.vn',
      'https://lpbank.com.vn',
    ]) {
      const r = await analyzeLink(url, NO_SB);
      assert.deepEqual(r.flags, [], url);
    }
  });

  test('brand + từ khóa đăng nhập trên đuôi rủi ro', async () => {
    const r = await analyzeLink('http://vietcombank-login.top', NO_SB);
    assert.deepEqual(r.flags, ['suspicious_tld', 'typosquatting']);
  });

  test('link IP, link rút gọn, link .apk', async () => {
    assert.deepEqual((await analyzeLink('http://123.45.67.89/login', NO_SB)).flags, ['has_ip_host']);
    assert.deepEqual((await analyzeLink('https://bit.ly/abc', NO_SB)).flags, ['shortened_url']);
    assert.deepEqual((await analyzeLink('http://abc.com/vneid.APK', NO_SB)).flags, ['apk_download']);
  });

  test('chuỗi hỏng không ném lỗi, trả flags rỗng', async () => {
    for (const url of ['http://', 'khong phai link', '']) {
      const r = await analyzeLink(url, NO_SB);
      assert.deepEqual(r.flags, [], JSON.stringify(url));
      assert.equal(r.safe_browsing_flagged, false);
    }
  });
});

describe('analyzeLinks', () => {
  test('bỏ trùng sau khi normalize', async () => {
    const r = await analyzeLinks(['http://A.com/', 'http://a.com'], NO_SB);
    assert.equal(r.length, 1);
    assert.equal(r[0].url, 'http://a.com');
  });
});

describe('checkSafeBrowsing', () => {
  test('không có key thì trả false và không gọi mạng', async () => {
    const { fetchImpl, calls } = fakeFetch(() => ({ ok: true, json: async () => ({}) }));
    assert.equal(await checkSafeBrowsing('http://x.com', { fetchImpl, apiKey: '' }), false);
    assert.equal(calls.length, 0);
  });

  test('có match thì true, lần gọi sau dùng cache', async () => {
    const { fetchImpl, calls } = fakeFetch(() => ({
      ok: true,
      json: async () => ({ matches: [{ threatType: 'SOCIAL_ENGINEERING' }] }),
    }));
    assert.equal(await checkSafeBrowsing('http://bad.com', { fetchImpl, apiKey: 'k' }), true);
    assert.equal(await checkSafeBrowsing('http://bad.com', { fetchImpl, apiKey: 'k' }), true);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /threatMatches:find\?key=k$/);
    assert.equal(JSON.parse(calls[0].init.body).threatInfo.threatEntries[0].url, 'http://bad.com');
  });

  test('lỗi mạng hoặc HTTP lỗi thì trả false', async () => {
    const throwing = async () => {
      throw new Error('timeout');
    };
    assert.equal(await checkSafeBrowsing('http://a.com', { fetchImpl: throwing, apiKey: 'k' }), false);
    const { fetchImpl } = fakeFetch(() => ({ ok: false, json: async () => ({}) }));
    assert.equal(await checkSafeBrowsing('http://b.com', { fetchImpl, apiKey: 'k' }), false);
  });

  test('analyzeLink gắn safe_browsing_flagged', async () => {
    const { fetchImpl } = fakeFetch(() => ({ ok: true, json: async () => ({ matches: [{}] }) }));
    const r = await analyzeLink('https://example.org', { fetchImpl, apiKey: 'k' });
    assert.equal(r.safe_browsing_flagged, true);
  });
});
