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
for (const extension of ['.ts', '.tsx'])
  require.extensions[extension] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
      },
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

test('it shows only on an installed document launch and covers the first paint', () => {
  assert.match(splash, /display-mode: standalone/);
  assert.match(splash, /navigator\.standalone===true/);
  assert.doesNotMatch(splash, /sessionStorage/);
  // Hidden unless the script shows it: an ordinary tab never flashes it.
  assert.match(css, /#agrictec-splash \{\s*display: none;/);
  // First in <body>, before the page, so nothing paints before it.
  assert.ok(layout.indexOf('<LaunchSplash />') < layout.indexOf('<PageBackground />'));
  assert.ok(layout.indexOf('<LaunchSplash />') < layout.indexOf('<AppProviders>'));
});

test('reduced motion stays still and taps never bypass startup readiness', () => {
  assert.match(splash, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*#agrictec-splash \*/);
  assert.match(splash, /minElapsed=true;check/);
});

const vm = require('node:vm');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { LaunchSplash } = require('../components/pwa/launch-splash.tsx');
const script = renderToStaticMarkup(createElement(LaunchSplash)).match(
  /<script>([\s\S]*?)<\/script>/,
)[1];

function launch({ installed = true, reduced = false, preview = false } = {}) {
  let clock = 0,
    nextId = 0,
    ready = false,
    pending = true,
    notify = () => {},
    reloads = 0;
  const timers = new Map();
  const attrs = new Map([['data-theme', 'light']]);
  const root = {
    setAttribute: (key, value) => attrs.set(key, value),
    removeAttribute: (key) => attrs.delete(key),
    getAttribute: (key) => attrs.get(key),
  };
  const splashAttrs = new Map(),
    clicks = {},
    retryClicks = {};
  const el = {
    setAttribute: (key, value) => splashAttrs.set(key, value),
    addEventListener: (name, callback) => {
      clicks[name] = callback;
    },
  };
  const status = { textContent: '' };
  const retry = {
    hidden: true,
    addEventListener: (name, callback) => {
      retryClicks[name] = callback;
    },
  };
  const meta = { content: 'original' };
  vm.runInNewContext(script, {
    document: {
      documentElement: root,
      getElementById: (id) =>
        ({ 'agrictec-splash': el, 'splash-status': status, 'splash-retry': retry })[id],
      querySelectorAll: () => [meta],
      querySelector: (selector) => (selector.includes('ready') ? ready : pending),
    },
    location: {
      search: preview ? '?splash=1' : '',
      reload: () => {
        reloads++;
      },
    },
    navigator: { standalone: false },
    matchMedia: (query) => ({
      matches: query.includes('reduced-motion')
        ? reduced
        : query.includes('standalone') && installed,
    }),
    MutationObserver: class {
      constructor(callback) {
        notify = callback;
      }
      observe() {}
      disconnect() {
        notify = () => {};
      }
    },
    setTimeout: (fn, delay) => {
      const id = ++nextId;
      timers.set(id, { fn, at: clock + delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  return {
    state: () => splashAttrs.get('data-state'),
    covered: () => attrs.has('data-launch-active'),
    meta,
    status,
    retry,
    tap: () => clicks.click?.(),
    reload: () => retryClicks.click?.(),
    reloads: () => reloads,
    screen: (isReady, isPending = false) => {
      ready = isReady;
      pending = isPending;
      notify();
    },
    advance: (delay) => {
      const end = clock + delay;
      while (true) {
        const next = [...timers]
          .filter(([, task]) => task.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        clock = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
      }
      clock = end;
    },
  };
}

test('saved-session startup stays covered after the animation and cannot be skipped into a loader', () => {
  const app = launch();
  app.advance(5000);
  app.tap();
  assert.equal(app.state(), 'show');
  assert.equal(app.covered(), true);
  app.screen(true);
  assert.equal(app.state(), 'leave');
  app.advance(550);
  assert.equal(app.state(), 'gone');
  assert.equal(app.covered(), false);
  assert.notEqual(app.meta.content, '#0a0e1a');
});

test('fast startup finishes the short animation, and a page fallback keeps it covered', () => {
  const app = launch();
  app.screen(true, true);
  app.advance(1800);
  assert.equal(app.state(), 'show');
  app.screen(true, false);
  assert.equal(app.state(), 'leave');
  const fast = launch();
  fast.screen(true);
  fast.advance(1799);
  assert.equal(fast.state(), 'show');
  fast.advance(1);
  assert.equal(fast.state(), 'leave');
});

test('expired sign-in can redirect while covered, then reveal the sign-in or error screen', () => {
  const app = launch();
  app.advance(3000);
  app.screen(false, true);
  assert.equal(app.state(), 'show');
  app.screen(true);
  assert.equal(app.state(), 'leave');
});

test('ordinary tabs keep their loaders; preview and every installed document get a splash', () => {
  assert.equal(launch({ installed: false }).state(), undefined);
  assert.equal(launch({ installed: false, preview: true }).state(), 'show');
  assert.equal(launch().state(), 'show');
  assert.equal(launch().state(), 'show');
});

test('reduced motion still waits for startup and a stalled launch offers recovery', () => {
  const reduced = launch({ reduced: true });
  reduced.advance(200);
  assert.equal(reduced.state(), 'show');
  reduced.screen(true);
  reduced.advance(120);
  assert.equal(reduced.state(), 'gone');
  const stalled = launch();
  stalled.advance(30000);
  assert.equal(stalled.state(), 'show');
  assert.equal(stalled.retry.hidden, false);
  assert.match(stalled.status.textContent, /Check your connection/);
  stalled.reload();
  assert.equal(stalled.reloads(), 1);
  stalled.screen(true);
  stalled.advance(550);
  assert.equal(stalled.state(), 'gone');
});
