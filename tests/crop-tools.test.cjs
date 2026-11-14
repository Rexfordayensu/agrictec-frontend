/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS hooks load the app's TypeScript without an extra test dependency. */
// Run: node --test --test-isolation=none tests/crop-tools.test.cjs
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
const { aiService } = require('../services/ai.service.ts');
const { captureCameraFrame, openCropCamera, stopCameraStream } = require('../lib/image/camera.ts');
const {
  compressImage,
  imageValidationError,
  MAX_IMAGE_BYTES,
} = require('../lib/image/compress.ts');
const { predictYield, yieldInsight } = require('../lib/calculations/yield.ts');
const {
  yieldSchema,
  YIELD_CROPS,
  resolveYieldCrop,
} = require('../components/yield-predictor/yield-schema.ts');
const { UploadZone } = require('../components/crop-doctor/upload-zone.tsx');
const { DiagnosisCard } = require('../components/crop-doctor/diagnosis-card.tsx');
const { YieldTips } = require('../components/yield-predictor/yield-tips.tsx');
const { YieldResult } = require('../components/yield-predictor/yield-result.tsx');
const { useFarmStore } = require('../store/farm-store.ts');
const { useModalStore } = require('../store/modal-store.ts');

const values = new Map();
global.window = {
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  },
};

const leaf = () => new File(['example leaf photo'], 'leaf.png', { type: 'image/png' });
const yieldInput = {
  crop: 'Maize',
  acres: 2,
  season: 'major',
  fertilizer: 'both',
  irrigation: 'drip',
};

test('upload validation rejects PDFs, unsupported images and 15MB photos with exact messages', async () => {
  const unsupported = 'Please upload an image file (PNG, JPG or WEBP)';
  const oversized = 'Image is too large. Maximum size is 10MB.';
  assert.equal(imageValidationError({ type: 'application/pdf', size: 1000 }), unsupported);
  assert.equal(imageValidationError({ type: 'image/svg+xml', size: 1000 }), unsupported);
  assert.equal(imageValidationError({ type: 'image/jpeg', size: 15 * 1024 * 1024 }), oversized);
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
    assert.equal(imageValidationError({ type, size: MAX_IMAGE_BYTES }), null);
  }
  // Refused before anything is sent to the API.
  await assert.rejects(
    aiService.diagnose(new File(['pdf'], 'leaf.pdf', { type: 'application/pdf' })),
    {
      message: unsupported,
    },
  );
  await assert.rejects(
    aiService.diagnose({ name: 'large.jpg', type: 'image/jpeg', size: 15 * 1024 * 1024 }),
    { message: oversized },
  );
});

test('live camera requests the rear-facing camera without microphone access and stops all tracks', async () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  let requested;
  let stopped = 0;
  const stream = {
    getTracks: () => [
      {
        stop() {
          stopped++;
        },
      },
      {
        stop() {
          stopped++;
        },
      },
    ],
  };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      async getUserMedia(options) {
        requested = options;
        return stream;
      },
    },
  });
  try {
    assert.equal(await openCropCamera(), stream);
    assert.equal(requested.audio, false);
    assert.equal(requested.video.facingMode.ideal, 'environment');
    stopCameraStream(stream);
    assert.equal(stopped, 2);
    stopCameraStream(null);
  } finally {
    if (original) Object.defineProperty(navigator, 'mediaDevices', original);
    else delete navigator.mediaDevices;
  }
});

test('a live camera frame becomes a bounded JPEG File accepted by the crop upload flow', async () => {
  const original = global.document;
  const video = { readyState: 2, videoWidth: 3024, videoHeight: 4032 };
  let drawn;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: (...args) => {
        drawn = args;
      },
    }),
    toBlob(callback, type, quality) {
      assert.equal(type, 'image/jpeg');
      assert.equal(quality, 0.9);
      callback(new Blob(['camera photo'], { type }));
    },
  };
  global.document = { createElement: () => canvas };
  try {
    const photo = await captureCameraFrame(video);
    assert.ok(photo instanceof File);
    assert.match(photo.name, /^crop-photo-.*\.jpg$/);
    assert.equal(photo.type, 'image/jpeg');
    assert.equal(canvas.width, 1200);
    assert.equal(canvas.height, 1600);
    assert.deepEqual(drawn, [video, 0, 0, 1200, 1600]);
    assert.equal(imageValidationError(photo), null);
  } finally {
    global.document = original;
  }
});

