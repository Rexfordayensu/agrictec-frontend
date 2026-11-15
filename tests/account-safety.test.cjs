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
// Run: node --test tests/account-safety.test.cjs
// Second audit: contact exports by role, closing an account, changing a password, and a name
// change sending an approved Ghana Card back to review.
const { canExportContacts, CONTACT_COLUMNS } = require('../lib/admin/permissions.ts');

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('only Admin and Super admin export farmers’ contact details in bulk', () => {
  assert.equal(canExportContacts('super_admin'), true);
  assert.equal(canExportContacts('admin'), true);
  for (const role of ['analyst', 'support', 'farmer', null, undefined]) {
    assert.equal(canExportContacts(role), false, String(role));
  }
  assert.deepEqual(CONTACT_COLUMNS, ['email', 'phone']);
  assert.match(read('components/admin/reports/report-builder.tsx'), /canExportContacts\(role\)/);
});

test('a farmer can close their account and change their password', () => {
  const data = read('components/settings/data-settings.tsx');
  assert.match(data, /Delete my account/);
  assert.match(data, /deleteAccount\(closePassword, closeConfirmation\)/);
  assert.match(data, /\/login\?reason=closed/);
  assert.match(read('lib/data/backup.ts'), /'\/me\/delete-account'/);
  const card = read('components/settings/change-password-card.tsx');
  assert.match(card, /'\/me\/password'/);
  // A code emailed to the account's email first: it proves the email is the farmer's.
  assert.match(card, /'\/me\/password\/code'/);
  assert.match(card, /code: code\.trim\(\)/);
  assert.match(card, /autoComplete="one-time-code"/);
  assert.match(card, /session\.isGuest\) return null/);
  assert.match(read('app/(main)/settings/account/page.tsx'), /<ChangePasswordCard \/>/);
});

test('renaming warns that an approved Ghana Card goes back to review', () => {
  const form = read('components/profile/personal-info-form.tsx');
  assert.match(form, /ghanaCard\.status === 'verified'/);
  assert.match(form, /sends the card back to AgriCtec for review/);
});

test('the privacy policy matches what the app does', () => {
  const policy = read('app/(legal)/privacy/page.tsx');
  assert.match(policy, /Delete\s+my account/);
  assert.match(policy, /phone number\s+and farm details/);
  assert.match(policy, /transaction statement/);
  assert.doesNotMatch(policy, /stay on record after that, without your contact details/);
});
