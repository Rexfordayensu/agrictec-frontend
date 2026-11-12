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

// Run: node --test tests/applications.test.cjs
const { APPLICATION_STATUS, LENDER_STATUSES } = require('../lib/loans/application-status.ts');
const { lenderFormSchema, emptyLenderForm, formToLenderInput } = require(
  '../components/admin/lenders/lender-schema.ts',
);
const { ADMIN_NAV_ITEMS, getAdminPageMeta } = require('../constants/admin-navigation.ts');

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const backend = (rel) => fs.readFileSync(path.join(root, '..', 'backend', rel), 'utf8');

test('every status the API can return has a look and a hint for the farmer', () => {
  const source = backend('app/services/loan_applications.py');
  const labels = source.slice(source.indexOf('STATUS_LABELS'), source.indexOf('}', source.indexOf('STATUS_LABELS')));
  const statuses = [...labels.matchAll(/"([a-z_]+)":/g)].map((m) => m[1]);
  assert.ok(statuses.length >= 12);
  for (const status of statuses) {
    assert.ok(APPLICATION_STATUS[status], `missing ${status}`);
    assert.ok(APPLICATION_STATUS[status].farmerHint.length > 0);
  }
});

test('lender progress is limited to what a lender can confirm', () => {
  assert.deepEqual(
    [...LENDER_STATUSES].sort(),
    ['approved_by_lender', 'documents_requested', 'received_by_lender', 'rejected_by_lender', 'under_lender_review'],
  );
  // AgriCtec's own steps are never "lender" statuses.
  for (const own of ['approved_for_sending', 'sent_to_lender', 'in_review']) assert.ok(!LENDER_STATUSES.includes(own));
});

test('an applications email needs the date the lender agreed, not in the future', () => {
  const schema = lenderFormSchema([]);
  const base = { ...emptyLenderForm(), name: 'Example Rural Bank' };
  assert.equal(schema.safeParse(base).success, true);
  const noDate = schema.safeParse({ ...base, submissionEmail: 'loans@example.com' });
  assert.equal(noDate.success, false);
  assert.deepEqual(noDate.error.issues[0].path, ['submissionAgreedOn']);
  const future = schema.safeParse({ ...base, submissionEmail: 'loans@example.com', submissionAgreedOn: '2999-01-01' });
  assert.equal(future.success, false);
  const ok = schema.safeParse({ ...base, submissionEmail: 'loans@example.com', submissionAgreedOn: '2026-11-01' });
  assert.equal(ok.success, true);
  const input = formToLenderInput(ok.data);
  assert.equal(input.submissionEmail, 'loans@example.com');
  assert.equal(input.submissionAgreedOn, '2026-11-01');
  assert.equal(formToLenderInput(base).submissionEmail, null);
});

test('the console reviews applications on the new page; the earlier pipeline is read-only', () => {
  const item = ADMIN_NAV_ITEMS.find((i) => i.label === 'Loan Applications');
  assert.equal(item.href, '/admin/applications');
  assert.equal(getAdminPageMeta('/admin/loans').title, 'Earlier applications');
  assert.match(read('components/admin/loans/loan-applications.tsx'), /const canManage = false;/);
  assert.match(read('components/admin/loans/application-detail.tsx'), /const canManage = false &&/);
});

test('the console has no way to approve a loan itself', () => {
  const service = read('services/admin/applications.service.ts');
  assert.doesNotMatch(service, /approved_by_lender['"]\s*\)/);
  const review = read('components/admin/applications/application-review.tsx');
  // A lender update always carries the lender's confirmation file.
  assert.match(review, /disabled=\{!proof \|\|/);
});

test('an application card shows how far it has got', () => {
  const { applicationProgress, isOpenApplication } = require('../lib/loans/application-status.ts');
  assert.deepEqual(applicationProgress('draft'), { done: 0, current: 0 });
  assert.deepEqual(applicationProgress('in_review'), { done: 1, current: 1 });
  assert.deepEqual(applicationProgress('changes_requested'), { done: 1, current: 1 });
  assert.deepEqual(applicationProgress('approved_for_sending'), { done: 2, current: 2 });
  assert.deepEqual(applicationProgress('documents_requested'), { done: 3, current: 3 });
  assert.deepEqual(applicationProgress('approved_by_lender'), { done: 4, current: -1 });
  assert.equal(isOpenApplication('draft'), false);
  assert.equal(isOpenApplication('sent_to_lender'), true);
  assert.equal(isOpenApplication('rejected_by_lender'), false);
  assert.equal(isOpenApplication('withdrawn'), false);
});
