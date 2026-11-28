const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scoreRecords } = require('../scripts/evaluateHeuristic');
const { HO_TRO_MOMO, CHU_TRO } = require('./fixtures/seedConversations');

test('scoreRecords chấm điểm heuristic theo id', () => {
  const out = scoreRecords([
    { id: 'a', input: HO_TRO_MOMO },
    { id: 'b', input: CHU_TRO },
  ]);
  assert.deepEqual(out, {
    a: { score: 90, scamType: 'Link giả mạo (phishing)' },
    b: { score: 0, scamType: 'Chưa xác định' },
  });
});
