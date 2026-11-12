/* eslint-disable @typescript-eslint/no-require-imports -- Existing TypeScript test convention. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolveFilename.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args);
};
function compile(filename) {
  return ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText;
}
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (m, f) => m._compile(compile(f), f);
function mockedModule(relative, mocks) {
  const filename = path.join(root, relative);
  const m = new Module(filename, module);
  m.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  m._compile(compile(filename), filename);
  return m.exports;
}

const { loadAllStores } = require('../store/index.ts');
const { ApiError } = require('../services/api.ts');
const stores = [
  require('../store/farm-store.ts').useFarmStore,
  require('../store/profile-store.ts').useProfileStore,
  require('../store/chat-store.ts').useChatStore,
  require('../store/settings-store.ts').useSettingsStore,
  require('../store/loan-store.ts').useLoanStore,
  require('../store/credit-store.ts').useCreditStore,
  require('../store/platform-store.ts').usePlatformStore,
  require('../store/subscription-store.ts').useSubscriptionStore,
];
async function withLoads(failures, run) {
  const before = stores.map((s) => s.getState());
  stores.forEach((store, index) => store.setState({ status: 'idle', load: async (userId) => {
    store.setState({ userId, status: failures[index] ? 'error' : 'ready' });
    if (failures[index]) throw failures[index];
  } }));
  try { await run(); } finally { stores.forEach((s, i) => s.setState(before[i], true)); }
}

test('optional API failures do not prevent farm records from opening', async () => {
  await withLoads(Object.fromEntries([2, 4, 5, 6, 7].map((i) => [i, new ApiError('Unavailable', 503, 'server_error')])), async () => {
    await loadAllStores('farmer');
    assert.equal(stores[0].getState().status, 'ready');
    assert.equal(stores[1].getState().status, 'ready');
    assert.equal(stores[5].getState().status, 'error');
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    let pathname = '/records';
    const storeMocks = Object.fromEntries([
      ['chat', 'Chat', 2], ['credit', 'Credit', 5], ['loan', 'Loan', 4], ['platform', 'Platform', 6], ['subscription', 'Subscription', 7],
    ].map(([file, name, i]) => [`@/store/${file}-store`, {
      [`use${name}Store`]: Object.assign((select) => select(stores[i].getState()), { getState: stores[i].getState }),
    }]));
    const { OptionalDataBoundary } = mockedModule('components/providers/optional-data-boundary.tsx', {
      ...storeMocks,
      'next/navigation': { usePathname: () => pathname, useRouter: () => ({ replace() {} }) },
    });
    const view = () => renderToStaticMarkup(React.createElement(OptionalDataBoundary, null, 'PAGE CONTENT'));
    assert.match(view(), /PAGE CONTENT/);
    assert.match(view(), /Some sections could not be loaded/);
    assert.match(view(), /Try these sections again/);
    pathname = '/loans';
    assert.doesNotMatch(view(), /PAGE CONTENT/, 'failed loans must not look like an empty loan account');
    stores.forEach((s) => s.setState({ status: 'ready' }));
    assert.equal(view(), 'PAGE CONTENT', 'successful retries restore the section');
  });
});

test('authentication, suspension, maintenance and core data failures still stop hydration', async () => {
  for (const error of [
    new ApiError('Session ended', 401, 'not_signed_in'),
    new ApiError('Suspended', 403, 'account_suspended'),
    new ApiError('Maintenance', 503, 'maintenance'),
  ]) await withLoads({ 5: error }, () => assert.rejects(loadAllStores('farmer'), (e) => e === error));
  await withLoads({ 0: new Error('Records unavailable') }, () => assert.rejects(loadAllStores('farmer'), /Records unavailable/));
});

function financialHook() {
  const slots = [], pending = [], requests = [];
  let cursor = 0;
  const farm = { records: [], momo: [] };
  const changed = (a, b) => !a || a.length !== b.length || a.some((x, i) => x !== b[i]);
  const react = {
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: initial };
      return [slots[i].value, (value) => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }];
    },
    useMemo(create, deps) {
      const i = cursor++;
      if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { deps, value: create() };
      return slots[i].value;
    },
    useEffect(create, deps) {
      const i = cursor++;
      if (!slots[i] || changed(slots[i].deps, deps)) {
        slots[i]?.cleanup?.();
        slots[i] = { deps };
        pending.push(() => { slots[i].cleanup = create(); });
      }
    },
  };
  const { useFinancialSummary } = mockedModule('hooks/use-financial-summary.ts', {
    react,
    '@/store/farm-store': { useFarmStore: (select) => select(farm) },
    '@/services/financial.service': { financialService: { summary: (months, signal) => new Promise((resolve, reject) => {
      requests.push({ months, signal, resolve, reject });
    }) } },
  });
  return { farm, requests, render(months = 6) {
    cursor = 0;
    const result = useFinancialSummary(months);
    while (pending.length) pending.shift()();
    return result;
  } };
}

test('record changes and failed refreshes never retain outdated financial totals', async () => {
  const h = financialHook();
  assert.equal(h.render().status, 'loading');
  const original = { period: { months: 6 }, farm: { net: '12.30' } };
  h.requests[0].resolve(original);
  await Promise.resolve();
  assert.equal(h.render().summary, original);
  h.farm.records = [{ id: 'new-record' }];
  assert.equal(h.render().summary, null, 'old totals disappear immediately when a record changes');
  h.requests[1].reject(new Error('Refresh failed'));
  await Promise.resolve();
  const failure = h.render();
  assert.equal(failure.status, 'error');
  assert.equal(failure.summary, null);
  assert.match(failure.error, /Refresh failed/);
  failure.retry();
  assert.equal(h.render().status, 'loading');
  const updated = { period: { months: 6 }, farm: { net: '24.60' } };
  h.requests[2].resolve(updated);
  await Promise.resolve();
  assert.equal(h.render().summary, updated);
});

test('a late answer for another period cannot replace the current financial summary', async () => {
  const h = financialHook();
  h.render(3);
  h.render(12);
  assert.equal(h.requests[0].signal.aborted, true);
  const latest = { period: { months: 12 } };
  h.requests[1].resolve(latest);
  await Promise.resolve();
  h.requests[0].resolve({ period: { months: 3 } });
  await Promise.resolve();
  assert.equal(h.render(12).summary, latest);
});
