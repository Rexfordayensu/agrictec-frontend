/* eslint-disable @typescript-eslint/no-require-imports -- Existing TypeScript Node test convention. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args);
};
function compile(file) {
  return ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: file,
  }).outputText;
}
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (m, f) => m._compile(compile(f), f);
require.extensions['.css'] = () => {};
const nothing = () => {};
const store = (data) => Object.assign((select) => select(data), { getState: () => data });
const zero = { total: '0.00', verified: '0.00', selfReported: '0.00', verifiedShare: '0.00' };
const summary = {
  period: { months: 12 },
  farm: { income: zero, expenses: zero, net: '0.00' },
  momo: { in: zero, out: zero, net: '0.00' },
  financing: { in: zero, out: zero },
  verifiedShare: { byCount: '0.00' },
  monthly: [],
  counts: { total: 0, verified: 0, financialRecords: 0, momo: 0 },
};
const credit = {
  score: 349,
  band: 'Building',
  totalEntries: 0,
  verifiedEntries: 0,
  steps: [],
  best: null,
};
const steps = ['records', 'evidence', 'ghana-card', 'apply'].map((key) => ({
  key,
  title: key,
  detail: 'Not recorded yet',
  done: false,
  action: null,
}));
function load(extra = {}) {
  const mocks = {
    'next/navigation': { useRouter: () => ({ push: nothing }) },
    '@/hooks/use-credit': { useCredit: () => credit, useLoanPath: () => ({ steps, current: 0 }) },
    '@/hooks/use-financial-summary': { useFinancialSummary: () => ({ status: 'ready', summary }) },
    '@/store/platform-store': { usePlatformStore: store({ lenders: [], status: 'ready' }) },
    '@/store/applications-store': { useApplicationsStore: store({ list: [], status: 'ready' }) },
    '@/store/loan-store': { useLoanStore: store({ applications: [], setTab: nothing }) },
    '@/store/modal-store': { useModalStore: store({ openModal: nothing }) },
    ...extra,
  };
  const file = path.join(root, 'components/loans/loans-overview.tsx');
  const m = new Module(file, module);
  m.require = (name) =>
    Object.hasOwn(mocks, name)
      ? mocks[name]
      : require(name.startsWith('.') ? path.resolve(path.dirname(file), name) : name);
  m._compile(compile(file), file);
  return m.exports;
}

test('the reference overview renders real empty states without mockup financial figures', () => {
  const { LoansOverview } = load();
  const html = renderToStaticMarkup(React.createElement(LoansOverview));
  for (const title of [
    'Your loan readiness overview',
    'Loan readiness checklist',
    'Transaction history',
    'Verified lenders',
    'Improve your financial health',
  ])
    assert.match(html, new RegExp(title));
  assert.match(html, /No verified lenders available yet/);
  assert.match(html, /No applications yet/);
  assert.match(html, /GHS 0.00/);
  assert.doesNotMatch(html, /GHS 2,400|GHS 1,620|GHS 780/);
  assert.match(html, /does not qualify or disqualify/);
  assert.match(html, /disabled=""[^>]*>.*?Download PDF statement/);
});

test('the history card preserves exact API totals and displays service errors honestly', () => {
  const recorded = {
    ...summary,
    farm: {
      income: { ...zero, total: '1234.10' },
      expenses: { ...zero, total: '0.20' },
      net: '1233.90',
    },
    counts: { ...summary.counts, total: 2, financialRecords: 2 },
  };
  const { TransactionHistory } = load({
    '@/hooks/use-financial-summary': {
      useFinancialSummary: () => ({ status: 'ready', summary: recorded }),
    },
  });
  const html = renderToStaticMarkup(React.createElement(TransactionHistory));
  assert.match(html, /GHS 1,234.10/);
  assert.match(html, /GHS 1,233.90/);
  const failed = load({
    '@/hooks/use-financial-summary': {
      useFinancialSummary: () => ({
        status: 'error',
        summary: null,
        error: 'Report service unavailable',
        retry: nothing,
      }),
    },
  });
  const error = renderToStaticMarkup(React.createElement(failed.TransactionHistory));
  assert.match(error, /Report service unavailable/);
  assert.match(error, /Try again/);
  assert.doesNotMatch(error, /GHS 0.00/);
});

test('the selected history period is sent to the PDF API and the returned file is saved', async () => {
  const values = [],
    calls = [];
  let cursor = 0;
  const react = {
    ...React,
    useState: (initial) => {
      const i = cursor++;
      if (!(i in values)) values[i] = initial;
      return [
        values[i],
        (v) => {
          values[i] = v;
        },
      ];
    },
  };
  const { TransactionHistory } = load({
    react,
    '@/hooks/use-financial-summary': {
      useFinancialSummary: (months) => ({
        status: 'ready',
        summary: {
          ...summary,
          period: { months },
          counts: { ...summary.counts, financialRecords: 1 },
        },
      }),
    },
    '@/services/financial.service': {
      financialService: {
        createReport: async (months) => {
          calls.push(['create', months]);
          return { id: 'real-report' };
        },
        downloadReport: async (report) => {
          calls.push(['download', report.id]);
          return { blob: new Blob(['%PDF']), filename: 'statement.pdf' };
        },
      },
    },
    '@/lib/loans/application-status': {
      saveBlob: (_blob, filename) => calls.push(['saved', filename]),
    },
  });
  const render = () => {
    cursor = 0;
    return TransactionHistory();
  };
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) {
      const found = find(child, predicate);
      if (found) return found;
    }
    return null;
  }
  find(render(), (n) => n.type === 'select').props.onChange({ target: { value: '3' } });
  const download = find(render(), (n) => n.props?.children === 'Download PDF statement');
  assert.equal(download.props.disabled, false);
  download.props.onClick();
  await new Promise(setImmediate);
  assert.deepEqual(calls, [
    ['create', 3],
    ['download', 'real-report'],
    ['saved', 'statement.pdf'],
  ]);
});
