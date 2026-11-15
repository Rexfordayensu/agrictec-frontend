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
// Run: node --test tests/launch-splash.test.cjs
// The installed app's launch splash: the official mark, unchanged; only in the installed app,
// once per launch; no white flash; reduced motion respected.
const markSource = fs.readFileSync(path.join(root, 'components/layout/agrictec-mark.tsx'), 'utf8');
const LEAF = markSource.match(/export const LEAF = '([^']+)'/)[1];
const LINE = markSource.match(/export const LINE = '([^']+)'/)[1];

const splash = fs.readFileSync(path.join(root, 'components/pwa/launch-splash.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'app/layout.tsx'), 'utf8');

test('the splash draws the official AgriCtec mark, unchanged', () => {
  assert.ok(splash.includes(`d="${LEAF}"`), 'the leaf path');
  assert.ok(splash.includes(`points="${LINE}"`), 'the rising line');
  for (const colour of ['#059669', '#34d399', '#f5c451'])
    assert.ok(splash.includes(colour), colour);
  for (const text of [
    'Agri',
    'Ctec',
    'DIGITAL IDENTITY',
    'Growing farms. Building financial futures.',
  ]) {
    assert.ok(splash.includes(text), text);
  }
});

test('it shows only in the installed app, once per launch, and covers the first paint', () => {
  assert.match(splash, /display-mode: standalone/);
  assert.match(splash, /navigator\.standalone===true/);
  assert.match(splash, /sessionStorage\.getItem\('agrictec:splash'\)/);
  // Hidden unless the script shows it: an ordinary tab never flashes it.
  assert.match(css, /#agrictec-splash \{\s*display: none;/);
  // First in <body>, before the page, so nothing paints before it.
  assert.ok(layout.indexOf('<LaunchSplash />') < layout.indexOf('<PageBackground />'));
  assert.ok(layout.indexOf('<LaunchSplash />') < layout.indexOf('<AppProviders>'));
});

test('reduced motion shows it still and briefly; a tap skips it', () => {
  assert.match(splash, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*#agrictec-splash \*/);
  assert.match(splash, /addEventListener\('click',finish\)/);
});
