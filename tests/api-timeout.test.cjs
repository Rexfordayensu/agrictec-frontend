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

// A free Render API that is waking up or switching deploys can drop a request: the dev or Vercel
// proxy then answers 500/502/503 without JSON. Reads try again; writes never repeat.
const reply = (status, body = 'Internal Server Error') => ({
  ok: status < 400,
  status,
  headers: new Headers(),
  json: async () => JSON.parse(body),
  text: async () => body,
});

async function settle(t, pending) {
  // Let each attempt finish, then move the clock past the next retry pause.
  // Seen as handled now: the test checks the rejection after the clock has moved.
  pending.catch(() => {});
  for (let i = 0; i < 12; i++) {
    await new Promise((resolve) => setImmediate(resolve));
    t.mock.timers.tick(1_000);
  }
  return pending;
}

test('a read retries a dropped proxy answer and then succeeds', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const originalFetch = global.fetch;
  const answers = [reply(500), reply(503), reply(200, '{"signupOpen":true}')];
  let calls = 0;
  global.fetch = async () => answers[calls++];
  try {
    assert.deepEqual(await settle(t, api('/platform/flags')), { signupOpen: true });
    assert.equal(calls, 3);
  } finally {
    global.fetch = originalFetch;
  }
});

test('a read gives up after two retries; writes and request errors are never repeated', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const originalFetch = global.fetch;
  let calls = 0;
  try {
    global.fetch = async () => (calls++, reply(502));
    await assert.rejects(settle(t, api('/platform/flags')), (e) => e.status === 502);
    assert.equal(calls, 3);

    calls = 0;
    global.fetch = async () => (calls++, reply(500));
    await assert.rejects(
      settle(t, api('/me/records', { method: 'POST', body: {} })),
      (e) => e.status === 500,
    );
    assert.equal(calls, 1, 'a write is sent once');

    calls = 0;
    global.fetch = async () => (calls++, reply(404, '{"detail":"Not found"}'));
    await assert.rejects(
      settle(t, api('/me/records/x')),
      (e) => e.status === 404 && e.message === 'Not found',
    );
    assert.equal(calls, 1, 'a request the server refused is not retried');

    calls = 0;
    global.fetch = async () => {
      calls++;
      if (calls === 1) throw new TypeError('fetch failed');
      return reply(200, '[]');
    };
    assert.deepEqual(await settle(t, api('/me/records')), []);
    assert.equal(calls, 2, 'a dropped connection is retried');
  } finally {
    global.fetch = originalFetch;
  }
});
