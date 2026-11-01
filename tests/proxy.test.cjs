/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS hooks load the app's TypeScript without an extra test dependency. */
// Run: node --test tests/proxy.test.cjs
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
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const { apiRequestHeaders } = require('../proxy.ts');

const SECRET = 's3cret-shared-with-the-api';

test('the app vouches for the visitor it served, and visitors cannot vouch for themselves', () => {
  const incoming = new Headers({
    'x-real-ip': '102.176.65.12',
    'x-forwarded-for': '1.2.3.4, 102.176.65.12',
    'x-agrictec-client-ip': '9.9.9.9',
    'x-agrictec-proxy-secret': 'a guess',
    cookie: 'agrictec_session=abc',
  });
  const onVercel = apiRequestHeaders(incoming, SECRET, true);
  assert.equal(onVercel.get('x-agrictec-client-ip'), '102.176.65.12');
  assert.equal(onVercel.get('x-agrictec-proxy-secret'), SECRET);
  assert.equal(onVercel.get('cookie'), 'agrictec_session=abc', 'Everything else is passed on');

  // Behind Caddy (deploy/): the last X-Forwarded-For entry, never the visitor's own x-real-ip.
  const selfHosted = apiRequestHeaders(
    new Headers({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.2.3.4, 41.66.200.7' }),
    SECRET,
    false,
  );
  assert.equal(selfHosted.get('x-agrictec-client-ip'), '41.66.200.7');

  // Without the secret configured nothing is vouched for, and a visitor's attempt is dropped.
  const off = apiRequestHeaders(incoming, undefined, true);
  assert.equal(off.get('x-agrictec-client-ip'), null);
  assert.equal(off.get('x-agrictec-proxy-secret'), null);
});