test('camera capture rejects missing frames, unavailable canvas, and failed encoding', async () => {
  await assert.rejects(
    captureCameraFrame({ readyState: 0, videoWidth: 0, videoHeight: 0 }),
    /Wait for the camera preview/,
  );
  const original = global.document;
  try {
    global.document = { createElement: () => ({ getContext: () => null }) };
    await assert.rejects(
      captureCameraFrame({ readyState: 2, videoWidth: 640, videoHeight: 480 }),
      /Could not capture/,
    );
    global.document = {
      createElement: () => ({
        getContext: () => ({ drawImage() {} }),
        toBlob(callback) {
          callback(null);
        },
      }),
    };
    await assert.rejects(
      captureCameraFrame({ readyState: 2, videoWidth: 640, videoHeight: 480 }),
      /Could not capture/,
    );
  } finally {
    global.document = original;
  }
});

async function withImageEnvironment(options, action) {
  const originals = {
    Image: global.Image,
    document: global.document,
    create: URL.createObjectURL,
    revoke: URL.revokeObjectURL,
  };
  const state = { created: [], revoked: [], draws: [], format: null, quality: null, canvas: null };
  URL.createObjectURL = () => {
    const url = `blob:test-${state.created.length}`;
    state.created.push(url);
    return url;
  };
  URL.revokeObjectURL = (url) => state.revoked.push(url);
  global.Image = class {
    naturalWidth = options.width ?? 4000;
    naturalHeight = options.height ?? 3000;
    set src(value) {
      this.url = value;
      queueMicrotask(() => (options.decodeError ? this.onerror() : this.onload()));
    }
  };
  global.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      state.canvas = {
        width: 0,
        height: 0,
        getContext: () =>
          options.noContext
            ? null
            : { fillRect() {}, drawImage: (...args) => state.draws.push(args) },
        toDataURL(format, quality) {
          if (options.encodeError) throw new Error('Encoding failed');
          state.format = format;
          state.quality = quality;
          return 'data:image/jpeg;base64,dGlueQ==';
        },
      };
      return state.canvas;
    },
  };
  try {
    await action(state);
  } finally {
    global.Image = originals.Image;
    global.document = originals.document;
    URL.createObjectURL = originals.create;
    URL.revokeObjectURL = originals.revoke;
  }
}

test('thumbnail compression bounds dimensions, preserves aspect ratio and revokes URLs', async () => {
  for (const [width, height, expectedWidth, expectedHeight] of [
    [4000, 3000, 200, 150],
    [3000, 4000, 150, 200],
    [80, 60, 80, 60],
  ]) {
    await withImageEnvironment({ width, height }, async (state) => {
      const thumbnail = await compressImage(leaf());
      assert.match(thumbnail, /^data:image\/jpeg;base64,/);
      assert.equal(state.canvas.width, expectedWidth);
      assert.equal(state.canvas.height, expectedHeight);
      assert.equal(state.format, 'image/jpeg');
      assert.equal(state.quality, 0.7);
      assert.deepEqual(state.draws[0].slice(1), [0, 0, expectedWidth, expectedHeight]);
      assert.deepEqual(state.revoked, state.created);
    });
  }
});

