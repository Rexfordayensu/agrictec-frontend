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
