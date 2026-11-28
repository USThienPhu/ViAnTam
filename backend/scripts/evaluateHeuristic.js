// Chấm điểm Heuristic cho tập benchmark (docs/aws-llm-service-spec.md mục 7).
// Chạy từ thư mục backend: node scripts/evaluateHeuristic.js [test.jsonl] [output.json]
const fs = require('fs');
const path = require('path');
const { computeHeuristic } = require('../src/services/heuristic.service');

const DATA_DIR = path.resolve(__dirname, '../../ai-service/data');

function readJsonl(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function scoreRecords(records) {
  const out = {};
  for (const r of records) {
    const h = computeHeuristic(r.input);
    out[r.id] = { score: h.score, scamType: h.scamType };
  }
  return out;
}

if (require.main === module) {
  const input = process.argv[2] || path.join(DATA_DIR, 'test.jsonl');
  const output = process.argv[3] || path.join(DATA_DIR, 'heuristic_scores.json');
  const scores = scoreRecords(readJsonl(input));
  fs.writeFileSync(output, `${JSON.stringify(scores, null, 2)}\n`);
  console.log(`[evaluateHeuristic] Đã chấm ${Object.keys(scores).length} mẫu -> ${output}`);
}

module.exports = { scoreRecords, readJsonl };
