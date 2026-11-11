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


// Run: node --test tests/security.test.cjs
const { safeNextPath, farmerPasswordProblem } = require('../components/auth/auth-schemas.ts');
const { safeAdminNext } = require('../components/admin/auth/admin-auth-schemas.ts');
const { safeImageThumb } = require('../lib/profile-photo.ts');

test('?next= only ever leads to a page of this site', () => {
  for (const ok of ['/records', '/loans?tab=apply', '/market#prices']) assert.equal(safeNextPath(ok), ok);
  for (const bad of [
    undefined,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '\\/evil.example',
    '/\tt/evil.example',
    '/\n/evil.example',
    '/\t/evil.example',
    '/%09/evil.example'.replace('%09', '\t'),
    'javascript:alert(1)',
    '/api/v1/auth/logout',
  ])
    assert.equal(safeNextPath(bad), '/dashboard', String(bad));
  // Resolved as the browser would: dot segments can't climb out.
  assert.equal(safeNextPath('/a/../records'), '/records');
});

test('the admin ?next= stays inside the console', () => {
  assert.equal(safeAdminNext('/admin/farmers?status=active'), '/admin/farmers?status=active');
  for (const bad of ['/admin/../dashboard', '/administrator', '//evil.example/admin', '/\t/evil.example/admin', '/dashboard'])
    assert.equal(safeAdminNext(bad), '/admin', bad);
});

test('new farmer passwords need 8+ characters with a letter and a number', () => {
  assert.equal(farmerPasswordProblem('password123'), null);
  assert.match(farmerPasswordProblem('short1'), /at least 8/);
  assert.match(farmerPasswordProblem('onlyletters'), /letter and one number/);
  assert.match(farmerPasswordProblem('12345678'), /letter and one number/);
});

test('diagnosis thumbnails are inline JPEGs only, never links to another site', () => {
  const thumb = 'data:image/jpeg;base64,/9j/2Q==';
  assert.equal(safeImageThumb(thumb), thumb);
  for (const bad of [
    'https://evil.example/pixel.png',
    '//evil.example/pixel.png',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'javascript:alert(1)',
    null,
  ])
    assert.equal(safeImageThumb(bad), undefined);
});

const signInLock = require('../components/auth/sign-in-lock.tsx');
const { ApiError } = require('../services/api.ts');

test('a sign-in lock names the Ghana time it ends, never earlier, and only for a 423 lock', () => {
  const until = '2026-11-11T14:35:20.000Z';
  const locked = new ApiError('Too many attempts.', 423, 'locked', { until });
  assert.equal(signInLock.lockedUntil(locked), until);
  assert.equal(signInLock.lockedUntil(new ApiError('Incorrect email or password', 401, 'bad_credentials')), null);
  assert.equal(signInLock.lockedUntil(new ApiError('x', 423, 'locked', { until: 'not a date' })), null);
  // 14:35:20 GMT rounds up to 14:36: the time shown is never before the lock really ends.
  assert.match(signInLock.signInAgainAt(until), /^2:36\s?(pm|PM)$/);
  assert.match(signInLock.signInAgainAt('2026-11-11T09:05:00.000Z'), /^9:05\s?(am|AM)$/);
});

const reminder = require('../lib/ghana-card-reminder.ts');

test('the Ghana Card reminder: a minute after opening, every 10 minutes on "later", none after "not now"', () => {
  const who = { isGuest: false, readOnly: false };
  assert.equal(reminder.needsReminder('not_provided', who), true);
  assert.equal(reminder.needsReminder('rejected', who), true);
  // Nothing to do while a card is under review or verified, and never for guests or admins.
  assert.equal(reminder.needsReminder('pending', who), false);
  assert.equal(reminder.needsReminder('verified', who), false);
  assert.equal(reminder.needsReminder('not_provided', { isGuest: true, readOnly: false }), false);
  assert.equal(reminder.needsReminder('not_provided', { isGuest: false, readOnly: true }), false);

  const opened = 1_000_000;
  const first = reminder.startReminder(null, opened);
  assert.equal(reminder.msUntilDue(first, opened), 60_000);
  // Moving between pages or reloading keeps the schedule rather than restarting the minute.
  assert.deepEqual(reminder.startReminder(first, opened + 30_000), first);
  assert.equal(reminder.msUntilDue(first, opened + 90_000), 0);

  const later = reminder.remindLater(opened + 90_000);
  assert.equal(reminder.msUntilDue(later, opened + 90_000), 10 * 60_000);
  assert.equal(reminder.msUntilDue(reminder.dismissForVisit(later), opened + 2 * 3_600_000), null);
});
