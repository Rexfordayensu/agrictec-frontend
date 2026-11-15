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
// Run: node --test tests/pdf-letterhead.test.cjs
// The console's report PDF uses the same AgriCtec letterhead as every PDF the API produces.
const { reportReference } = require('../lib/pdf/generate-admin-report.ts');

const source = fs.readFileSync(path.join(root, 'lib/pdf/generate-admin-report.ts'), 'utf8');

test('the console report carries the shared letterhead and footer', () => {
  for (const text of [
    'DIGITAL IDENTITY',
    'AgriCtec Digital Identity',
    'Page ${page} of ${pages}',
    "'Agri'",
    "'Ctec'",
  ]) {
    assert.ok(source.includes(text), text);
  }
  // The official mark, the same file the API prints, embedded once and reused.
  assert.ok(source.includes("'/brand/agrictec-mark.png'"));
  assert.ok(fs.existsSync(path.join(root, 'public/brand/agrictec-mark.png')));
  assert.match(source, /addImage\(mark, 'PNG', [^)]*'agrictec-mark'/);
  // AgriCtec green, not the old purple header.
  assert.match(source, /GREEN: RGB = \[16, 130, 50\]/);
  assert.doesNotMatch(source, /PURPLE/);
});

test('each report has a reference from its type and time', () => {
  const ref = reportReference({ id: 'regions', generatedAt: '2026-11-15T14:05:00' });
  assert.equal(ref, 'IR-20261115-1405-REGIONS');
});
