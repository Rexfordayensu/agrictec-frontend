/* eslint-disable @typescript-eslint/no-require-imports -- Use the existing TypeScript test loader. */
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
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
// Run: node --test tests/demo.test.cjs
// The guest demo stores nothing: account requests never leave the browser (lib/demo.ts).
const {
  needsAccount,
  DEMO_MESSAGE,
  DEMO_DAY_MS,
  startDemo,
  currentDemo,
  demoJustEnded,
  endDemo,
  isDemoBrowser,
} = require('../lib/demo.ts');

/** A browser with localStorage and cookies, for the demo token. */
function fakeBrowser() {
  const items = new Map();
  global.window = {
    location: { protocol: 'http:' },
    localStorage: {
      getItem: (k) => (items.has(k) ? items.get(k) : null),
      setItem: (k, v) => items.set(k, String(v)),
      removeItem: (k) => items.delete(k),
      key: (i) => [...items.keys()][i] ?? null,
      get length() {
        return items.size;
      },
    },
  };
  global.document = { cookie: '' };
  return items;
}
function leaveBrowser() {
  delete global.window;
  delete global.document;
}
const { api, ApiError } = require('../services/api.ts');

test('only public information and signing in or up are open to the demo', () => {
  for (const path of [
    '/platform',
    '/platform/flags',
    '/platform/market/prices',
    '/platform/weather',
    '/geocoding/search?q=Kumasi',
    '/auth/login',
    '/auth/signup',
    '/auth/password-reset/request',
    '/auth/replace-temporary-password',
  ])
    assert.equal(needsAccount(path), false, path);
  for (const path of [
    '/me/records',
    '/me/profile',
    '/me/momo/summary',
    '/me/applications',
    '/auth/session',
    '/auth/logout',
    '/auth/guest',
    '/identity-verification/start',
    '/platformx',
  ])
    assert.equal(needsAccount(path), true, path);
});

test('in the demo an account request is refused before any network call', async () => {
  const originalFetch = global.fetch;
  const originalDocument = global.document;
  const sent = [];
  global.fetch = async (url) => {
    sent.push(String(url));
    return { ok: true, status: 200, headers: new Headers(), text: async () => '[]' };
  };
  fakeBrowser();
  startDemo();
  try {
    for (const [path, options] of [
      ['/me/records', {}],
      ['/me/records', { method: 'POST', body: { amount: 5 } }],
      ['/auth/session', {}],
    ])
      await assert.rejects(
        api(path, options),
        (e) => e instanceof ApiError && e.code === 'demo' && e.message === DEMO_MESSAGE,
      );
    assert.deepEqual(sent, [], 'nothing was sent');
    assert.deepEqual(await api('/platform/market/prices'), []);
    assert.equal(sent.length, 1, 'public information is still read');

    endDemo();
    await api('/me/records');
    assert.equal(sent.length, 2, 'a signed-in farmer is unaffected');
  } finally {
    global.fetch = originalFetch;
    leaveBrowser();
    if (originalDocument) global.document = originalDocument;
  }
});

test('a demo token lives in localStorage for one day, then it is deleted', () => {
  const items = fakeBrowser();
  try {
    const start = Date.parse('2026-11-14T08:00:00Z');
    const demo = startDemo(start);
    const saved = JSON.parse(items.get('agrictec:demo'));
    assert.equal(saved.token, demo.token);
    assert.equal(Date.parse(saved.expiresAt) - start, DEMO_DAY_MS);
    assert.match(global.document.cookie, /agrictec_demo=1; Path=\/; Max-Age=86400/);

    // Coming back the same day carries on the same demo: the 24 hours don't restart.
    const later = start + 20 * 60 * 60 * 1000;
    assert.equal(startDemo(later).token, demo.token);
    assert.equal(currentDemo(later).expiresAt, demo.expiresAt);
    assert.match(global.document.cookie, /Max-Age=14400/, 'the cookie ends with the token');

    // After 24 hours the token is deleted and the sign-in page can say the demo ended.
    global.document.cookie = 'agrictec_demo=1';
    const realNow = Date.now;
    Date.now = () => start + DEMO_DAY_MS + 1;
    try {
      assert.equal(demoJustEnded(), true);
      assert.equal(items.has('agrictec:demo'), false, 'the token is deleted');
      assert.equal(isDemoBrowser(), false);
      assert.equal(demoJustEnded(), false, 'said once');
    } finally {
      Date.now = realNow;
    }
  } finally {
    leaveBrowser();
  }
});

