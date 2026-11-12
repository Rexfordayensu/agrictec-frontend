/* eslint-disable @typescript-eslint/no-require-imports -- Load the app's TypeScript with the existing test convention. */
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

// Run: node --test tests/loans.test.cjs
const { DEFAULT_CREDIT_CONFIG } = require('../lib/admin/defaults.ts');
const { calculateCreditScore } = require('../lib/calculations/credit-score.ts');
const {
  bestScoreStep,
  scoreSteps,
  verificationTodo,
} = require('../lib/calculations/score-steps.ts');
const { formatGhanaDate } = require('../lib/format.ts');

test('the score is informational and cannot qualify or disqualify a farmer for a loan', () => {
  const { checkEligibility } = require('../lib/calculations/loan.ts');
  const { SCORE_EXPLANATION, LOAN_REVIEW_EXPLANATION } = require('../lib/loans/score-policy.ts');
  const rules = { ...DEFAULT_CREDIT_CONFIG.eligibility, minScore: 850 };
  const low = checkEligibility({ score: 300, records: [], rules, ghanaCard: 'verified' });
  const high = checkEligibility({ score: 850, records: [], rules, ghanaCard: 'verified' });
  assert.deepEqual(low, high, 'even a legacy score threshold cannot affect access');
  assert.equal(checkEligibility({ score: 850, ghanaCard: 'pending' }).eligible, false);
  assert.match(SCORE_EXPLANATION, /complete and consistent/);
  assert.match(SCORE_EXPLANATION, /does not qualify or disqualify/);
  assert.match(LOAN_REVIEW_EXPLANATION, /transaction history, supporting evidence/);
  assert.match(LOAN_REVIEW_EXPLANATION, /does not guarantee approval/);
});

const profile = (over = {}) => ({
  name: 'Ama',
  phone: '0241234567',
  farmName: 'Ama Farms',
  acres: 4,
  verification: { phone: true, location: false, ghanaCard: false },
  ghanaCard: { status: 'pending' },
  ...over,
});

test('verification says exactly what is still missing, and the profile comes first', () => {
  assert.deepEqual(verificationTodo(profile()), [
    'get your farm location verified',
    'wait for your Ghana Card review',
  ]);
  const incomplete = profile({ acres: 0, verification: { phone: false, location: true } });
  assert.equal(verificationTodo(incomplete)[0], 'complete your profile');
  const credit = calculateCreditScore([], [], incomplete, DEFAULT_CREDIT_CONFIG);
  const verification = scoreSteps(credit, DEFAULT_CREDIT_CONFIG, incomplete).find(
    (s) => s.key === 'verification',
  );
  assert.equal(verification.href, '/settings/profile');
  const done = profile({
    verification: { phone: true, location: true },
    ghanaCard: { status: 'verified' },
  });
  assert.deepEqual(verificationTodo(done), []);
});

test('the best step is the factor with the most points left, and points add up to the score', () => {
  const credit = calculateCreditScore([], [], profile(), DEFAULT_CREDIT_CONFIG);
  const steps = scoreSteps(credit, DEFAULT_CREDIT_CONFIG, profile());
  const best = bestScoreStep(steps);
  assert.equal(best.available, Math.max(...steps.map((s) => s.available)));
  assert.ok(Math.abs(steps.reduce((sum, s) => sum + s.max, 0) - 550) <= 2, 'rounding only');
  const earned = steps.reduce((sum, s) => sum + s.earned, 0);
  assert.ok(Math.abs(300 + earned - credit.score) <= 2, 'rounding only');
  assert.equal(bestScoreStep(steps.map((s) => ({ ...s, available: 0 }))), null);
});

test('application dates are Ghana dates, whatever the device zone', () => {
  assert.equal(formatGhanaDate('2026-11-10T23:30:00Z'), '10 Nov 2026');
  assert.equal(formatGhanaDate('2026-11-11T00:10:00+01:00'), '10 Nov 2026');
});

const { defaultLoanTab, loanPath, searchLenders } = require('../lib/loans/loan-path.ts');
const { monthlyRepayment } = require('../lib/calculations/loan.ts');

const pathInput = (over = {}) => ({
  failing: new Set(),
  recordCount: 12,
  minRecords: 10,
  verifiedEntries: 2,
  entriesWithEvidence: 3,
  ghanaCard: 'verified',
  underReview: false,
  applicationCount: 0,
  lenderCount: 0,
  ...over,
});

