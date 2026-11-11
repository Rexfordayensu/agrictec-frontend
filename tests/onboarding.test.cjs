/* eslint-disable @typescript-eslint/no-require-imports -- Follow the existing TypeScript test loader convention. */
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
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { StepProgress } = require('../components/onboarding/step-progress.tsx');
const { WizardNav } = require('../components/onboarding/wizard-nav.tsx');
const { useOnboardingStore } = require('../store/onboarding-store.ts');
const { onboardingService } = require('../services/onboarding.service.ts');
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test('the step guide includes review and prevents jumping past saved steps', () => {
  const markup = render(StepProgress, { step: 1, reached: 1, onJump() {} });
  assert.match(markup, /Step 2 of 7/);
  assert.match(markup, /Review details/);
  assert.match(markup, /Optional · add it later/);
  assert.equal((markup.match(/aria-current="step"/g) || []).length, 1);
  assert.equal((markup.match(/disabled=""/g) || []).length, 5);
  assert.match(markup, /aria-controls="[^"]+"/);
});

test('saving blocks every step jump and all navigation actions', () => {
  const guide = render(StepProgress, { step: 5, reached: 6, disabled: true, onJump() {} });
  assert.equal((guide.match(/disabled=""/g) || []).length, 7);
  const nav = render(WizardNav, { formId: 'sample-step', busy: true, onBack() {}, onSkip() {} });
  assert.equal((nav.match(/disabled=""/g) || []).length, 3);
  assert.match(nav, /type="submit"[^>]*form="sample-step"/);
  assert.match(nav, /Saving your details/);
});

test('a failed save keeps the current step and saved draft; review edits return to review after saving', async () => {
  const original = onboardingService.saveDraft;
  const initial = useOnboardingStore.getState();
  try {
    useOnboardingStore.setState({
      userId: 'local-test',
      step: 2,
      reached: 2,
      returnToReview: false,
      data: { farmName: 'Saved Farm' },
    });
    onboardingService.saveDraft = async () => {
      throw new Error('Offline');
    };
    await assert.rejects(useOnboardingStore.getState().submitStep({ acres: 5 }), /Offline/);
    assert.equal(useOnboardingStore.getState().step, 2);
    assert.deepEqual(useOnboardingStore.getState().data, { farmName: 'Saved Farm' });
    let saved;
    onboardingService.saveDraft = async (...args) => {
      saved = args;
    };
    useOnboardingStore.setState({ reached: 6 });
    useOnboardingStore.getState().goTo(2, true);
    await useOnboardingStore.getState().submitStep({ acres: 5 });
    assert.equal(saved[1], 6);
    assert.equal(saved[2].acres, 5);
    assert.equal(useOnboardingStore.getState().step, 6);
    assert.equal(useOnboardingStore.getState().returnToReview, false);
  } finally {
    onboardingService.saveDraft = original;
    useOnboardingStore.setState(initial);
  }
});
