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

const {
  ADMIN_ROLES,
  ALL_PERMISSIONS,
  PermissionError,
  assertCan,
  can,
  canAll,
  canAny,
  canManageRole,
} = require('../lib/admin/permissions.ts');
const {
  ADMIN_NAV_ITEMS,
  ADMIN_PAGE_META,
  findAdminNavItem,
  getAdminNavForRole,
  getAdminPageMeta,
} = require('../constants/admin-navigation.ts');

/** Reads the role × permission table from admin spec Section 2, so the code is checked against the spec itself. */
function readSpecMatrix() {
  const spec = fs.readFileSync(path.join(root, 'AGRICTEC_ADMIN_SPEC.md'), 'utf8');
  const lines = spec.split(/\r?\n/);
  const headerIndex = lines.findIndex((l) => /^\|\s*Permission\s*\|/.test(l));
  assert.notEqual(headerIndex, -1, 'permission table not found in AGRICTEC_ADMIN_SPEC.md');
  const cells = (line) =>
    line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
  const roles = cells(lines[headerIndex]).slice(1);
  const matrix = {};
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith('|')) break;
    const [permission, ...marks] = cells(line);
    matrix[permission] = Object.fromEntries(roles.map((r, i) => [r, marks[i] === '✅']));
  }
  return { roles, matrix };
}

test('the permission matrix matches admin spec Section 2 exactly', () => {
  const { roles, matrix } = readSpecMatrix();
  assert.deepEqual([...roles].sort(), [...ADMIN_ROLES].sort());
  assert.deepEqual(Object.keys(matrix), [...ALL_PERMISSIONS]);

  // Prints the role × permission grid that the phase asks for, so it can be eyeballed.
  const grid = ALL_PERMISSIONS.map((p) => ({
    permission: p,
    ...Object.fromEntries(ADMIN_ROLES.map((r) => [r, can(r, p) ? '✅' : ''])),
  }));
  console.table(grid);

  for (const permission of ALL_PERMISSIONS) {
    for (const role of ADMIN_ROLES) {
      assert.equal(
        can(role, permission),
        matrix[permission][role],
        `can('${role}', '${permission}') should be ${matrix[permission][role]}`,
      );
    }
  }
});

test('farmers, missing roles and unknown roles have zero admin permissions', () => {
  assert.equal(can('farmer', 'overview.view'), false);
  for (const role of ['farmer', undefined, null, '', 'toString', 'constructor', 'root']) {
    for (const permission of ALL_PERMISSIONS) {
      assert.equal(can(role, permission), false, `${String(role)} must not have ${permission}`);
    }
    assert.equal(canAny(role, ALL_PERMISSIONS), false);
    assert.equal(canAll(role, ALL_PERMISSIONS), false);
    assert.deepEqual(getAdminNavForRole(role), []);
  }
});

test('canAll needs every permission and never grants an empty list', () => {
  assert.equal(canAll('super_admin', ALL_PERMISSIONS), true);
  assert.equal(canAll('admin', ['farmers.view', 'farmers.suspend']), true);
  assert.equal(canAll('admin', ['farmers.view', 'farmers.delete']), false);
  assert.equal(canAll('super_admin', []), false);
  assert.equal(canAny('analyst', ['credit.configure', 'reports.export']), true);
});

test('only a super admin manages roles, and the last super admin cannot be removed', () => {
  for (const actor of ['analyst', 'support', 'admin']) {
    for (const target of ADMIN_ROLES) assert.equal(canManageRole(actor, target), false);
  }
  for (const target of ADMIN_ROLES) assert.equal(canManageRole('super_admin', target), true);

  const last = { activeSuperAdmins: 1 };
  assert.equal(canManageRole('super_admin', 'super_admin', { ...last, nextRole: 'admin' }), false);
  assert.equal(
    canManageRole('super_admin', 'super_admin', { ...last, nextRole: 'disabled' }),
    false,
  );
  assert.equal(
    canManageRole('super_admin', 'super_admin', { ...last, nextRole: 'super_admin' }),
    true,
  );
  assert.equal(
    canManageRole('super_admin', 'super_admin', { activeSuperAdmins: 2, nextRole: 'analyst' }),
    true,
  );
  assert.equal(canManageRole('super_admin', 'admin', { ...last, nextRole: 'super_admin' }), true);
});

test('assertCan throws a readable PermissionError', () => {
  assert.doesNotThrow(() => assertCan('super_admin', 'data.manage'));
  assert.throws(
    () => assertCan('support', 'credit.configure'),
    (error) => {
      assert.ok(error instanceof PermissionError);
      assert.equal(error.message, 'You do not have permission to change the credit rules.');
      return true;
    },
  );
  assert.throws(() => assertCan('farmer', 'overview.view'), PermissionError);
  assert.throws(() => assertCan(undefined, 'overview.view'), PermissionError);
});

test('admin navigation follows spec Section 7 and hides what a role cannot use', () => {
  const expected = {
    Dashboard: 'overview.view',
    'All Farmers': 'farmers.view',
    Verifications: 'verifications.review',
    'Risk & Fraud': 'risk.review',
    'Loan Applications': 'loans.view',
    Lenders: 'lenders.manage',
    'Credit Rules': 'credit.configure',
    'Market Price Management': 'content.manage',
    Weather: 'content.manage',
    'Crops & Yields': 'content.manage',
    'AI Assistant': 'content.manage',
    'Crop Diagnoses': 'content.manage',
    Announcements: 'announcements.send',
    'Reports & Analytics': 'reports.export',
    'Team & Roles': 'admins.manage',
    'Audit Log': 'audit.view',
    'System Settings': 'settings.manage',
  };
  assert.deepEqual(
    Object.fromEntries(ADMIN_NAV_ITEMS.map((i) => [i.label, i.permission])),
    expected,
  );
  for (const item of ADMIN_NAV_ITEMS)
    assert.ok(ADMIN_PAGE_META[item.href], `meta for ${item.href}`);

  const labels = (role) => getAdminNavForRole(role).flatMap((s) => s.items.map((i) => i.label));
  assert.equal(labels('super_admin').length, ADMIN_NAV_ITEMS.length);
  assert.deepEqual(labels('analyst'), [
    'Dashboard',
    'All Farmers',
    'Loan Applications',
    'Reports & Analytics',
  ]);
  assert.ok(!labels('support').includes('Credit Rules'));
  assert.ok(!getAdminNavForRole('support').some((s) => s.title === 'System'));
});

test('route lookups pick the most specific page', () => {
  assert.equal(findAdminNavItem('/admin').label, 'Dashboard');
  assert.equal(findAdminNavItem('/admin/farmers').label, 'All Farmers');
  assert.equal(findAdminNavItem('/admin/farmers/abc-123').label, 'All Farmers');
  assert.equal(findAdminNavItem('/admin/credit-rules').label, 'Credit Rules');
  assert.equal(findAdminNavItem('/dashboard'), undefined);
  assert.equal(getAdminPageMeta('/admin/loans/APP-1').title, 'Loan Applications');
  assert.equal(getAdminPageMeta('/admin/content/crops').title, 'Crops & Yields');
  assert.equal(getAdminPageMeta('/admin/unknown').title, 'Overview');
});