test('a guest tries records and MoMo in memory only: nothing is sent', async () => {
  const { DEMO_USER_ID } = require('../lib/demo.ts');
  const { useFarmStore } = require('../store/farm-store.ts');
  const { useAuthStore } = require('../store/auth-store.ts');
  const originalFetch = global.fetch;
  const sent = [];
  global.fetch = async (url) => {
    sent.push(String(url));
    throw new Error('the demo must not call the API');
  };
  useAuthStore.setState({ session: { userId: DEMO_USER_ID, isGuest: true }, impersonation: null });
  useFarmStore.setState({
    userId: DEMO_USER_ID,
    records: [],
    momo: [],
    diagnoses: [],
    status: 'ready',
  });
  try {
    const store = useFarmStore.getState();
    const record = await store.addRecord(
      { type: 'income', description: 'Maize sale', crop: 'Maize', amount: 450, date: '2026-11-14' },
      { name: 'receipt.png' },
    );
    assert.equal(record.userId, DEMO_USER_ID);
    assert.equal(record.verificationStatus, 'self_reported', 'nobody reviews a demo entry');
    const updated = await store.updateRecord(record.id, { amount: 500 });
    assert.equal(updated.amount, 500);
    const momo = await store.addMomo(
      { direction: 'in', counterparty: 'Buyer', amount: 120, date: '2026-11-14', network: 'MTN' },
      { name: 'receipt.png' },
    );
    assert.equal(useFarmStore.getState().records[0].amount, 500);
    assert.equal(useFarmStore.getState().momo.length, 1);
    await useFarmStore.getState().deleteMomo(momo.id);
    await useFarmStore.getState().deleteRecord(record.id);
    await useFarmStore.getState().load(DEMO_USER_ID, { silent: true });
    assert.deepEqual([useFarmStore.getState().records, useFarmStore.getState().momo], [[], []]);
    assert.deepEqual(sent, [], 'nothing was sent');

    // An admin's "View as farmer" stays strictly read-only.
    useAuthStore.setState({ impersonation: { farmerId: 'f1' } });
    await assert.rejects(
      useFarmStore.getState().addRecord({ type: 'income', amount: 1, date: '2026-11-14' }),
      /Read-only while viewing as farmer/,
    );
  } finally {
    global.fetch = originalFetch;
    useAuthStore.setState({ session: null, impersonation: null });
  }
});

