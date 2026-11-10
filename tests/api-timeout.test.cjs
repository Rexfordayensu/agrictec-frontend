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
const { api, apiFile, ApiError } = require('../services/api.ts');

test('a stalled data read aborts and reports a retryable timeout', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const originalFetch = global.fetch;
  let signal;
  global.fetch = async (_url, options) => {
    signal = options.signal;
    return new Promise((_, reject) =>
      signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
    );
  };
  try {
    const pending = api('/me/profile');
    t.mock.timers.tick(30_000);
    await assert.rejects(pending, (error) => error instanceof ApiError && error.code === 'timeout');
    assert.equal(signal.aborted, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test('the deadline covers a stalled JSON or download body after headers arrive', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    text: () => new Promise(() => {}),
  });
  try {
    for (const read of [api, apiFile]) {
      const pending = read('/me/records');
      await Promise.resolve();
      t.mock.timers.tick(30_000);
      await assert.rejects(
        pending,
        (error) => error instanceof ApiError && error.code === 'timeout',
      );
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test('caller cancellation remains an AbortError and successful reads clear their timer', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const originalFetch = global.fetch;
  let signal;
  try {
    global.fetch = async (_url, options) => {
      signal = options.signal;
      return new Promise((_, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
      );
    };
    const controller = new AbortController();
    const pending = api('/me/profile', { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, (error) => error.name === 'AbortError');
    global.fetch = async (_url, options) => {
      signal = options.signal;
      return new Response('{"ok":true}');
    };
    assert.deepEqual(await api('/platform/flags'), { ok: true });
    t.mock.timers.tick(30_000);
    assert.equal(signal.aborted, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('long-running writes are not timed out or retried by the read deadline', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const originalFetch = global.fetch;
  let finish;
  let settled = false;
  let calls = 0;
  global.fetch = () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  try {
    const pending = api('/me/assistant', { method: 'POST', body: { message: 'Local test' } }).then(
      (value) => {
        settled = true;
        return value;
      },
    );
    t.mock.timers.tick(60_000);
    await Promise.resolve();
    assert.equal(settled, false);
    assert.equal(calls, 1);
    finish(new Response('{"ok":true}'));
    assert.deepEqual(await pending, { ok: true });
  } finally {
    global.fetch = originalFetch;
  }
});
