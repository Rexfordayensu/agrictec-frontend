/* eslint-disable @typescript-eslint/no-require-imports -- Load TypeScript using the existing Node test convention. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (specifier, ...args) {
  return resolveFilename.call(this, specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : specifier, ...args);
};
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filename,
  });
  module._compile(outputText, filename);
};
const { backupSchema, parseDataBackup } = require('../lib/data/backup-schema.ts');
const { defaultProfile } = require('../lib/profile.ts');
const stamp = '2026-11-12T00:00:00.000Z';
const base = {
  version: 1, exportedAt: stamp, profile: defaultProfile('farmer'), records: [], momo: [],
  diagnoses: [], chat: [], loanApplications: [],
  settings: { language: 'en', notifications: { aiInsights: true, weatherAlerts: true, priceAlerts: true } },
};
const record = {
  id: 'record', userId: 'farmer', type: 'income', description: 'Sale', crop: 'Maize',
  amount: 12.30, date: '2026-11-12', createdAt: stamp,
};
const momo = {
  id: 'momo', userId: 'farmer', direction: 'out', counterparty: 'Supplier',
  amount: 5.10, date: '2026-11-12', createdAt: stamp,
};

test('backup export and restore retain financing direction and editable transaction details', () => {
  const financing = {
    ...record, type: 'financing', direction: 'in', category: 'loan_disbursement', currency: 'GHS',
    sourceType: 'statement_upload', paymentMethod: 'bank transfer', externalReference: 'FIN-1',
    description: 'F'.repeat(300), notes: 'N'.repeat(1000),
  };
  const payment = {
    ...momo, category: 'seed', paymentMethod: 'mobile money', externalReference: 'SEED-1',
    sourceType: 'farmer_entry', notes: 'Seed payment',
  };
  const exported = backupSchema.parse({ ...base, records: [financing], momo: [payment] });
  const restored = parseDataBackup(JSON.stringify(exported));
  assert.deepEqual(restored.records[0], financing);
  assert.deepEqual(restored.momo[0], payment);
});

test('backups accept missing, null and legacy blank MoMo references without inventing one', () => {
  for (const reference of [undefined, null, '', 'MTN-123']) {
    const restored = parseDataBackup(JSON.stringify({ ...base, records: [record], momo: [{ ...momo, reference }] }));
    assert.equal(restored.momo[0].reference, reference);
    assert.equal(restored.records[0].category, undefined, 'old entries stay uncategorised');
  }
});

test('a backup cannot claim verified status or restore receipt links from a file', () => {
  const exported = backupSchema.parse({ ...base, records: [{
    ...record, category: 'crop_sale', verificationStatus: 'verified', evidenceCount: 2,
    history: [{ toStatus: 'verified' }], evidence: [{ id: 'another-farmers-file' }],
  }] });
  assert.equal(exported.records[0].category, 'crop_sale');
  for (const field of ['verificationStatus', 'evidenceCount', 'history', 'evidence']) {
    assert.equal(field in exported.records[0], false, field);
  }
});
