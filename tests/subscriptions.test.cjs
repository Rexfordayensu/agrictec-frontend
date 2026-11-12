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

const values = new Map();
const localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
const { normalizePlans, planAccess, PLAN_CATALOG } = require('../lib/subscriptions/plans.ts');
const { plansSchema } = require('../lib/admin/schemas.ts');
global.window = { localStorage, sessionStorage: localStorage };

test('four monthly tiers use the agreed prices and older catalogues keep custom settings', () => {
  assert.deepEqual(
    PLAN_CATALOG.map((p) => [p.id, p.priceGHS]),
    [
      ['free', 0],
      ['basic', 25],
      ['premium', 50],
      ['advanced', 100],
    ],
  );
  const legacy = normalizePlans([
    { id: 'free', name: 'Free Plan', priceGHS: 0, active: true, features: ['AI assistant'] },
    {
      id: 'premium',
      name: 'Custom premium',
      priceGHS: 35,
      active: false,
      features: ['Custom benefit'],
    },
  ]);
  assert.equal(legacy.length, 4);
  assert.equal(legacy[2].priceGHS, 35);
  assert.equal(legacy[2].active, false);
  assert.equal(legacy[2].name, 'Custom premium');
  assert.equal(planAccess(legacy[0]).aiAssistant, false);
  assert.equal(plansSchema.safeParse(PLAN_CATALOG).success, true);
  assert.equal(
    plansSchema.safeParse(PLAN_CATALOG.map((p) => (p.id === 'free' ? { ...p, active: false } : p)))
      .success,
    false,
  );
  assert.equal(
    plansSchema.safeParse(
      PLAN_CATALOG.map((p) => (p.id === 'premium' ? { ...p, aiCredits: null } : p)),
    ).success,
    false,
  );
});

test('the AI credit pop-up warns once at 90 percent and once when finished, surviving navigation and reload', () => {
  const alertModule = '../lib/subscriptions/usage-alert.ts';
  let { claimAiUsageAlert } = require(alertModule);
  const base = {
    subscription: { userId: 'toast-farmer', planId: 'premium', status: 'active' },
    creditsUsed: 0,
    creditsLimit: 100,
    creditsRemaining: 100,
    resetsAt: '2026-11-01T00:00:00.000Z',
  };
  const snapshot = (creditsUsed, patch = {}) => ({
    ...base,
    creditsUsed,
    creditsLimit: 100,
    creditsRemaining: Math.max(0, 100 - creditsUsed),
    ...patch,
  });
  assert.equal(claimAiUsageAlert(snapshot(89)), null);
  const alert = claimAiUsageAlert(snapshot(90));
  assert.match(alert.title, /nearly finished/);
  assert.match(alert.description, /90%.*10 credits remain.*upgrade/);
  assert.equal(alert.level, 'low');
  assert.equal(claimAiUsageAlert(snapshot(91)), null);
  // Running out is a second, final notice for the month.
  const finished = claimAiUsageAlert(snapshot(100));
  assert.equal(finished.level, 'finished');
  assert.match(finished.title, /finished/);
  assert.match(finished.description, /all your monthly AI credits.*Upgrade your plan.*1 Nov/);
  assert.equal(claimAiUsageAlert(snapshot(100)), null);
  delete require.cache[require.resolve(alertModule)];
  ({ claimAiUsageAlert } = require(alertModule));
  assert.equal(
    claimAiUsageAlert(snapshot(95)),
    null,
    'The monthly warning is remembered after reload',
  );
  assert.ok(
    claimAiUsageAlert(snapshot(90, { resetsAt: '2026-12-01T00:00:00.000Z' })),
    'A new month can warn again',
  );
  const other = snapshot(90, {
    subscription: { ...base.subscription, userId: 'other-toast-farmer' },
  });
  assert.ok(claimAiUsageAlert(other), 'Each account has its own warning');
  assert.equal(
    claimAiUsageAlert(snapshot(500, { creditsLimit: null, creditsRemaining: null })),
    null,
  );
  assert.equal(claimAiUsageAlert(snapshot(0, { creditsLimit: 0, creditsRemaining: 0 })), null);
  const exhausted = claimAiUsageAlert(
    snapshot(100, { subscription: { ...base.subscription, userId: 'exhausted-toast-farmer' } }),
  );
  assert.match(exhausted.title, /finished/);
  assert.equal(exhausted.percentage, 100);
  // Running out first covers the 90% warning too: it never follows later in the month.
  assert.equal(
    claimAiUsageAlert(
      snapshot(95, { subscription: { ...base.subscription, userId: 'exhausted-toast-farmer' } }),
    ),
    null,
  );
});
