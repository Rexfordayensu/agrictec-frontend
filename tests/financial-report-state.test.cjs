/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS hooks load the app's TypeScript without an extra test dependency. */
// Run: node --test --test-isolation=none tests/admin-permissions.test.cjs
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

const {hasReportableFigures,financialReportError} = require('../lib/financial-report-state.ts');
const {renderToStaticMarkup} = require('react-dom/server');
const React = require('react');
const {EmptyFinancialReport} = require('../components/reports/financial-reports-view.tsx');
const empty = {counts:{financialRecords:0,momo:0}, financing:{in:{total:'0.00'},out:{total:'0.00'}}, farm:{income:{total:'0.00'},expenses:{total:'0.00'},net:'0.00'}};

test('no financial entries does not enable a PDF report',()=>{
  assert.equal(hasReportableFigures(empty),false);
  assert.equal(hasReportableFigures({...empty,counts:{financialRecords:1,momo:0}}),true);
  assert.equal(hasReportableFigures({...empty,counts:{financialRecords:0,momo:1}}),true);
  assert.equal(hasReportableFigures({...empty,financing:{...empty.financing,in:{total:'0.10'}}}),true);
});
test('a missing report endpoint is a service error, not an empty account',()=>{
  const missing=Object.assign(new Error('Not Found'),{status:404});
  assert.match(financialReportError(missing),/temporarily unavailable/);
  assert.match(financialReportError(missing,'reports'),/Saved reports/);
  assert.match(financialReportError(missing,'pdf'),/PDF reports/);
  assert.match(financialReportError(missing,'download'),/no longer available/);
  assert.doesNotMatch(financialReportError(missing),/Not Found|no records/i);
  assert.equal(financialReportError(new Error('Check your connection.')),'Check your connection.');
});
test('empty report guides a farmer to real records without invented figures',()=>{
  const html=renderToStaticMarkup(React.createElement(EmptyFinancialReport,{summary:null,months:6,firstRecord:true}));
  assert.match(html,/Your report starts with your first record/);
  assert.match(html,/Add your first record/);
  assert.match(html,/Your chart starts the month you record your first entry/);
  assert.match(html,/Record a MoMo payment/);
  assert.doesNotMatch(html,/GHS 0|Not Found|Checking your records/);
});
test('an empty period is explained above the figures, which show the exact zeros',()=>{
  const html=renderToStaticMarkup(React.createElement(EmptyFinancialReport,{summary:empty,months:3,firstRecord:false}));
  assert.match(html,/No financial entries in this reporting period/);
  // Already recording (an activity, say): the chart has started, so no "starts with" line.
  assert.doesNotMatch(html,/Your chart starts/);
  assert.match(html,/Add a record/);
  // The totals are not repeated here: the figures and chart below show them.
  assert.doesNotMatch(html,/GHS/);
});
