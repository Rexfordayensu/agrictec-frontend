/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS hooks load the app's TypeScript without an extra test dependency. */
// Run: node --test --test-isolation=none tests/admin-permissions.test.cjs
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

const { TRANSACTION_STATUSES, CATEGORIES, categoryLabel, formatTransactionMoney, isPossibleDuplicate, duplicateRetry } = require('../lib/transactions.ts');
const { totalIncome,totalExpenses } = require('../lib/calculations/finance.ts');

test('status labels distinguish own entries from an AgriCtec evidence review',()=>{
  assert.equal(TRANSACTION_STATUSES.self_reported,'Self-reported');
  assert.equal(TRANSACTION_STATUSES.verification_pending,'Under review');
  assert.equal(TRANSACTION_STATUSES.verified,'Verified by AgriCtec');
  assert.equal(Object.keys(TRANSACTION_STATUSES).length,6);
  assert.ok(!Object.values(TRANSACTION_STATUSES).some(label=>/bank|provider/i.test(label)));
});
test('categories are explicit and unknown values stay uncategorised',()=>{
  assert.equal(categoryLabel(null),'Uncategorised');
  assert.deepEqual(CATEGORIES.activity,[]);
  assert.ok(CATEGORIES.financing.includes('loan_repayment'));
  assert.ok(!CATEGORIES.income.includes('loan_disbursement'));
});
test('duplicate retry is explicit and preserves the exact input',()=>{
  const input={amount:'0.10',date:'2026-11-01',category:null};
  assert.equal(isPossibleDuplicate({code:'possible_duplicate'}),true);
  assert.equal(isPossibleDuplicate({code:'duplicate_reference'}),false);
  assert.deepEqual(duplicateRetry(input),{...input,confirmDuplicate:true});
  assert.equal(input.confirmDuplicate,undefined);
});
test('server decimal strings are displayed without floating point conversion',()=>{
  assert.equal(formatTransactionMoney('0.30'),'GHS 0.30');
  assert.equal(formatTransactionMoney('12345678901234567890.10'),'GHS 12,345,678,901,234,567,890.10');
  assert.equal(formatTransactionMoney('-1234.00'),'GHS -1,234.00');
});
test('financing never contributes to farm income or expenses',()=>{
  const rows=[{type:'income',amount:100},{type:'expense',amount:20},{type:'financing',direction:'in',amount:999},{type:'financing',direction:'out',amount:888}];
  assert.equal(totalIncome(rows),100);assert.equal(totalExpenses(rows),20);
});
