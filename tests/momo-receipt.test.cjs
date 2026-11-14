/* eslint-disable @typescript-eslint/no-require-imports -- Existing TypeScript test convention. */
// A MoMo transaction is sent with its receipt: what files are accepted, and how the request is built.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(relative, mocks = {}) {
  const filename = path.join(root, relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText;
  const m = new Module(filename, module);
  m.require = (name) => (Object.hasOwn(mocks, name) ? mocks[name] : require(name));
  m._compile(source, filename);
  return m.exports;
}

test('receipts must be a photo or PDF; big PDFs are refused, big photos are left to be resized', () => {
  const { receiptError, MAX_RECEIPT_BYTES } = load('lib/momo-receipt.ts');
  assert.equal(receiptError({ type: 'image/jpeg', size: 200_000 }), null);
  assert.equal(receiptError({ type: 'application/pdf', size: 200_000 }), null);
  assert.match(receiptError({ type: 'text/plain', size: 10 }), /photo .* or a PDF/);
  assert.match(receiptError({ type: 'image/gif', size: 10 }), /photo .* or a PDF/);
  assert.match(receiptError({ type: 'image/png', size: 0 }), /empty/);
  assert.match(receiptError({ type: 'application/pdf', size: MAX_RECEIPT_BYTES + 1 }), /5 MB/);
  assert.equal(receiptError({ type: 'image/jpeg', size: MAX_RECEIPT_BYTES * 3 }), null);
  assert.match(receiptError({ type: 'image/jpeg', size: MAX_RECEIPT_BYTES + 1 }, { resizable: false }), /5 MB/);
});

test('a new MoMo transaction is posted once, with its details and the receipt together', async () => {
  const calls = [];
  const { momoService } = load('services/momo.service.ts', {
    '@/services/api': {
      api: async () => assert.fail('JSON-only create is not allowed'),
      apiBlob: async () => null,
      apiUpload: async (url, form) => {
        calls.push({ url, form });
        return { id: 'm1', verificationStatus: 'verification_pending' };
      },
    },
  });
  const receipt = new File(['receipt'], 'momo.png', { type: 'image/png' });
  const input = { direction: 'in', counterparty: 'Buyer', amount: '50.00', date: '2026-11-13', network: 'MTN' };
  const saved = await momoService.create('u1', input, receipt);
  assert.equal(saved.verificationStatus, 'verification_pending');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/me/momo');
  assert.deepEqual(JSON.parse(calls[0].form.get('data')), input);
  assert.equal(calls[0].form.get('receipt').name, 'momo.png');
});
