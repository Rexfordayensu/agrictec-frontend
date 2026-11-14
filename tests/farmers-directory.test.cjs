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
// Run: node --test tests/farmers-directory.test.cjs
// The console's All Farmers page shows only stored states: nothing is marked verified unless the
// profile says so, and the Ghana Card is never presented as an NIA check.
const { checksOf } = require('../lib/admin/farmer-checks.ts');
const { buildTimeline } = require('../components/admin/farmers/directory/panel-timeline.ts');

const farmer = (verification = {}, card = 'not_provided') => ({
  userId: 'u1',
  email: 'farmer@example.com',
  createdAt: '2026-11-01T08:00:00Z',
  profile: {
    verification: { phone: false, location: false, ghanaCard: false, ...verification },
    ghanaCard: { status: card },
  },
});

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('nothing is shown as verified unless the profile stores it', () => {
  const states = checksOf(farmer()).map((c) => c.state);
  assert.deepEqual(states, ['missing', 'missing', 'missing']);
  const done = checksOf(farmer({ phone: true, location: true, ghanaCard: true }, 'verified'));
  assert.deepEqual(
    done.map((c) => c.state),
    ['verified', 'verified', 'verified'],
  );
});

test('a check waiting for review shows as waiting, a rejected card as rejected', () => {
  const waiting = checksOf(farmer(), ['location']);
  assert.equal(waiting.find((c) => c.kind === 'location').state, 'pending');
  assert.equal(waiting.find((c) => c.kind === 'phone').state, 'missing');
  assert.equal(
    checksOf(farmer({}, 'pending')).find((c) => c.kind === 'ghanaCard').state,
    'pending',
  );
  assert.equal(
    checksOf(farmer({}, 'rejected')).find((c) => c.kind === 'ghanaCard').state,
    'rejected',
  );
  // A waiting request never outranks a stored verification.
  assert.equal(checksOf(farmer({ phone: true }), ['phone'])[0].state, 'verified');
});

test('the Ghana Card is described as an AgriCtec review, never an NIA verification', () => {
  for (const status of ['verified', 'pending', 'rejected', 'not_provided']) {
    const card = checksOf(farmer({ ghanaCard: status === 'verified' }, status)).find(
      (c) => c.kind === 'ghanaCard',
    );
    assert.doesNotMatch(card.description, /NIA verified|verified by (the )?NIA/i);
  }
  const approved = checksOf(farmer({ ghanaCard: true }, 'verified'))[2];
  assert.match(approved.description, /AgriCtec/);
  assert.match(approved.description, /not an NIA check/);
  for (const file of [
    'components/admin/farmers/directory/farmer-cells.tsx',
    'components/admin/farmers/directory/panel-tabs.tsx',
    'components/admin/farmers/directory/farmer-panel.tsx',
  ]) {
    assert.doesNotMatch(read(file), /Ghana Card \(NIA\)|NIA verified/);
  }
});

test('the activity timeline is built from stored events only, newest first', () => {
  const items = buildTimeline(
    farmer(),
    [
      {
        id: 'r1',
        kind: 'ghanaCard',
        status: 'approved',
        submittedAt: '2026-11-02T08:00:00Z',
        reviewedAt: '2026-11-03T08:00:00Z',
        reviewedBy: 'Reviewer',
      },
    ],
    [
      {
        id: 'a1',
        action: 'farmer.suspend',
        summary: 'Suspended Ama: test',
        actorName: 'Admin',
        createdAt: '2026-11-04T08:00:00Z',
      },
      // Verification reviews come from the request itself, not twice.
      {
        id: 'a2',
        action: 'verification.approve',
        summary: 'Approved',
        actorName: 'Admin',
        createdAt: '2026-11-03T08:00:00Z',
      },
    ],
  );
  assert.deepEqual(
    items.map((i) => i.title),
    ['Account suspended', 'Ghana Card approved', 'Ghana Card submitted', 'Account created'],
  );
  // With nothing loaded beyond the account, only its creation is shown (no invented events).
  assert.deepEqual(
    buildTimeline(farmer(), null, null).map((i) => i.title),
    ['Account created'],
  );
});

test('the page reads the API only: no mock data, live reloads on console events', () => {
  const page = read('components/admin/farmers/farmers-table.tsx');
  const panel = read('components/admin/farmers/directory/farmer-panel.tsx');
  assert.match(page, /farmersService\.page/);
  assert.match(page, /reloadKey: `\$\{syncVersion\}:\$\{edits\}`/);
  assert.match(panel, /farmersService\.getDetail\(farmerId\)/);
  assert.match(panel, /syncVersion, version, edits\]/);
  for (const source of [page, panel]) assert.doesNotMatch(source, /mock|faker|sample/i);
  // The "Pending verification" card counts waiting reviews (from the API), not account status.
  assert.match(
    read('components/admin/farmers/directory/farmer-summary-cards.tsx'),
    /summary\?\.pending_review/,
  );
});

test('the farmers page shows record counts only, never a farmer’s amounts', () => {
  for (const file of [
    'components/admin/farmers/directory/farmer-cells.tsx',
    'components/admin/farmers/directory/panel-tabs.tsx',
    'components/admin/farmers/directory/farmer-table.tsx',
    'components/admin/farmers/farmers-table.tsx',
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /formatGHS|formatCompactGHS|stats\.income|stats\.expenses/, file);
  }
});
