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
process.env.ADMIN_PATH = '/staff-test';
process.env.NEXT_PUBLIC_ADMIN_PATH = '/staff-test';
const { addressSource, apiRequestHeaders, plainAddress, proxy } = require('../proxy.ts');
const { NextRequest } = require('next/server');

const SECRET = 's3cret-shared-with-the-api';

test('admin sign-in stays reachable with expired or revoked session cookies', () => {
  for (const target of [
    '/staff-test/login',
    '/staff-test/login?reason=timeout',
    '/staff-test/login?next=%2Fadmin%2Ffarmers',
  ]) {
    const response = proxy(
      new NextRequest('https://app.example.test' + target, {
        headers: { cookie: 'agrictec_admin=expired; agrictec_role=super_admin' },
      }),
    );
    assert.equal(response.status, 200, target);
    assert.equal(response.headers.get('location'), null, target);
  }
  // Keeping sign-in open does not grant console access without an admin cookie.
  const response = proxy(new NextRequest('https://app.example.test/staff-test/farmers'));
  const target = new URL(response.headers.get('location'));
  assert.equal(target.pathname, '/staff-test/login');
  assert.equal(target.searchParams.get('next'), '/staff-test/farmers');
});

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
    new NextRequest('https://app.example.test/staff-test', {
      headers: { cookie: 'agrictec_session=expired' },
    }),
  );
  assert.equal(new URL(adminPage.headers.get('location')).pathname, '/staff-test/login');
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

test('legacy admin pages return 404 for every cookie state, without revealing the configured entry', () => {
  for (const cookie of ['', 'agrictec_admin=expired', 'agrictec_session=farmer']) {
    for (const pathname of [
      '/admin',
      '/admin/',
      '/admin/farmers',
      '/admin-login',
      '/admin-login/nested',
      '/Admin',
      '/%61dmin',
    ]) {
      const response = proxy(
        new NextRequest('https://app.example.test' + pathname, { headers: { cookie } }),
      );
      assert.equal(response.status, 404, pathname);
      assert.equal(response.headers.get('location'), null);
      assert.equal(
        new URL(response.headers.get('x-middleware-rewrite')).pathname,
        '/_admin-path-not-found',
      );
    }
  }
});

test('configured console URLs preserve query strings, session checks and internal API URLs', () => {
  const login = proxy(new NextRequest('https://app.example.test/staff-test/login?reason=timeout'));
  assert.equal(new URL(login.headers.get('x-middleware-rewrite')).pathname, '/admin-login');
  assert.equal(new URL(login.headers.get('x-middleware-rewrite')).search, '?reason=timeout');
  const signedIn = proxy(
    new NextRequest('https://app.example.test/staff-test/farmers/123?tab=records', {
      headers: { cookie: 'agrictec_admin=test' },
    }),
  );
  assert.equal(
    new URL(signedIn.headers.get('x-middleware-rewrite')).pathname,
    '/admin/farmers/123',
  );
  assert.equal(new URL(signedIn.headers.get('x-middleware-rewrite')).search, '?tab=records');
  const api = proxy(new NextRequest('https://app.example.test/api/v1/admin/auth/session'));
  assert.equal(api.headers.get('x-middleware-next'), '1');
});

test('admin path validation and links handle nested prefixes and dollar signs', () => {
  const { normalizeAdminPath, adminPath } = require('../lib/admin-path.ts');
  assert.equal(normalizeAdminPath('  staff$entry/  '), '/staff$entry');
  assert.equal(normalizeAdminPath('/staff/console/'), '/staff/console');
  assert.equal(normalizeAdminPath(undefined), '');
  for (const value of [
    '/admin',
    '/Admin/nested',
    '/api/console',
    '/dashboard',
    '//example.com',
    '/staff?key=x',
    '/staff/../admin',
  ]) {
    assert.throws(() => normalizeAdminPath(value));
  }
  assert.equal(adminPath('/admin'), '/staff-test');
  assert.equal(adminPath('/admin/farmers?id=1'), '/staff-test/farmers?id=1');
  assert.equal(adminPath('/admin-login?reason=timeout'), '/staff-test/login?reason=timeout');
  const { safeAdminNext } = require('../components/admin/auth/admin-auth-schemas.ts');
  assert.equal(safeAdminNext('/staff-test/farmers/123'), '/staff-test/farmers/123');
  assert.equal(safeAdminNext('/admin/farmers/123'), '/staff-test');
  assert.equal(safeAdminNext('https://elsewhere.test'), '/staff-test');
});

test('admin navigation and breadcrumbs stay within the configured prefix', () => {
  const { ADMIN_NAV_ITEMS, getAdminPageMeta } = require('../constants/admin-navigation.ts');
  const { adminBreadcrumbs } = require('../components/admin/layout/admin-breadcrumbs.ts');
  assert.ok(
    ADMIN_NAV_ITEMS.every(
      (item) => item.href === '/staff-test' || item.href.startsWith('/staff-test/'),
    ),
  );
  assert.equal(getAdminPageMeta('/staff-test/farmers/123').title, 'All Farmers');
  const crumbs = adminBreadcrumbs('/staff-test/farmers/123', { farmers: [], applications: [] });
  assert.ok(crumbs.some((crumb) => crumb.href === '/staff-test/farmers'));
  assert.ok(crumbs.every((crumb) => !crumb.href || crumb.href.startsWith('/staff-test')));
});

test('public farmer URLs never reveal the admin entry through a forged cookie', () => {
  const response = proxy(
    new NextRequest('https://app.example.test/dashboard', {
      headers: { cookie: 'agrictec_admin=forged' },
    }),
  );
  assert.equal(new URL(response.headers.get('location')).pathname, '/login');
});

test('back from "View as farmer": only a signed-in admin is sent on, never a made-up cookie', async () => {
  const originalFetch = global.fetch;
  const asked = [];
  try {
    // No admin cookie at all: the same 404 as any unknown page.
    let response = await proxy(
      new NextRequest('https://app.example.test/console-return?to=%2Ffarmers'),
    );
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('location'), null);

    // A made-up admin cookie: the API says no, so the console's address is never shown.
    global.fetch = async (url, options) => {
      asked.push([String(url), options.headers.cookie]);
      return { ok: false, status: 401 };
    };
    response = await proxy(
      new NextRequest('https://app.example.test/console-return?to=%2Ffarmers', {
        headers: { cookie: 'agrictec_admin=made-up' },
      }),
    );
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('location'), null);
    assert.match(asked[0][0], /\/api\/v1\/admin\/auth\/session$/);
    assert.equal(asked[0][1], 'agrictec_admin=made-up');

    // A real admin session: on to that console page.
    global.fetch = async () => ({ ok: true, status: 200 });
    response = await proxy(
      new NextRequest(
        'https://app.example.test/console-return?to=%2Ffarmers%2F42%3Fimpersonation%3Dexpired',
        {
          headers: { cookie: 'agrictec_admin=real' },
        },
      ),
    );
    const to = new URL(response.headers.get('location'));
    assert.equal(to.pathname, '/staff-test/farmers/42');
    assert.equal(to.searchParams.get('impersonation'), 'expired');

    // Another site or a full URL is never followed.
    for (const bad of ['//evil.example', 'https://evil.example', '/x/../../y', 'farmers']) {
      response = await proxy(
        new NextRequest(`https://app.example.test/console-return?to=${encodeURIComponent(bad)}`, {
          headers: { cookie: 'agrictec_admin=real' },
        }),
      );
      assert.equal(new URL(response.headers.get('location')).pathname, '/staff-test', bad);
    }
  } finally {
    global.fetch = originalFetch;
  }
});
