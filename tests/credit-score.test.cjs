/* eslint-disable @typescript-eslint/no-require-imports -- Load the app's TypeScript with the existing test convention. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (specifier, ...args) {
  return resolveFilename.call(
    this,
    specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : specifier,
    ...args,
  );
};
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: filename,
    });
    module._compile(outputText, filename);
  };
}

// Run: node --test tests/credit-score.test.cjs
// The browser's score must match the server's (app/domain/credit.py and
// backend tests/test_score_verified.py use the same numbers).
const { DEFAULT_CREDIT_CONFIG } = require('../lib/admin/defaults.ts');
const { calculateCreditScore, entryWeight } = require('../lib/calculations/credit-score.ts');
const { configChanges, draftIssues } = require('../lib/admin/credit-rules.ts');

const today = new Date();
const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const rec = (over = {}) => ({
  id: 'r',
  userId: 'u',
  type: 'income',
  description: 'x',
  crop: 'Maize',
  amount: 1000,
  date: iso,
  createdAt: today.toISOString(),
  verificationStatus: 'self_reported',
  ...over,
});
const momo = (verificationStatus, id) => ({
  ...rec({ id, verificationStatus }),
  direction: 'in',
  counterparty: 'Buyer',
  amount: 100,
});
const withWeight = (unverifiedWeight) => ({
  ...DEFAULT_CREDIT_CONFIG,
  targets: { ...DEFAULT_CREDIT_CONFIG.targets, unverifiedWeight },
});
const score = (records, momoEntries = [], config = DEFAULT_CREDIT_CONFIG) =>
  calculateCreditScore(records, momoEntries, null, config);
const ten = (verificationStatus) =>
  Array.from({ length: 10 }, (_, i) => rec({ id: `r${i}`, verificationStatus }));

test('each status has its weight; an entry with no status counts as unchecked', () => {
  assert.equal(entryWeight(rec({ verificationStatus: 'verified' }), 50), 1);
  for (const s of ['self_reported', 'evidence_submitted', 'verification_pending'])
    assert.equal(entryWeight(rec({ verificationStatus: s }), 50), 0.5);
  for (const s of ['rejected', 'disputed'])
    assert.equal(entryWeight(rec({ verificationStatus: s }), 50), 0);
  assert.equal(entryWeight({}, 50), 0.5);
});

test('verified entries count in full, unchecked ones half, rejected ones nothing', () => {
  const verified = score(ten('verified'));
  const unchecked = score(ten('self_reported'));
  const rejected = score(ten('rejected'));
  assert.deepEqual(
    [verified.recordCompleteness, unchecked.recordCompleteness, rejected.recordCompleteness],
    [33, 17, 0],
  );
  assert.deepEqual(
    [verified.paymentHistory, unchecked.paymentHistory, rejected.paymentHistory],
    [17, 8, 0],
  );
  assert.ok(verified.score > unchecked.score && unchecked.score > rejected.score);
  const four = (s) => Array.from({ length: 4 }, (_, i) => momo(s, `m${i}`));
  assert.equal(score([], four('verified')).momoActivity, 20);
  assert.equal(score([], four('verification_pending')).momoActivity, 10);
});

test('made-up income cannot beat real costs', () => {
  const costs = rec({ id: 'e', type: 'expense', amount: 6000, verificationStatus: 'verified' });
  const sale = (verificationStatus) => rec({ amount: 10000, verificationStatus });
  assert.equal(score([sale('verified'), costs]).incomeStability, 90);
  assert.equal(score([sale('self_reported'), costs]).incomeStability, 30);
  assert.equal(score([sale('rejected'), costs]).incomeStability, 0);
  const uncheckedCost = { ...costs, verificationStatus: 'self_reported' };
  assert.equal(score([sale('verified'), uncheckedCost]).incomeStability, 90);
  const rejectedCost = { ...costs, verificationStatus: 'rejected' };
  assert.equal(score([sale('verified'), rejectedCost]).incomeStability, 100);
});

test('the weight is an admin setting, checked and listed like the other targets', () => {
  const entries = ten('self_reported');
  assert.equal(score(entries, [], withWeight(100)).recordCompleteness, 33);
  assert.equal(score(entries, [], withWeight(0)).recordCompleteness, 0);
  // Rules without the setting (saved before it existed) count unchecked entries at 50%.
  const { unverifiedWeight, ...oldTargets } = DEFAULT_CREDIT_CONFIG.targets;
  assert.equal(unverifiedWeight, 50);
  const old = { ...DEFAULT_CREDIT_CONFIG, targets: oldTargets };
  assert.equal(score(entries, [], old).recordCompleteness, 17);

  assert.equal(draftIssues(withWeight(50)).targets, undefined);
  assert.match(draftIssues(withWeight(101)).targets, /0% to 100%/);
  assert.match(draftIssues(withWeight(12.5)).targets, /whole number/);
  assert.deepEqual(configChanges(DEFAULT_CREDIT_CONFIG, withWeight(80)), [
    { section: 'Targets', label: 'Unchecked entries count', from: '50%', to: '80%' },
  ]);
});
