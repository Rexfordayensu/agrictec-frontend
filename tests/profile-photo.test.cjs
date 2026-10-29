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

const values = new Map();
const localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
const { safeProfilePhoto, MAX_PROFILE_PHOTO_LENGTH } = require('../lib/profile-photo.ts');
const { normalizeProfile, profileCompleteness } = require('../lib/profile.ts');
const { useProfileStore } = require('../store/profile-store.ts');
const { useAuthStore } = require('../store/auth-store.ts');
const { ProfileAvatar } = require('../components/profile/profile-avatar.tsx');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
global.window = { localStorage, sessionStorage: localStorage };
const photo = 'data:image/jpeg;base64,/9j/2Q==';

test('legacy profiles keep their completeness; invalid and oversized image sources are discarded', () => {
  const old = normalizeProfile('legacy', { name: 'Ama' });
  assert.equal(old.photoDataUrl, undefined);
  assert.equal(profileCompleteness(old), profileCompleteness({ ...old, photoDataUrl: photo }));
  assert.equal(safeProfilePhoto(photo), photo);
  for (const bad of [
    'https://example.com/photo.jpg',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'javascript:alert(1)',
    'data:image/jpeg;base64,' + 'A'.repeat(MAX_PROFILE_PHOTO_LENGTH),
    123,
  ]) {
    assert.equal(safeProfilePhoto(bad), undefined);
    assert.equal(normalizeProfile('legacy', { ...old, photoDataUrl: bad }).photoDataUrl, undefined);
  }
});

test('photo changes are refused in the admin read-only farmer view', async () => {
  const previous = useAuthStore.getState().impersonation;
  useAuthStore.setState({ impersonation: { farmerId: 'full-storage' } });
  try {
    await assert.rejects(useProfileStore.getState().save({ photoDataUrl: photo }), /Read-only/);
  } finally {
    useAuthStore.setState({ impersonation: previous });
  }
});

test('avatars use the saved local image and show initials when no usable photo exists', () => {
  const render = (photoDataUrl) =>
    renderToStaticMarkup(createElement(ProfileAvatar, { name: 'Ama Mensah', photoDataUrl }));
  assert.match(render(photo), /<img/);
  assert.match(render(photo), /data:image\/jpeg;base64/);
  assert.match(render(undefined), />AM<\/span>/);
  assert.doesNotMatch(render('https://example.com/photo.jpg'), /<img/);
});
