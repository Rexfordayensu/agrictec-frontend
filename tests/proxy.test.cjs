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
const { addressSource, apiRequestHeaders, plainAddress, proxy } = require('../proxy.ts');
const { NextRequest } = require('next/server');

const SECRET = 's3cret-shared-with-the-api';

test('an expired farmer cookie cannot bounce sign-in back to a protected page', () => {
  for (const target of [
    '/login',
    '/login?next=%2Fdashboard',
    '/login?reason=expired',
    '/forgot-password',
    '/signup',
  ]) {
    const response = proxy(
      new NextRequest('https://app.example.test' + target, {
        headers: { cookie: 'agrictec_session=expired; agrictec_onboarded=1' },
      }),
    );
    assert.equal(response.status, 200, target);
    assert.equal(response.headers.get('location'), null, target);
  }
  const protectedPage = proxy(new NextRequest('https://app.example.test/dashboard'));
  assert.equal(protectedPage.status, 307);
  assert.equal(new URL(protectedPage.headers.get('location')).pathname, '/login');
  const adminPage = proxy(
    new NextRequest('https://app.example.test/admin', {
      headers: { cookie: 'agrictec_session=expired' },
    }),
  );
  assert.equal(new URL(adminPage.headers.get('location')).pathname, '/admin-login');
});

test('the app vouches for the visitor it served, and visitors cannot vouch for themselves', () => {
  const incoming = new Headers({
    'x-real-ip': '102.176.65.12',
    'x-forwarded-for': '1.2.3.4, 102.176.65.12',
    'x-agrictec-client-ip': '9.9.9.9',
    'x-agrictec-proxy-secret': 'a guess',
    cookie: 'agrictec_session=abc',
  });
  const onVercel = apiRequestHeaders(incoming, SECRET, 'vercel');
  assert.equal(onVercel.get('x-agrictec-client-ip'), '102.176.65.12');
  assert.equal(onVercel.get('x-agrictec-proxy-secret'), SECRET);
  assert.equal(onVercel.get('cookie'), 'agrictec_session=abc', 'Everything else is passed on');

  // Behind Caddy (deploy/, TRUST_FORWARDED_FOR=1): the last X-Forwarded-For entry, never the
  // visitor's own x-real-ip.
  const selfHosted = apiRequestHeaders(
    new Headers({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.2.3.4, 41.66.200.7' }),
    SECRET,
    'forwarded-for',
  );
  assert.equal(selfHosted.get('x-agrictec-client-ip'), '41.66.200.7');

  // Anywhere else nothing is trustworthy: a visitor reaching the app directly writes
  // X-Forwarded-For and x-real-ip themselves, so neither is vouched for.
  const direct = apiRequestHeaders(
    new Headers({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '9.9.9.9' }),
    SECRET,
    'none',
  );
  assert.equal(direct.get('x-agrictec-client-ip'), null);
  assert.equal(direct.get('x-agrictec-proxy-secret'), null);

  // Only a plain address is vouched for.
  const junk = apiRequestHeaders(
    new Headers({ 'x-real-ip': '1.2.3.4, 5.6.7.8' }),
    SECRET,
    'vercel',
  );
  assert.equal(junk.get('x-agrictec-client-ip'), null);

  // Without the secret configured nothing is vouched for, and a visitor's attempt is dropped.
  const off = apiRequestHeaders(incoming, undefined, 'vercel');
  assert.equal(off.get('x-agrictec-client-ip'), null);
  assert.equal(off.get('x-agrictec-proxy-secret'), null);
});

test('the address source is Vercel, an opted-in proxy, or nothing', () => {
  assert.equal(addressSource({ VERCEL: '1' }), 'vercel');
  assert.equal(addressSource({ TRUST_FORWARDED_FOR: '1' }), 'forwarded-for');
  assert.equal(addressSource({}), 'none');
  assert.equal(plainAddress(' 102.176.65.12 '), '102.176.65.12');
  assert.equal(plainAddress('2001:db8::1'), '2001:db8::1');
  assert.equal(plainAddress('999.1.1.1'), null);
  assert.equal(plainAddress('<script>'), null);
});
