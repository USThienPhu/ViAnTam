const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeConversation, riskLevelFromScore, toAnalyzeRequest } = require('../src/services/llmClient.service');
const { HO_TRO_MOMO, TUYEN_DUNG_CTV, CHU_TRO } = require('./fixtures/seedConversations');

function llmReply(body, status = 200) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { status, json: async () => body };
  };
  return { fetchImpl, calls };
}
const OK = (over = {}) => ({
  risk_score: 20,
  risk_level: 'low',
  scam_type: 'Chưa xác định',
  suspicious_signs: [],
  advice: ['Tiếp tục cẩn trọng.'],
  model_id: 'model-x',
  ...over,
});
const opts = (fetchImpl) => ({ fetchImpl, url: 'http://ai/analyze', apiKey: 'secret' });

describe('riskLevelFromScore', () => {
  test('ngưỡng 30 và 70', () => {
    assert.equal(riskLevelFromScore(29), 'low');
    assert.equal(riskLevelFromScore(30), 'medium');
    assert.equal(riskLevelFromScore(69), 'medium');
    assert.equal(riskLevelFromScore(70), 'high');
  });
});

describe('toAnalyzeRequest', () => {
  test('đổi sang snake_case, giữ sender, bank_name mặc định rỗng', () => {
    const req = toAnalyzeRequest({
      targetUsername: 'x',
      messages: [{ sender: 'target', text: 'hi' }],
      links: [{ url: 'http://a.xyz', flags: ['suspicious_tld'], sender: 'target', inBlacklist: true }],
      qrTransfers: [{ accountNumber: 123, sender: 'user', blacklistPending: true }],
    });
    assert.deepEqual(req, {
      target_username: 'x',
      target_report_count: 0,
      messages: [{ sender: 'target', text: 'hi' }],
      extracted_signals: {
        links: [{ url: 'http://a.xyz', flags: ['suspicious_tld'], safe_browsing_flagged: false, sender: 'target', in_blacklist: true, blacklist_pending: false }],
        qr_transfers: [{ bank_name: '', account_number: '123', amount: null, purpose: '', sender: 'user', in_blacklist: false, blacklist_pending: true }],
      },
    });
  });
});

describe('analyzeConversation', () => {
  test('gửi đúng header và body snake_case', async () => {
    const { fetchImpl, calls } = llmReply(OK());
    await analyzeConversation(CHU_TRO, opts(fetchImpl));
    assert.equal(calls[0].url, 'http://ai/analyze');
    assert.equal(calls[0].init.headers['X-API-Key'], 'secret');
    assert.equal(JSON.parse(calls[0].init.body).target_username, 'ChuTro_AnhMinh');
  });

  test('heuristic cao hơn LLM thì lấy heuristic và nối dấu hiệu', async () => {
    const { fetchImpl } = llmReply(OK({ risk_score: 20 }));
    const r = await analyzeConversation(TUYEN_DUNG_CTV, opts(fetchImpl));
    assert.equal(r.riskScore, 40);
    assert.equal(r.riskLevel, 'medium');
    assert.equal(r.analysisSource, 'llm');
    assert.equal(r.llmScore, 20);
    assert.equal(r.heuristicScore, 40);
    assert.equal(r.modelId, 'model-x');
    assert.equal(r.scamType, 'Lừa đảo tuyển cộng tác viên / việc làm');
    assert.ok(r.suspiciousSigns.length > 0);
  });

  test('LLM cao hơn thì lấy LLM, dùng scamType và advice của LLM', async () => {
    const { fetchImpl } = llmReply(
      OK({ risk_score: 80, scam_type: 'Lừa đảo đầu tư', suspicious_signs: [{ quote: 'q', explanation: 'e' }], advice: ['Dừng lại.'] })
    );
    const r = await analyzeConversation(CHU_TRO, opts(fetchImpl));
    assert.equal(r.riskScore, 80);
    assert.equal(r.riskLevel, 'high');
    assert.equal(r.scamType, 'Lừa đảo đầu tư');
    assert.deepEqual(r.suspiciousSigns, [{ quote: 'q', explanation: 'e' }]);
    assert.deepEqual(r.advice, ['Dừng lại.']);
  });

  test('scam_type ngoài danh sách thì dùng của heuristic', async () => {
    const { fetchImpl } = llmReply(OK({ risk_score: 50, scam_type: 'Loại lạ' }));
    const r = await analyzeConversation(TUYEN_DUNG_CTV, opts(fetchImpl));
    assert.equal(r.scamType, 'Lừa đảo tuyển cộng tác viên / việc làm');
  });

  test('LLM lỗi mạng, HTTP 502, hoặc JSON sai schema thì dùng heuristic', async () => {
    const failing = [
      async () => {
        throw new Error('ECONNREFUSED');
      },
      llmReply({ detail: 'LLM_UNAVAILABLE' }, 502).fetchImpl,
      llmReply(OK({ risk_score: '80' })).fetchImpl,
    ];
    for (const fetchImpl of failing) {
      const r = await analyzeConversation(TUYEN_DUNG_CTV, opts(fetchImpl));
      assert.equal(r.analysisSource, 'heuristic');
      assert.equal(r.llmScore, null);
      assert.equal(r.riskScore, 40);
      assert.equal(r.modelId, '');
      assert.ok(r.advice.length > 0);
    }
  });

  test('không cấu hình URL thì không gọi mạng', async () => {
    const { fetchImpl, calls } = llmReply(OK());
    const r = await analyzeConversation(CHU_TRO, { fetchImpl, url: '', apiKey: '' });
    assert.equal(calls.length, 0);
    assert.equal(r.analysisSource, 'heuristic');
    assert.equal(r.riskLevel, 'low');
  });

  test('Blacklist confirmed ép tối thiểu 85 dù LLM cho điểm thấp', async () => {
    const { fetchImpl } = llmReply(OK({ risk_score: 10 }));
    const input = { ...CHU_TRO, qrTransfers: [{ bankName: 'BIDV', accountNumber: '1', sender: 'target', inBlacklist: true }] };
    const r = await analyzeConversation(input, opts(fetchImpl));
    assert.equal(r.riskScore, 85);
    assert.equal(r.riskLevel, 'high');
  });

  test('Blacklist pending không kích hoạt sàn 85', async () => {
    const { fetchImpl } = llmReply(OK({ risk_score: 10 }));
    const input = { ...CHU_TRO, qrTransfers: [{ bankName: 'BIDV', accountNumber: '1', sender: 'target', blacklistPending: true }] };
    const r = await analyzeConversation(input, opts(fetchImpl));
    assert.equal(r.riskScore, 25);
    assert.equal(r.riskLevel, 'low');
  });

  test('seed HoTro_MoMo_247 khi AI lỗi vẫn ra high', async () => {
    const r = await analyzeConversation(HO_TRO_MOMO, { url: '' });
    assert.equal(r.riskScore, 90);
    assert.equal(r.riskLevel, 'high');
  });
});
