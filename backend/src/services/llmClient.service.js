// Gọi ai-service và hợp nhất điểm theo cách hybrid (docs/ai-scam-detection-spec.md mục 3.2).
const SCAM_TYPES = require('../config/scamTypes');
const { computeHeuristic } = require('./heuristic.service');

const GENERIC_TYPES = ['Khác', 'Chưa xác định'];
const DEFAULT_ADVICE = {
  low: [
    'Chưa phát hiện dấu hiệu đáng ngờ, nhưng hãy luôn kiểm tra kỹ thông tin người nhận trước khi chuyển tiền.',
  ],
  medium: [
    'Xác minh lại danh tính đối phương qua kênh chính thức (số tổng đài, người quen đã lưu số).',
    'Không chuyển tiền hoặc cung cấp mã OTP cho đến khi chắc chắn.',
  ],
  high: [
    'Không chuyển tiền, không bấm vào đường link và không cung cấp mã OTP.',
    'Chặn và báo cáo tài khoản này, liên hệ ngân hàng nếu đã lỡ chuyển tiền.',
  ],
};

function riskLevelFromScore(score) {
  if (score >= 70) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function toScamType(value) {
  return SCAM_TYPES.includes(value) ? value : 'Khác';
}

function toAnalyzeRequest(input) {
  return {
    target_username: String(input.targetUsername ?? ''),
    target_report_count: input.targetReportCount || 0,
    messages: (input.messages || []).map((m) => ({ sender: m.sender, text: String(m.text ?? '') })),
    extracted_signals: {
      links: (input.links || []).map((l) => ({
        url: String(l.url ?? ''),
        flags: l.flags || [],
        safe_browsing_flagged: Boolean(l.safe_browsing_flagged),
        sender: l.sender || 'target',
        in_blacklist: Boolean(l.inBlacklist),
        blacklist_pending: Boolean(l.blacklistPending),
      })),
      qr_transfers: (input.qrTransfers || []).map((q) => ({
        bank_name: q.bankName || '',
        account_number: String(q.accountNumber ?? ''),
        amount: q.amount ?? null,
        purpose: q.purpose || '',
        sender: q.sender || 'target',
        in_blacklist: Boolean(q.inBlacklist),
        blacklist_pending: Boolean(q.blacklistPending),
      })),
    },
  };
}

function isValidResponse(d) {
  return (
    d &&
    Number.isInteger(d.risk_score) &&
    d.risk_score >= 0 &&
    d.risk_score <= 100 &&
    typeof d.scam_type === 'string' &&
    Array.isArray(d.suspicious_signs) &&
    Array.isArray(d.advice)
  );
}

async function callLlm(body, { fetchImpl, url, apiKey, timeoutMs }) {
  if (!url) return null;
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status !== 200) return null;
    const data = await res.json();
    return isValidResponse(data) ? data : null;
  } catch {
    return null;
  }
}

async function analyzeConversation(input, options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    url = process.env.AWS_LLM_API_URL,
    apiKey = process.env.AWS_LLM_API_KEY || '',
    timeoutMs = 15000,
  } = options;

  const heuristic = computeHeuristic(input);
  const started = Date.now();
  const llm = await callLlm(toAnalyzeRequest(input), { fetchImpl, url, apiKey, timeoutMs });
  const latencyMs = Date.now() - started;
  const llmScore = llm ? llm.risk_score : null;

  let riskScore = Math.max(llmScore ?? 0, heuristic.score);
  const hitConfirmedBlacklist = [...(input.links || []), ...(input.qrTransfers || [])].some(
    // Chỉ tín hiệu của đối phương; thiếu sender coi là đối phương để giữ an toàn.
    (s) => s.inBlacklist === true && s.sender !== 'user'
  );
  if (hitConfirmedBlacklist) riskScore = Math.max(riskScore, 85);
  const riskLevel = riskLevelFromScore(riskScore);

  const llmType = llm ? toScamType(llm.scam_type) : null;
  let scamType = llmType ?? 'Chưa xác định';
  if (!llmType || GENERIC_TYPES.includes(llmType)) {
    scamType = heuristic.scamType !== 'Chưa xác định' ? heuristic.scamType : scamType;
  }

  const suspiciousSigns = llm
    ? llm.suspicious_signs.map((s) => ({ quote: String(s.quote ?? ''), explanation: String(s.explanation ?? '') }))
    : [];
  if (heuristic.score > (llmScore ?? 0)) {
    const seen = new Set(suspiciousSigns.map((s) => s.quote));
    for (const sign of heuristic.suspiciousSigns) {
      if (!seen.has(sign.quote)) {
        suspiciousSigns.push(sign);
        seen.add(sign.quote);
      }
    }
  }

  return {
    riskScore,
    riskLevel,
    scamType,
    suspiciousSigns,
    advice: llm && llm.advice.length > 0 ? llm.advice.map(String) : DEFAULT_ADVICE[riskLevel],
    analysisSource: llm ? 'llm' : 'heuristic',
    llmScore,
    heuristicScore: heuristic.score,
    modelId: llm ? String(llm.model_id ?? '') : '',
    latencyMs: llm ? latencyMs : 0,
  };
}

module.exports = { analyzeConversation, computeHeuristic, riskLevelFromScore, toAnalyzeRequest, SCAM_TYPES };