test('the demo dashboard works its figures out from the guest entries only', () => {
  const { demoDashboardSummary, demoScore } = require('../lib/demo-summary.ts');
  const { calculateCreditScore } = require('../lib/calculations/credit-score.ts');
  const { DEFAULT_CREDIT_CONFIG } = require('../lib/admin/defaults.ts');
  const now = new Date('2026-11-14T10:00:00');
  const rec = (id, type, amount, date) => ({
    id,
    userId: 'guest-demo',
    type,
    amount,
    date,
    description: id,
    crop: 'Maize',
    createdAt: `${date}T09:00:00Z`,
    verificationStatus: 'self_reported',
  });
  const records = [
    rec('a', 'income', 800, '2026-11-02'),
    rec('b', 'expense', 300, '2026-10-20'),
    rec('c', 'income', 999, '2026-01-05'), // outside the 6 months
  ];
  const momo = [
    { id: 'm', direction: 'in', amount: 50, date: '2026-11-03', createdAt: '2026-11-03T09:00:00Z' },
  ];
  const s = demoDashboardSummary(records, momo, 6, now);
  assert.deepEqual([s.income, s.expenses, s.profit], [800, 300, 500]);
  assert.equal(s.momoNet, 50, 'MoMo is tracked separately from farm income');
  assert.deepEqual(s.series.labels, ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
  assert.deepEqual(s.series.income, [0, 0, 0, 0, 0, 800]);
  assert.deepEqual(s.series.expense, [0, 0, 0, 0, 300, 0]);
  assert.equal(s.verifiedShare.entries, 0, 'nobody reviews a demo entry');
  const empty = demoDashboardSummary([], [], 6, now);
  assert.deepEqual([empty.income, empty.expenses, empty.profit], [0, 0, 0], 'never sample data');
  const score = demoScore(records, momo, null, DEFAULT_CREDIT_CONFIG);
  assert.equal(score.score, calculateCreditScore(records, momo, null, DEFAULT_CREDIT_CONFIG).score);
});

test('demo entries stay on the phone for the demo day, tied to its token', async () => {
  const items = fakeBrowser();
  const { useFarmStore } = require('../store/farm-store.ts');
  const { useAuthStore } = require('../store/auth-store.ts');
  const { loadDemoEntries, DEMO_ENTRY_LIMIT } = require('../lib/demo-entries.ts');
  const { DEMO_USER_ID } = require('../lib/demo.ts');
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error('the demo must not call the API');
  };
  try {
    const demo = startDemo();
    useAuthStore.setState({
      session: { userId: DEMO_USER_ID, isGuest: true },
      impersonation: null,
    });
    useFarmStore.setState({
      userId: DEMO_USER_ID,
      records: [],
      momo: [],
      diagnoses: [],
      status: 'ready',
    });
    await useFarmStore.getState().addRecord({
      type: 'income',
      description: 'Sale',
      crop: 'Maize',
      amount: 40,
      date: '2026-11-14',
    });
    const kept = JSON.parse(items.get('agrictec:demo-entries'));
    assert.equal(kept.token, demo.token);
    assert.equal(loadDemoEntries().records.length, 1, 'still there after a refresh');

    // A new demo never sees an older one's entries.
    endDemo();
    assert.equal(items.has('agrictec:demo-entries'), false, 'deleted with the token');
    startDemo();
    items.set('agrictec:demo-entries', JSON.stringify(kept));
    assert.equal(loadDemoEntries().records.length, 0);

    // The demo keeps at most DEMO_ENTRY_LIMIT of each.
    useFarmStore.setState({
      records: Array.from({ length: DEMO_ENTRY_LIMIT }, (_, i) => ({
        id: `r${i}`,
        date: '2026-11-14',
        createdAt: 'x',
      })),
    });
    await assert.rejects(
      useFarmStore.getState().addRecord({ type: 'income', amount: 1, date: '2026-11-14' }),
      /up to 100 entries/,
    );
  } finally {
    global.fetch = originalFetch;
    useAuthStore.setState({ session: null, impersonation: null });
    leaveBrowser();
  }
});

test('moving the end time later ends the demo instead of extending it', () => {
  const items = fakeBrowser();
  try {
    const demo = startDemo();
    const longer = {
      ...demo,
      expiresAt: new Date(Date.parse(demo.expiresAt) + DEMO_DAY_MS).toISOString(),
    };
    items.set('agrictec:demo', JSON.stringify(longer));
    assert.equal(currentDemo(), null);
    assert.equal(demoJustEnded(), true);
    assert.equal(items.has('agrictec:demo'), false);
    const future = {
      ...demo,
      startedAt: new Date(Date.now() + DEMO_DAY_MS).toISOString(),
      expiresAt: new Date(Date.now() + 2 * DEMO_DAY_MS).toISOString(),
    };
    items.set('agrictec:demo', JSON.stringify(future));
    assert.equal(currentDemo(), null, 'a start moved forward does not count either');
  } finally {
    leaveBrowser();
  }
});

