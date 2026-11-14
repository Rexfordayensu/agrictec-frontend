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

const { hasReportableFigures, financialReportError } = require('../lib/financial-report-state.ts');
const { renderToStaticMarkup } = require('react-dom/server');
const React = require('react');
const { EmptyFinancialReport } = require('../components/reports/financial-reports-view.tsx');
const empty = {
  counts: { financialRecords: 0, momo: 0 },
  financing: { in: { total: '0.00' }, out: { total: '0.00' } },
  farm: { income: { total: '0.00' }, expenses: { total: '0.00' }, net: '0.00' },
};

test('no financial entries does not enable a PDF report', () => {
  assert.equal(hasReportableFigures(empty), false);
  assert.equal(hasReportableFigures({ ...empty, counts: { financialRecords: 1, momo: 0 } }), true);
  assert.equal(hasReportableFigures({ ...empty, counts: { financialRecords: 0, momo: 1 } }), true);
  assert.equal(
    hasReportableFigures({ ...empty, financing: { ...empty.financing, in: { total: '0.10' } } }),
    true,
  );
});
test('a missing report endpoint is a service error, not an empty account', () => {
  const missing = Object.assign(new Error('Not Found'), { status: 404 });
  assert.match(financialReportError(missing), /temporarily unavailable/);
  assert.match(financialReportError(missing, 'reports'), /Saved reports/);
  assert.match(financialReportError(missing, 'pdf'), /PDF reports/);
  assert.match(financialReportError(missing, 'download'), /no longer available/);
  assert.doesNotMatch(financialReportError(missing), /Not Found|no records/i);
  assert.equal(financialReportError(new Error('Check your connection.')), 'Check your connection.');
});
test('empty report guides a farmer to real records without invented figures', () => {
  const html = renderToStaticMarkup(
    React.createElement(EmptyFinancialReport, { summary: null, months: 6, firstRecord: true }),
  );
  assert.match(html, /Your report starts with your first record/);
  assert.match(html, /Add your first record/);
  assert.match(html, /Your chart starts the month you record your first entry/);
  assert.match(html, /Record a MoMo payment/);
  assert.doesNotMatch(html, /GHS 0|Not Found|Checking your records/);
});
test('an empty period is explained above the figures, which show the exact zeros', () => {
  const html = renderToStaticMarkup(
    React.createElement(EmptyFinancialReport, { summary: empty, months: 3, firstRecord: false }),
  );
  assert.match(html, /No financial entries in this reporting period/);
  // Already recording (an activity, say): the chart has started, so no "starts with" line.
  assert.doesNotMatch(html, /Your chart starts/);
  assert.match(html, /Add a record/);
  // The totals are not repeated here: the figures and chart below show them.
  assert.doesNotMatch(html, /GHS/);
});

test('record readiness is checked against the server’s figures, nothing estimated', () => {
  const { reportReadiness } = require('../lib/report-readiness.ts');
  const summary = {
    recordReadiness: { entriesWithEvidence: 3, identityVerified: true },
    period: { months: 6 },
    insufficient: false,
    farm: { income: { total: '2500.00' }, expenses: { total: '850.00' } },
    verifiedShare: { byCount: '60.00' },
    counts: { byStatus: { self_reported: 2, verified: 3 } },
  };
  const all = reportReadiness(summary, 'verified');
  assert.equal(all.percent, 100);
  assert.equal(all.checks[0].label, 'Transaction history (6 months)');
  const partial = reportReadiness(
    {
      ...summary,
      recordReadiness: { entriesWithEvidence: 0, identityVerified: false },
      insufficient: true,
      verifiedShare: { byCount: '0.00' },
      counts: { byStatus: { self_reported: 4 } },
    },
    'pending',
  );
  assert.deepEqual(
    partial.checks.map((c) => [c.key, c.done]),
    [
      ['history', false],
      ['incomeExpenses', true],
      ['verified', false],
      ['evidence', false],
      ['identity', false],
    ],
  );
  assert.equal(partial.percent, 20);
  const noAttachment = reportReadiness(
    { ...summary, recordReadiness: { entriesWithEvidence: 0, identityVerified: false } },
    'verified',
  );
  assert.equal(noAttachment.checks.find((c) => c.key === 'evidence').done, false);
  assert.equal(noAttachment.checks.find((c) => c.key === 'identity').done, false);
});

test('recent report transactions display the server period rows and exact decimal amounts', () => {
  const { RecentTransactionsPanel } = require('../components/reports/report-panels.tsx');
  const html = renderToStaticMarkup(
    React.createElement(RecentTransactionsPanel, {
      summary: {
        recentTransactions: [
          {
            id: 'database-row',
            userId: 'farmer',
            type: 'income',
            amount: '123456789.01',
            description: 'Saved database sale',
            date: '2026-11-12',
            createdAt: '2026-11-12T09:00:00Z',
            category: 'crop_sale',
            verificationStatus: 'self_reported',
            crop: 'Maize',
          },
        ],
      },
    }),
  );
  assert.match(html, /Saved database sale/);
  assert.match(html, /123,456,789.01/);
  assert.doesNotMatch(html, /2,500.00|Sale of maize \(500 kg\)/);
});

test('empty recent transactions show the table and record action without sample entries', () => {
  const { RecentTransactionsPanel } = require('../components/reports/report-panels.tsx');
  const html = renderToStaticMarkup(
    React.createElement(RecentTransactionsPanel, { summary: { recentTransactions: [] } }),
  );
  assert.match(html, /No transactions yet/);
  assert.match(html, /Add a transaction/);
  assert.match(html, /Amount \(GHS\)/);
  assert.doesNotMatch(html, /Maize sales|Mohammed|2,500|850.00/);
});

test('report period labels keep both years when the range crosses New Year', () => {
  const { reportRangeLabel } = require('../components/reports/financial-reports-view.tsx');
  const today = new Date(2026, 10, 13);
  assert.equal(reportRangeLabel(6, today, true), 'Jun \u2013 Nov 2026');
  assert.equal(reportRangeLabel(12, today, true), 'Dec 2025 \u2013 Nov 2026');
});