test('the path to a loan has no score or amount threshold', () => {
  const ready = loanPath(pathInput());
  assert.deepEqual(
    ready.map((s) => [s.key, s.done]),
    [
      ['records', true],
      ['evidence', true],
      ['ghana-card', true],
      ['apply', false],
    ],
  );
  assert.ok(!ready.some((s) => /score|limit|profit/i.test(s.title)));
  const starting = loanPath(
    pathInput({
      failing: new Set(['ghana-card']),
      recordCount: 3,
      verifiedEntries: 0,
      entriesWithEvidence: 0,
      ghanaCard: 'pending',
    }),
  );
  assert.equal(starting[0].done, false);
  assert.equal(starting[0].detail, '3 of 10 farm records (AgriCtec guidance)');
  assert.equal(starting[1].detail, 'No receipts or statements attached yet');
  // A card under review needs waiting, not another submission.
  assert.equal(starting[2].done, false);
  assert.equal(starting[2].action, null);
  const attached = loanPath(pathInput({ verifiedEntries: 0, entriesWithEvidence: 1 }));
  assert.equal(attached[1].detail, '1 entry with evidence, none verified yet');
  assert.equal(attached[1].done, false);
  const paused = loanPath(pathInput({ underReview: true }));
  assert.equal(paused[3].action, null);
  assert.equal(paused[3].detail, 'Paused while your account is reviewed');
  // Never a lender that isn't there.
  assert.equal(ready[3].detail, 'No verified lenders on AgriCtec yet');
  assert.equal(loanPath(pathInput({ lenderCount: 2 }))[3].detail, '2 verified lenders on AgriCtec');
  assert.deepEqual(ready[3].action, { label: 'See lenders', run: 'lenders' });
});

test('the page opens on the tab a link asks for, else on what the farmer can do now', () => {
  assert.equal(defaultLoanTab('applications', false), 'applications');
  assert.equal(defaultLoanTab('nonsense', true), 'lenders');
  assert.equal(defaultLoanTab(null, true), 'lenders');
  assert.equal(defaultLoanTab(null, false), 'credit');
});

test('repayment estimates match the API formula (app/domain/loans.py)', () => {
  // Values from the backend's monthly_repayment for the same inputs.
  assert.deepEqual(monthlyRepayment(10000, 24, 12), {
    monthly: 945.6,
    total: 11347.15,
    interest: 1347.15,
  });
  assert.deepEqual(monthlyRepayment(5000, 0, 10), { monthly: 500, total: 5000, interest: 0 });
  assert.deepEqual(monthlyRepayment(0, 24, 12), { monthly: 0, total: 0, interest: 0 });
});

const lenders = require('../lib/lenders.ts');

test('the marketplace search matches name, type and region', () => {
  const list = [
    { name: 'Ejisu Rural Bank', institutionType: 'rural_community_bank', region: 'Ashanti' },
    { name: 'Northern Savings', institutionType: 'savings_and_loans', region: 'Northern' },
  ];
  const label = (t) => lenders.INSTITUTION_TYPE_LABELS[t];
  assert.deepEqual(
    searchLenders(list, 'rural ashanti', label).map((l) => l.name),
    ['Ejisu Rural Bank'],
  );
  assert.equal(searchLenders(list, 'savings', label).length, 1);
  assert.equal(searchLenders(list, '  ', label).length, 2);
  assert.equal(searchLenders(list, 'nowhere', label).length, 0);
});

test('unknown lender details say "Not provided", and only web links are clickable', () => {
  assert.equal(lenders.yesNo(undefined), 'Not provided');
  assert.equal(lenders.yesNo(null), 'Not provided');
  assert.equal(lenders.yesNo(false), 'No');
  assert.equal(lenders.safeWebsite('javascript:alert(1)'), undefined);
  assert.equal(lenders.safeWebsite('https://bank.example'), 'https://bank.example');
  assert.equal(lenders.lenderInitials('GCB Bank PLC'), 'GB');
});

const products = require('../lib/loan-products.ts');

