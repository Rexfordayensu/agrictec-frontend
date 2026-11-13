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
// The period, future-date and MoMo/financing rules are the server's (backend
// tests/test_financial_performance.py). Here: the dashboard shows the server's figures as they are.
const { fromFinancialSummary } = require('../lib/dashboard-summary.ts');

const line = (total, verified = '0.00', share = '0.00') => ({
  total,
  verified,
  selfReported: (Number(total) - Number(verified)).toFixed(2),
  verifiedShare: share,
});
const server = (over = {}) => ({
  currency: 'GHS',
  period: { from: '2026-06-01', to: '2026-11-10', months: 6 },
  dataAsOf: '2026-11-10T09:00:00.000Z',
  farm: { income: line('300.00', '100.00', '33.33'), expenses: line('25.00'), net: '275.00' },
  momo: { in: line('500.00'), out: line('70.00'), net: '430.00' },
  financing: { in: line('0.00'), out: line('0.00') },
  monthly: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].map((month, i) => ({
    month,
    income: i === 0 ? '100.00' : i === 5 ? '200.00' : '0.00',
    expenses: i === 2 ? '25.00' : '0.00',
    net: '0.00',
  })),
  counts: { byStatus: {}, total: 6, verified: 1, farmRecords: 4, financialRecords: 3, momo: 2 },
  verifiedShare: { byCount: '16.67', byAmount: '10.00' },
  obligations: { disbursed: '0.00', repaid: '0.00', interestPaid: '0.00', outstanding: '0.00' },
  repayments: [],
  monthsWithRecords: 3,
  insufficient: true,
  ...over,
});

test('the dashboard shows the server totals and period, without adding anything up', () => {
  const s = fromFinancialSummary(server());
  assert.equal(s.income, 300);
  assert.equal(s.expenses, 25);
  assert.equal(s.profit, 275);
  assert.equal(s.momoNet, 430);
  assert.equal(s.recordCount, 4);
  assert.equal(s.financialRecordCount, 3);
  assert.equal(s.momoCount, 2);
  assert.equal(s.start, '2026-06-01');
  assert.equal(s.end, '2026-11-10');
  assert.deepEqual(s.series.income, [100, 0, 0, 0, 0, 200]);
  assert.deepEqual(s.series.expense, [0, 0, 25, 0, 0, 0]);
  assert.equal(s.series.labels.length, 6);
  assert.equal(s.verifiedShare.income, 33.33);
  assert.equal(s.verifiedShare.entries, 16.67);
  assert.equal(s.insufficient, true);
  assert.equal(s.monthsWithRecords, 3);
});

test('no income means no profit margin, and a loss stays negative', () => {
  const empty = fromFinancialSummary(
    server({ farm: { income: line('0.00'), expenses: line('0.00'), net: '0.00' } }),
  );
  assert.equal(empty.margin, null);
  const loss = fromFinancialSummary(
    server({ farm: { income: line('0.00'), expenses: line('90.00'), net: '-90.00' } }),
  );
  assert.equal(loss.profit, -90);
  assert.equal(loss.margin, null);
});

test('the farm insight is a sentence about the server’s own figures, never sample data', () => {
  const { farmInsight } = require('../lib/dashboard-insight.ts');
  const base = {
    months: 6,
    income: 3700,
    expenses: 750,
    profit: 2950,
    financialRecordCount: 4,
    verifiedShare: { income: 0, expenses: 0, entries: 80 },
    insufficient: false,
    monthsWithRecords: 6,
  };
  assert.match(farmInsight({ ...base, financialRecordCount: 0 }), /Record your sales/);
  assert.match(
    farmInsight({ ...base, income: 100, expenses: 400, profit: -300 }),
    /expenses \(GHS 400\) are higher than your income \(GHS 100\)/,
  );
  assert.match(
    farmInsight({ ...base, verifiedShare: { ...base.verifiedShare, entries: 0 } }),
    /0% of your entries are verified/,
  );
  assert.match(
    farmInsight({ ...base, insufficient: true, monthsWithRecords: 2 }),
    /cover 2 of the last 6 months/,
  );
  assert.match(farmInsight(base), /GHS 2,950 more than your expenses over the last 6 months/);
});

test('dashboard weather shows provider readings and never invents unavailable values', () => {
  const { createElement } = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { DashboardWeather } = require('../components/dashboard/dashboard-weather.tsx');
  const report = {
    provider: 'Open-Meteo',
    updatedAt: '2026-11-13T18:00:00Z',
    current: { temp: 28.2, description: 'Clear sky', humidity: 75, rainChance: 0, windKph: null },
    daily: [],
  };
  const props = { report, location: 'Ejisu, Ashanti', loading: false, onRetry: () => {} };
  const html = renderToStaticMarkup(createElement(DashboardWeather, props));
  assert.match(html, /28.2/);
  assert.match(html, /75%/);
  assert.match(html, /0%/);
  assert.match(html, /Ejisu, Ashanti/);
  assert.match(html, /Open-Meteo/);
  assert.doesNotMatch(html, /12 km\/h|26.9|48%/);
  const missing = renderToStaticMarkup(createElement(DashboardWeather, { ...props, report: null }));
  assert.match(missing, /unavailable right now/);
  assert.match(missing, /Try again/);
  assert.doesNotMatch(missing, /28.2|75%|Clear sky/);
});