test('thumbnail failure paths always revoke URLs and invalid options fail before loading', async () => {
  for (const options of [
    { decodeError: true },
    { noContext: true },
    { encodeError: true },
    { width: 0 },
  ]) {
    await withImageEnvironment(options, async (state) => {
      await assert.rejects(compressImage(leaf()));
      assert.equal(state.created.length, 1);
      assert.deepEqual(state.revoked, state.created);
    });
  }
  await withImageEnvironment({}, async (state) => {
    await assert.rejects(compressImage(leaf(), 0));
    await assert.rejects(compressImage(leaf(), 200, 2));
    assert.equal(state.created.length, 0);
  });
});

test('yield schema coerces acreage, rejects zero and invalid inputs, and requires a name for Other', () => {
  assert.equal(yieldSchema.parse({ ...yieldInput, acres: '2' }).acres, 2);
  const zero = yieldSchema.safeParse({ ...yieldInput, acres: 0 });
  assert.equal(zero.success, false);
  assert.equal(zero.error.issues[0].message, 'Minimum 0.1 acres');
  for (const acres of [-1, 1001, '', 'not a number', NaN, Infinity])
    assert.equal(yieldSchema.safeParse({ ...yieldInput, acres }).success, false);
  assert.equal(yieldSchema.safeParse({ ...yieldInput, crop: 'Other' }).success, false);
  assert.equal(YIELD_CROPS.length, 8);
});

// One reviewed, published observation: GHS 400 per 100 kg bag of maize in Ashanti.
const maizePrice = {
  id: 'maize-1',
  country: 'GH',
  currency: 'GHS',
  crop: 'Maize (white)',
  unit: 'bag',
  quantity: 1,
  packageWeightKg: 100,
  price: 400,
  change: 0,
  status: 'published',
  scope: 'region',
  region: 'Ashanti',
  observedAt: '2026-10-01',
  source: {
    title: 'Weekly prices',
    publisher: 'MoFA SRID',
    url: 'https://mofa.gov.gh/prices',
    publishedAt: '2026-10-01',
    kind: 'official',
  },
  reviewedAt: '2026-10-02T10:00:00.000Z',
  reviewedBy: 'Super Admin',
};

test('yield is repeatable and scales by acreage; revenue only from a published price', () => {
  const result = predictYield(yieldInput);
  assert.deepEqual(result, predictYield({ ...yieldInput }));
  // No built-in price: without a published one there is no revenue figure.
  assert.deepEqual(result, {
    low: 9.36,
    expected: 10.4,
    high: 11.43,
    perAcre: 5.2,
    revenue: null,
    pricePerTonne: null,
    priceSource: null,
  });
  const priced = predictYield(yieldInput, undefined, [maizePrice]);
  assert.equal(priced.pricePerTonne, 4000);
  assert.equal(priced.revenue, 41580);
  assert.deepEqual(priced.priceSource, { where: 'Ashanti', observedAt: '2026-10-01' });
  const doubled = predictYield({ ...yieldInput, acres: 4 }, undefined, [maizePrice]);
  assert.equal(doubled.revenue, priced.revenue * 2);
  // Two observations are not reduced to one price; a range gives none either.
  assert.equal(
    predictYield(yieldInput, undefined, [maizePrice, { ...maizePrice, id: 'maize-2', price: 420 }])
      .revenue,
    null,
  );
  assert.equal(
    predictYield(yieldInput, undefined, [{ ...maizePrice, priceMax: 450 }]).revenue,
    null,
  );
  for (const crop of YIELD_CROPS) {
    const estimate = predictYield({ ...yieldInput, crop });
    assert.ok(estimate.low <= estimate.expected && estimate.expected <= estimate.high);
    assert.equal(estimate.revenue, null);
    assert.ok(yieldInsight({ ...yieldInput, crop }, estimate).length > 0);
  }
});

