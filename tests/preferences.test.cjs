/* eslint-disable @typescript-eslint/no-require-imports -- Existing TypeScript test convention. */
// Settings → Preferences: the SMS choice and "is SMS available" come from the server, older
// servers without them get safe defaults, and saving never sends the read-only flag back.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function compile(filename) {
  return ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText;
}
function settingsService(api) {
  const filename = path.join(root, 'services/settings.service.ts');
  const m = new Module(filename, module);
  m.require = (name) => (name === '@/services/api' ? { api } : require(name));
  m._compile(compile(filename), filename);
  return m.exports;
}

test('an older server without the SMS fields gets SMS on by default and not available', async () => {
  const { settingsService: service, DEFAULT_SETTINGS } = settingsService(async () => ({
    language: 'en',
    notifications: { aiInsights: true, weatherAlerts: false, priceAlerts: true },
  }));
  assert.equal(DEFAULT_SETTINGS.notifications.smsAlerts, true);
  const saved = await service.get('u1');
  assert.deepEqual(saved, {
    language: 'en',
    notifications: { aiInsights: true, weatherAlerts: false, priceAlerts: true, smsAlerts: true },
    smsAvailable: false,
    // And no tour date: the tour opens once.
    tourSeenAt: null,
  });
});

test('saving sends only the language and alert choices, and reads back SMS availability', async () => {
  const calls = [];
  const { settingsService: service } = settingsService(async (url, options) => {
    calls.push({ url, options });
    return { ...options.body, smsAvailable: true };
  });
  const result = await service.save('u1', {
    language: 'en',
    notifications: { aiInsights: false, weatherAlerts: true, priceAlerts: false, smsAlerts: false },
    smsAvailable: false,
  });
  assert.equal(calls[0].url, '/me/settings');
  assert.equal(calls[0].options.method, 'PUT');
  assert.deepEqual(Object.keys(calls[0].options.body).sort(), ['language', 'notifications']);
  assert.equal(result.notifications.smsAlerts, false);
  assert.equal(result.smsAvailable, true);
});
