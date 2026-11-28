// Phân tích link theo docs/ai-scam-detection-spec.md mục 3.1.
// Không tự trích xuất link: danh sách lấy từ Message.extractedLinks.
// Không truy cập (fetch) URL của người dùng; chỉ gửi URL sang Google Safe Browsing để tra cứu.

const OFFICIAL = [
  'momo.vn',
  'vietcombank.com.vn',
  'bidv.com.vn',
  'mbbank.com.vn',
  'techcombank.com.vn',
  'shopee.vn',
  'dichvucong.gov.vn',
];
const BRANDS = ['momo', 'vietcombank', 'bidv', 'mbbank', 'techcombank', 'shopee', 'dichvucong'];
// Tên ngân hàng/ví thật gần giống brand (ví dụ vpbank ~ mbbank): không so khoảng cách với các token này.
const LEGIT_LOOKALIKE_TOKENS = new Set([
  'vpbank', 'tpbank', 'hdbank', 'abbank', 'lpbank', 'acb', 'vib', 'shb', 'msb', 'ocb', 'scb',
  'seabank', 'namabank', 'bacabank', 'vietinbank', 'agribank', 'sacombank', 'eximbank', 'zalopay',
]);
const SUSPICIOUS_TLDS = ['.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.vip', '.cc'];
const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'bom.so'];
const PHISH_KEYWORDS = ['xacminh', 'xacthuc', 'login', 'support', 'hotro', 'verify'];
const LOOKALIKE = { 0: 'o', 1: 'l', 3: 'e', 5: 's' };
const SAFE_BROWSING_URL = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

const safeBrowsingCache = new Map();

function normalizeUrl(url) {
  let s = String(url ?? '').trim().replace(/[.,;:!?)\]}'"]+$/, '');
  const m = s.match(/^([a-z][a-z0-9+.-]*:\/\/)([^/?#]*)(.*)$/i);
  if (m) s = m[1].toLowerCase() + m[2].toLowerCase() + m[3];
  return s.replace(/\/+$/, '');
}

function normalizeLookalike(str) {
  return String(str ?? '')
    .toLowerCase()
    .replace(/rn/g, 'm')
    .replace(/[0135]/g, (c) => LOOKALIKE[c]);
}

function levenshteinDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = temp;
    }
  }
  return prev[b.length];
}

function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function hostOf(parsed) {
  return parsed ? parsed.hostname.toLowerCase().replace(/^www\./, '') : '';
}

function isOfficial(host) {
  return OFFICIAL.some((o) => host === o || host.endsWith(`.${o}`));
}

function isTyposquatting(host) {
  if (!host || isOfficial(host)) return false;
  const labels = host.split('.');
  const tokens = labels
    .slice(0, -1)
    .join('.')
    .split(/[.-]/)
    .filter(Boolean)
    .map(normalizeLookalike);
  const normalizedHost = normalizeLookalike(host);

  return BRANDS.some((brand) => {
    const maxDistance = brand.length < 6 ? 1 : 2;
    const tokenHit = tokens.some((token) => {
      if (token === brand) return true;
      if (LEGIT_LOOKALIKE_TOKENS.has(token)) return false;
      if (token.length < brand.length - 1) return false;
      const d = levenshteinDistance(token, brand);
      return d >= 1 && d <= maxDistance;
    });
    const keywordHit =
      normalizedHost.includes(brand) && PHISH_KEYWORDS.some((k) => normalizedHost.includes(k));
    return tokenHit || keywordHit;
  });
}

function heuristicFlags(url) {
  const parsed = parseUrl(url);
  const host = hostOf(parsed);
  const flags = [];
  if (/^https?:\/\/\d{1,3}(\.\d{1,3}){3}/i.test(url)) flags.push('has_ip_host');
  if (host && SUSPICIOUS_TLDS.some((tld) => host.endsWith(tld))) flags.push('suspicious_tld');
  if (SHORTENERS.includes(host)) flags.push('shortened_url');
  if (parsed && parsed.pathname.toLowerCase().endsWith('.apk')) flags.push('apk_download');
  if (!flags.includes('has_ip_host') && isTyposquatting(host)) flags.push('typosquatting');
  return flags;
}

async function checkSafeBrowsing(
  url,
  { fetchImpl = globalThis.fetch, apiKey = process.env.GOOGLE_SAFE_BROWSING_KEY } = {}
) {
  if (!apiKey || !url) return false;
  if (safeBrowsingCache.has(url)) return safeBrowsingCache.get(url);
  try {
    const res = await fetchImpl(`${SAFE_BROWSING_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'aegisai', clientVersion: '1.0.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const flagged = Array.isArray(data?.matches) && data.matches.length > 0;
    safeBrowsingCache.set(url, flagged);
    return flagged;
  } catch {
    return false;
  }
}

function clearSafeBrowsingCache() {
  safeBrowsingCache.clear();
}

async function analyzeLink(url, options = {}) {
  const normalized = normalizeUrl(url);
  const safeBrowsingFlagged = await checkSafeBrowsing(normalized, options);
  return { url: normalized, flags: heuristicFlags(normalized), safe_browsing_flagged: safeBrowsingFlagged };
}

async function analyzeLinks(urls, options = {}) {
  const unique = [...new Set((urls || []).map(normalizeUrl).filter(Boolean))];
  return Promise.all(unique.map((u) => analyzeLink(u, options)));
}

module.exports = {
  BRANDS,
  normalizeUrl,
  normalizeLookalike,
  levenshteinDistance,
  checkSafeBrowsing,
  clearSafeBrowsingCache,
  analyzeLink,
  analyzeLinks,
};