test('product terms are shown as the lender states them, else "Not provided"', () => {
  const none = { fees: [] };
  assert.equal(products.amountRange(none), 'Not provided');
  assert.equal(products.monthRange(none), 'Not provided');
  assert.equal(products.rateText(none), 'Not provided');
  const { formatGHS } = require('../lib/format.ts');
  assert.equal(
    products.amountRange({ fees: [], maxAmount: '50000.00' }),
    `Up to ${formatGHS(50000)}`,
  );
  assert.equal(
    products.amountRange({ fees: [], minAmount: '1000', maxAmount: '50000' }),
    `${formatGHS(1000)} – ${formatGHS(50000)}`,
  );
  assert.equal(products.monthRange({ fees: [], minMonths: 6, maxMonths: 12 }), '6 – 12 months');
  assert.equal(
    products.rateText({
      fees: [],
      interestRate: '28.5000',
      ratePeriod: 'year',
      rateMethod: 'flat',
    }),
    '28.5% a year, flat rate',
  );
  assert.equal(products.rateText({ fees: [], interestRate: '3' }), '3%');
  assert.equal(
    products.feeText({ name: 'Processing', kind: 'percent', value: '2.0000' }),
    'Processing: 2%',
  );
});

test('requirements read in plain words and keep the lender’s order within each group', () => {
  assert.equal(
    products.describeCheck({ metric: 'months_of_records', op: 'gte', value: '6' }),
    'Months with farm records: at least 6',
  );
  assert.equal(
    products.describeCheck({ metric: 'farm_region', op: 'in', value: ['Ashanti', 'Bono'] }),
    'Farm region: Ashanti or Bono',
  );
  assert.equal(
    products.describeCheck({ metric: 'ghana_card_verified', op: 'is_true' }),
    'Ghana Card verified',
  );
  const doc = { fieldType: 'document', allowedFormats: ['pdf', 'jpg'], maxSizeMb: 5, options: [] };
  assert.equal(products.requirementAsk(doc), 'Upload PDF, JPG, up to 5 MB');
  const reqs = [
    { key: 'b', category: 'financial' },
    { key: 'a', category: 'identity' },
    { key: 'c', category: 'financial' },
  ];
  assert.deepEqual(
    products.requirementGroups(reqs).map((g) => [g.category, g.items.map((r) => r.key)]),
    [
      ['identity', ['a']],
      ['financial', ['b', 'c']],
    ],
  );
});

test('no farmer-facing text calls the score a credit score or promises a loan', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      if (fs.statSync(file).isDirectory()) walk(file);
      else if (/\.tsx?$/.test(name)) {
        // Strings only: comments may still use the internal name.
        const code = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
        if (/credit score|you may qualify|loans up to|borrow up to|unlock loan offers/i.test(code))
          offenders.push(path.relative(root, file));
      }
    }
  };
  for (const dir of ['app', 'components', 'lib', 'constants', 'hooks']) walk(path.join(root, dir));
  assert.deepEqual(offenders, []);
});

test('no store selector builds a new array or object (it would re-render forever)', () => {
  // useXStore((s) => s.a ?? []) returns a fresh [] on every read until `a` loads: React then
  // sees a change on every render ("Maximum update depth exceeded"). Fall back outside instead.
  const fresh = /use\w*Store\(\s*\(\w+\)\s*=>[^;]*?(\?\?\s*(\[\]|\{\})|=>\s*\(\{)/;
  const offenders = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      if (fs.statSync(file).isDirectory()) walk(file);
      else if (/\.tsx?$/.test(name) && fresh.test(fs.readFileSync(file, 'utf8')))
        offenders.push(path.relative(root, file));
    }
  };
  for (const dir of ['app', 'components', 'hooks', 'lib']) walk(path.join(root, dir));
  assert.deepEqual(offenders, []);
});

test('transaction-based lender rules read plainly and financial ones need their dates', () => {
  const { formatGHS } = require('../lib/format.ts');
  assert.equal(
    products.describeCheck({ metric: 'dscr', op: 'gte', value: '1.2' }),
    'Debt-service coverage ratio: at least 1.2',
  );
  assert.equal(
    products.describeCheck({ metric: 'period_income', op: 'gte', value: '12000' }),
    `Documented income in the assessment period: at least ${formatGHS(12000)}`,
  );
  assert.equal(
    products.describeCheck({ metric: 'debt_burden', op: 'lte', value: '30' }),
    'Existing loan repayments as a share of income (%): at most 30',
  );
  for (const metric of ['dscr', 'period_income', 'verified_share', 'months_of_records'])
    assert.ok(products.FINANCIAL_METRICS.has(metric), metric);
  assert.ok(!products.FINANCIAL_METRICS.has('ghana_card_verified'));
  assert.match(products.DSCR_METHOD, /existing monthly loan repayments/);
});