test('the demo reminds the guest every 10 minutes, across reloads, with something new', () => {
  const items = fakeBrowser();
  const {
    msUntilDemoReminder,
    takeDemoReminder,
    DEMO_REMINDERS,
    DEMO_REMINDER_EVERY_MS,
  } = require('../lib/demo-reminder.ts');
  try {
    const start = Date.parse('2026-11-14T08:00:00Z');
    const min = 60 * 1000;
    startDemo(start);
    // The first one comes 10 minutes in, not on arrival.
    assert.equal(msUntilDemoReminder(start), DEMO_REMINDER_EVERY_MS);
    // A reload 4 minutes in doesn't restart the 10 minutes.
    assert.equal(msUntilDemoReminder(start + 4 * min), 6 * min);
    assert.equal(msUntilDemoReminder(start + 10 * min), 0);
    const first = takeDemoReminder(start + 10 * min);
    assert.equal(msUntilDemoReminder(start + 10 * min), DEMO_REMINDER_EVERY_MS);
    const second = takeDemoReminder(start + 20 * min);
    assert.notEqual(first.title, second.title, 'each reminder says something new');
    assert.deepEqual(first, DEMO_REMINDERS[0]);
    // A clock set back can't put it off for more than 10 minutes.
    assert.ok(msUntilDemoReminder(start - 60 * min) <= DEMO_REMINDER_EVERY_MS);
    for (const r of DEMO_REMINDERS) assert.match(`${r.title} ${r.body}`, /account|Plans/);
    // It goes with the demo.
    endDemo();
    assert.equal(items.has('agrictec:demo-reminder'), false);
  } finally {
    leaveBrowser();
  }
});

test('the app tour has six explained steps, each pointing at the real place', () => {
  const { tourSteps } = require('../lib/tour.ts');
  const farmer = tourSteps({ guest: false, loans: true });
  assert.deepEqual(
    farmer.map((s) => s.id),
    ['welcome', 'records', 'momo', 'score', 'loans', 'settings'],
  );
  for (const step of farmer) assert.ok(step.title && step.body.length > 60, step.id);
  assert.deepEqual(farmer[0].targets, [], 'the welcome is a card in the middle');
  assert.ok(farmer[1].targets.some((t) => t.includes('a[href="/records"]')));
  assert.deepEqual(farmer[3].targets, ['[data-tour="score"]']);
  assert.match(farmer[2].elsewhere, /under Menu/, 'a phone is told where MoMo is');
  // A turned-off feature isn't described.
  assert.equal(
    tourSteps({ guest: false, loans: false }).some((s) => s.id === 'loans'),
    false,
  );
  // Guests hear about the one-day demo and are invited to create an account.
  const guest = tourSteps({ guest: true, loans: true });
  assert.match(guest[0].body, /one day/);
  assert.match(guest.at(-1).title, /start for real/);
});

test('finishing or skipping the tour: a guest on the phone (sent nowhere), a farmer on the account', async () => {
  const items = fakeBrowser();
  const { recordTourSeen, guestSawTour } = require('../lib/tour.ts');
  const originalFetch = global.fetch;
  const sent = [];
  global.fetch = async (url, options) => {
    sent.push(`${options.method} ${url}`);
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => '{"tourSeenAt":"2026-11-14T09:00:00Z"}',
    };
  };
  try {
    startDemo();
    assert.equal(guestSawTour(), false);
    assert.equal(await recordTourSeen(true), null);
    assert.equal(guestSawTour(), true);
    assert.deepEqual(sent, [], 'a guest sends nothing');
    endDemo();
    assert.equal(items.has('agrictec:demo-tour'), false, 'it goes with the demo');

    const saved = await recordTourSeen(false);
    assert.equal(saved.tourSeenAt, '2026-11-14T09:00:00Z');
    assert.deepEqual(sent, ['POST /api/v1/me/tour']);
  } finally {
    global.fetch = originalFetch;
    leaveBrowser();
  }
});
