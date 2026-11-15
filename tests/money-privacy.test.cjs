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
// Run: node --test tests/money-privacy.test.cjs
// A farmer's money is confidential: the console sees counts, never amounts, and an admin viewing
// the app as the farmer sees no money pages (the API refuses them too).
const { isPrivateWhileViewing } = require('../lib/read-only.ts');
const { contextFor } = require('../lib/admin/assistant-kb.ts');
const { renderAssistantReply } = require('../lib/ai/assistant-replies.ts');

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('money pages are private while an admin views as the farmer', () => {
  for (const page of ['/dashboard', '/records', '/momo', '/reports', '/assistant', '/loans']) {
    assert.equal(isPrivateWhileViewing(page), true, page);
  }
  assert.equal(isPrivateWhileViewing('/records/new'), true);
  for (const page of ['/profile', '/settings', '/market', '/weather', '/loans/applications']) {
    assert.equal(isPrivateWhileViewing(page), false, page);
  }
  assert.equal(isPrivateWhileViewing('/loans/applications/abc'), false);
  assert.equal(isPrivateWhileViewing('/recordsx'), false);
});

test('assistant previews in the console never carry amounts or made-up farmers', async () => {
  const empty = contextFor(undefined);
  assert.equal(empty.farmerName, '');
  assert.equal(empty.region, '');
  assert.deepEqual(empty.primaryCrops, []);
  assert.equal('income' in empty, false);
  assert.equal('expenses' in empty, false);
  const farmer = {
    profile: { name: 'Kofi', region: 'Northern', primaryCrops: ['Maize'] },
    stats: { score: 512, records: 4, momo: 1, diagnoses: 0 },
  };
  const ctx = contextFor(farmer);
  assert.equal(ctx.farmerName, 'Kofi');
  assert.equal('income' in ctx, false);
  const reply = await renderAssistantReply(
    {
      title: 'Money',
      intro: 'Income {income}, expenses {expenses}, profit {profit}',
      tip: '{margin}',
    },
    ctx,
    [],
  );
  assert.doesNotMatch(`${reply.intro} ${reply.tip}`, /GHS/);
  assert.match(reply.intro, /hidden in this preview/);
});

test('the console code never reads a farmer\u2019s amounts', () => {
  const types = read('types/admin.ts');
  const stats = types.slice(
    types.indexOf('stats: {'),
    types.indexOf('};', types.indexOf('stats: {')),
  );
  assert.doesNotMatch(stats, /income|expenses/);
  for (const file of [
    'services/admin/farmers.service.ts',
    'services/admin/config.service.ts',
    'components/admin/farmers/detail/overview-tab.tsx',
    'components/admin/farmers/detail/credit-tab.tsx',
    'components/admin/credit-rules/score-simulator.tsx',
  ]) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /financial-summary|scoring-inputs|records\.csv|\/reports\/|stats\.income|stats\.expenses|calculateCreditScore\(farmer/,
      file,
    );
  }
  assert.equal(
    fs.existsSync(path.join(root, 'components/admin/farmers/detail/financial-panel.tsx')),
    false,
  );
});