test('yield tips change per crop, show all four tips, and results identify their inputs', () => {
  const cocoa = renderToStaticMarkup(createElement(YieldTips, { crop: 'Cocoa' }));
  const maize = renderToStaticMarkup(createElement(YieldTips, { crop: 'Maize' }));
  assert.match(cocoa, /Growing tips for Cocoa/);
  assert.match(cocoa, /Prune regularly/);
  assert.match(maize, /Scout weekly/);
  assert.match(maize, /Not published/); // no built-in market price
  assert.equal((cocoa.match(/<li\b/g) ?? []).length, 4);
  assert.notEqual(cocoa, maize);
  const rendered = renderToStaticMarkup(
    createElement(YieldResult, {
      input: yieldInput,
      result: predictYield(yieldInput),
      stale: true,
    }),
  );
  assert.match(rendered, /Maize/);
  assert.match(rendered, /Update my estimate/);
  assert.match(rendered, /No published market price for Maize yet/);
  assert.doesNotMatch(rendered, /Expected Revenue/);
  // A prediction is never saved as income.
  assert.doesNotMatch(rendered, /Add to records/);
  const priced = renderToStaticMarkup(
    createElement(YieldResult, {
      input: yieldInput,
      result: predictYield(yieldInput, undefined, [maizePrice]),
    }),
  );
  assert.match(priced, /Expected Revenue/);
  assert.match(priced, /GHS 41,580/);
  assert.match(priced, /Published market price · Ashanti, observed 2026-10-01/);
});

test('prediction record drafts prefill the modal without saving and clear between openings', () => {
  const defaults = {
    type: 'income',
    crop: 'Maize',
    amount: 2400,
    description: 'Maize sale',
  };
  const before = useFarmStore.getState().records.length;
  useModalStore.getState().openRecordWithDefaults(defaults);
  assert.equal(useModalStore.getState().modal, 'record');
  assert.deepEqual(useModalStore.getState().recordDefaults, defaults);
  assert.equal(useModalStore.getState().editingId, undefined);
  assert.equal(useFarmStore.getState().records.length, before);
  useModalStore.getState().closeModal();
  assert.equal(useModalStore.getState().recordDefaults, undefined);
  useModalStore.getState().openModal('record', 'existing-record');
  assert.equal(useModalStore.getState().recordDefaults, undefined);
  assert.equal(useModalStore.getState().editingId, 'existing-record');
  useModalStore.getState().closeModal();
});

