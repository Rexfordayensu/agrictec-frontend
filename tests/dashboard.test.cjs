/* eslint-disable @typescript-eslint/no-require-imports -- Use the repository's TypeScript test convention. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
for (const extension of ['.ts', '.tsx'])
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
const { dashboardSummary } = require('../lib/dashboard-summary.ts');
const now = new Date('2026-11-10T12:00:00Z');
const entry = (date, type, amount) => ({ date, type, amount });

test('all financial summaries and chart series use the same period and exclude future dates', () => {
  const records = [
    entry('2026-05-31', 'income', 900),
    entry('2026-06-01', 'income', 100),
    entry('2026-08-15', 'expense', 25),
    entry('2026-11-10', 'income', 200),
    entry('2026-11-11', 'income', 500),
    entry('2026-10-01', 'activity', 999),
  ];
  const summary = dashboardSummary(records, [], 6, now);
  assert.equal(summary.start, '2026-06-01');
  assert.equal(summary.end, '2026-11-10');
  assert.equal(summary.income, 300);
  assert.equal(summary.expenses, 25);
  assert.equal(summary.profit, 275);
  assert.equal(summary.recordCount, 4);
  assert.equal(summary.financialRecordCount, 3);
  assert.deepEqual(summary.series.income, [100, 0, 0, 0, 0, 200]);
  assert.equal(
    summary.series.income.reduce((a, b) => a + b, 0),
    summary.income,
  );
  assert.equal(
    summary.series.expense.reduce((a, b) => a + b, 0),
    summary.expenses,
  );
});

test('switching to 12 months includes the previous year and keeps MoMo out of farm income', () => {
  const records = [
    entry('2025-11-30', 'income', 800),
    entry('2025-12-01', 'income', 100),
    entry('2026-06-01', 'expense', 20),
  ];
  const momo = [
    { date: '2025-11-30', direction: 'in', amount: 999 },
    { date: '2025-12-01', direction: 'in', amount: 500 },
    { date: '2026-11-10', direction: 'out', amount: 70 },
    { date: '2026-11-11', direction: 'in', amount: 999 },
  ];
  const summary = dashboardSummary(records, momo, 12, now);
  assert.equal(summary.start, '2025-12-01');
  assert.equal(summary.income, 100);
  assert.equal(summary.expenses, 20);
  assert.equal(summary.profit, 80);
  assert.equal(summary.momoNet, 430);
  assert.equal(summary.momoCount, 2);
  assert.equal(summary.series.labels.length, 12);
  assert.equal(dashboardSummary(records, momo, 6, now).income, 0);
});

test('empty records and expense-only periods never imply an artificial profit margin', () => {
  const empty = dashboardSummary([], [], 6, now);
  assert.equal(empty.profit, 0);
  assert.equal(empty.margin, null);
  assert.equal(empty.financialRecordCount, 0);
  assert.ok(empty.series.income.every((value) => value === 0));
  const loss = dashboardSummary([entry('2026-11-01', 'expense', 90)], [], 6, now);
  assert.equal(loss.profit, -90);
  assert.equal(loss.margin, null);
});
