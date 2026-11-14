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

const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { useProfileStore } = require('../store/profile-store.ts');
const { usePlatformStore } = require('../store/platform-store.ts');
const { VerificationGrid } = require('../components/profile/verification-grid.tsx');
const { GpsField } = require('../components/profile/gps-field.tsx');

function withProfile(overrides, action) {
  const initial = useProfileStore.getInitialState();
  const platform = usePlatformStore.getInitialState();
  const previous = initial.profile;
  const previousRequests = platform.verifications;
  initial.profile = {
    name: 'Test Farmer',
    phone: '+233241234567',
    verification: { phone: false, location: false },
    ghanaCard: { status: 'not_provided' },
    ...overrides,
  };
  platform.verifications = [];
  try {
    action();
  } finally {
    initial.profile = previous;
    platform.verifications = previousRequests;
  }
}

test('verification tiles retain real phone data and unverified actions', () => {
  withProfile({}, () => {
    const html = renderToStaticMarkup(createElement(VerificationGrid));
    assert.match(html, /Your phone is checked by SMS/);
    assert.match(html, /\+233241234567/);
    assert.match(html, /Submit for review/);
    assert.match(html, /Not provided/);
    assert.match(html, /Set location/);
    assert.match(html, /Not set/);
  });
});

test('an AgriCtec pending card stays pending and is never shown as NIA verified', () => {
  withProfile({ ghanaCard: { status: 'pending', masked: 'GHA-***1234' } }, () => {
    const html = renderToStaticMarkup(createElement(VerificationGrid));
    assert.match(html, /Pending review/);
    assert.match(html, /GHA-\*\*\*1234 is waiting for review/);
    assert.doesNotMatch(html, /Submit for review|Verified with NIA/);
  });
});

test('reviewed card and verified phone preserve their states without retry controls', () => {
  withProfile(
    {
      verification: { phone: true, location: true },
      ghanaCard: { status: 'verified', masked: 'GHA-***1234' },
      gps: { lat: 6.7, lng: -1.5 },
    },
    () => {
      const html = renderToStaticMarkup(createElement(VerificationGrid));
      assert.match(html, /Reviewed by AgriCtec, not an NIA identity check/);
      assert.match(html, /Your farm location is verified/);
      assert.doesNotMatch(html, /Submit for review|Set location/);
    },
  );
});

test('GPS card shows only the saved position and keeps the current-location action', () => {
  withProfile({ gps: { lat: 6.7, lng: -1.5 } }, () => {
    const html = renderToStaticMarkup(createElement(GpsField));
    assert.match(html, /6.7000/);
    assert.match(html, /1.5000/);
    assert.match(html, /Get Current Location/);
    assert.match(html, /Open in Google Maps/);
    assert.doesNotMatch(html, /Not set/);
  });
});