test('upload markup exposes keyboard-accessible controls and diagnosis content stays escaped', () => {
  const upload = renderToStaticMarkup(createElement(UploadZone, { onFile() {} }));
  assert.match(upload, /role="button"/);
  assert.match(upload, /tabindex="0"/);
  assert.match(upload, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(upload, /PNG, JPG or WEBP up to 10MB/);
  const galleryInput = upload.match(/<input[^>]*aria-label="Choose a crop image"[^>]*>/)?.[0];
  const cameraInput = upload.match(/<input[^>]*aria-label="Take a crop photo"[^>]*>/)?.[0];
  assert.ok(galleryInput);
  assert.ok(cameraInput);
  assert.doesNotMatch(galleryInput, /capture=/);
  assert.match(cameraInput, /capture="environment"/);
  assert.match(upload, /Take photo/);
  assert.match(upload, /Upload photo/);
  const result = {
    disease: '<script>danger</script>',
    severity: 'High',
    confidence: 92,
    treatment: '<b>advice</b>',
  };
  const diagnosis = renderToStaticMarkup(
    createElement(DiagnosisCard, {
      result,
      saving: false,
      saved: false,
      onSave() {},
      onScanAnother() {},
    }),
  );
  assert.match(diagnosis, /border-l-danger/);
  assert.match(diagnosis, /aria-valuenow="92"/);
  assert.match(diagnosis, /MoFA extension officer/);
  assert.match(diagnosis, /AI diagnosis/);
  assert.doesNotMatch(diagnosis, /Mock/);
  assert.doesNotMatch(diagnosis, /<script>|<b>/);
});

// The server uses separate price provenance fields; the UI consumes priceSource.
test('yield API maps published price provenance and preserves unavailable revenue', async () => {
  const { yieldService } = require('../services/yield.service.ts');
  const original = global.fetch;
  let body;
  const answer = {
    low: 9,
    expected: 10,
    high: 11,
    perAcre: 5,
    revenue: 40000,
    pricePerTonne: 4000,
    priceMarket: 'Ashanti',
    priceObservedAt: '2026-10-01',
    insight: 'Use timely inputs.',
    tips: ['Scout weekly.'],
  };
  global.fetch = async (url, options) => {
    assert.match(url, /\/me\/yield$/);
    assert.equal(options.method, 'POST');
    body = JSON.parse(options.body);
    return new Response(JSON.stringify(answer), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const result = await yieldService.predict(yieldInput);
    assert.deepEqual(body, yieldInput);
    assert.deepEqual(result.priceSource, { where: 'Ashanti', observedAt: '2026-10-01' });
    assert.deepEqual(result.tips, ['Scout weekly.']);
    answer.revenue = null;
    answer.pricePerTonne = null;
    answer.priceMarket = null;
    answer.priceObservedAt = null;
    const noPrice = await yieldService.predict(yieldInput);
    assert.equal(noPrice.revenue, null);
    assert.equal(noPrice.priceSource, null);
  } finally {
    global.fetch = original;
  }
});

test('estimate panel shows actual results, missing prices and stale plan notices', () => {
  const { YieldEstimatePanel } = require('../components/yield-predictor/yield-estimate-panel.tsx');
  const props = {
    input: yieldInput,
    result: {
      ...predictYield(yieldInput),
      insight: 'A planning estimate.',
      tips: ['Scout weekly.'],
    },
    crop: 'Maize',
    stale: true,
    headingRef: null,
  };
  const html = renderToStaticMarkup(createElement(YieldEstimatePanel, props));
  assert.match(html, /10.4 tonnes/);
  assert.match(html, /Not available/);
  assert.match(html, /Your choices have changed/);
  assert.match(html, /Scout weekly/);
  const empty = renderToStaticMarkup(
    createElement(YieldEstimatePanel, { ...props, input: null, result: null, stale: false }),
  );
  assert.match(empty, /Complete your plan/);
  assert.doesNotMatch(empty, /18,750|12.5 tonnes/);
});

test('custom crop names are validated and only supported names resolve to an estimate crop', () => {
  const custom = yieldSchema.parse({ ...yieldInput, crop: 'Other', otherCrop: '  Cucumber  ' });
  assert.equal(custom.otherCrop, 'Cucumber');
  assert.equal(resolveYieldCrop(custom.crop, custom.otherCrop), null);
  assert.equal(resolveYieldCrop('Other', '  rIcE  '), 'Rice');
  assert.equal(resolveYieldCrop('Maize', 'Cucumber'), 'Maize');
  assert.equal(
    yieldSchema.safeParse({ ...yieldInput, crop: 'Other', otherCrop: '   ' }).success,
    false,
  );
  assert.equal(
    yieldSchema.safeParse({ ...yieldInput, crop: 'Other', otherCrop: 'x'.repeat(81) }).success,
    false,
  );
});

test('a custom crop without data shows an unavailable estimate instead of invented figures', () => {
  const { YieldEstimatePanel } = require('../components/yield-predictor/yield-estimate-panel.tsx');
  const html = renderToStaticMarkup(
    createElement(YieldEstimatePanel, {
      input: null,
      result: null,
      crop: 'Other',
      cropName: 'Cucumber',
      unavailable: true,
      stale: false,
      headingRef: null,
    }),
  );
  assert.match(html, /Yield data for Cucumber has not been published yet/);
  assert.match(html, /Not available/);
  assert.match(html, /No estimate calculated/);
  assert.doesNotMatch(html, /0 tonnes|GHS 0/);
  const tips = renderToStaticMarkup(
    createElement(YieldTips, { crop: 'Other', cropName: 'Cucumber' }),
  );
  assert.match(tips, /Growing tips for Cucumber/);
  assert.match(tips, /Growing guidance has not been published/);
});
