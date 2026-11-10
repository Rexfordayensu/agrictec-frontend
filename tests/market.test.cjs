/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS hooks load the app's TypeScript without an extra test dependency. */
// Run: node --test --test-isolation=none tests/market.test.cjs
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
const { publishedPrice } = require('./market-fixtures.cjs');
const { weatherService } = require('../services/weather.service.ts');
const { marketResearchService } = require('../services/market-research.service.ts');
const {
  publicationError,
  publishedPrices,
  supportedRanges,
  evidenceToDraft,
} = require('../lib/market/evidence.ts');
const {
  LOCATION_ATTEMPTS,
  requestWeatherLocation,
  requestInitialWeatherLocation,
  validWeatherLocation,
  weatherLocationKey,
} = require('../lib/market/weather-location.ts');
const { marketPricesSchema } = require('../lib/admin/schemas.ts');
const { marketReference } = require('../lib/admin/crop-pricing.ts');
const { MarketPrices } = require('../components/market/market-prices.tsx');
const { WeatherCard, WeatherReadings } = require('../components/market/weather-card.tsx');
const { MarketResearchPanel } = require('../components/admin/content/market-research-panel.tsx');
const { DemoDataNotice } = require('../components/market/demo-data-notice.tsx');
const values = new Map();
const sessionValues = new Map();
global.window = {
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  },
  sessionStorage: {
    getItem: (key) => sessionValues.get(key) ?? null,
    setItem: (key, value) => sessionValues.set(key, value),
    removeItem: (key) => sessionValues.delete(key),
  },
};
const accra = { kind: 'place', label: 'Accra, Ghana', region: 'Greater Accra', city: 'Accra' };
const kumasi = { kind: 'place', label: 'Kumasi, Ghana', region: 'Ashanti', city: 'Kumasi' };
const query = { crop: 'Maize', unit: 'kg', quantity: 1, region: 'Ashanti' };
function evidence(patch = {}) {
  const price = publishedPrice(patch);
  return { ...price, id: price.id, region: price.region, source: price.source };
}
function forecast(location = accra) {
  // Provider fixture, never exposed by the default application service.
  return {
    location,
    provider: 'Test provider only',
    updatedAt: '2026-01-16T12:00:00.000Z',
    current: {
      temp: 27,
      description: 'Test condition',
      humidity: 65,
      rainMm: 2,
      rainChance: 30,
      windKph: 11,
    },
    daily: [
      {
        date: '2026-01-17',
        description: 'Test daily condition',
        minTemp: 21,
        maxTemp: 29,
        rainMm: 3,
        rainChance: 40,
        windKph: 12,
      },
    ],
    upcoming: [
      {
        time: '2026-01-16T14:00:00.000Z',
        description: 'Test upcoming condition',
        temp: 26,
        rainChance: 35,
      },
    ],
  };
}

test('publication requires Ghana/GHS evidence, standard units, dates, source and an administrator review', () => {
  assert.equal(publicationError(publishedPrice()), null);
  const invalid = [
    { source: undefined },
    { reviewedAt: undefined },
    { reviewedBy: '' },
    { observedAt: undefined },
    { region: 'Unknown region' },
    { market: '' },
    { unit: 'basket' },
    { quantity: 0 },
    { price: 0 },
    { priceMax: 1 },
    { country: 'US' },
    { currency: 'USD' },
    { source: { ...publishedPrice().source, url: 'javascript:alert(1)' } },
    { source: { ...publishedPrice().source, publishedAt: '2026-02-30' } },
  ];
  for (const patch of invalid) {
    const item = publishedPrice(patch);
    assert.ok(publicationError(item), JSON.stringify(patch));
    assert.equal(marketPricesSchema.safeParse([item]).success, false);
  }
  assert.ok(publicationError(publishedPrice({ observedAt: '2027-01-01' }), '2026-10-25'));
  assert.equal(publishedPrices([publishedPrice({ status: 'draft' }), publishedPrice()]).length, 1);
});

test('national coverage must be explicitly source-supported; same crop may have several markets', () => {
  const national = publishedPrice({ scope: 'national', region: undefined, market: undefined });
  assert.ok(publicationError(national));
  assert.equal(publicationError({ ...national, nationalCoverageConfirmed: true }), null);
  const rows = [
    publishedPrice(),
    publishedPrice({ region: 'Northern', market: 'Another test market' }),
  ];
  assert.equal(marketPricesSchema.safeParse(rows).success, true);
  assert.equal(marketPricesSchema.safeParse([rows[0], rows[0]]).success, false);
});

test('ranges compare matching crops, units, known package weights and dates only', () => {
  const first = publishedPrice({ price: 4 });
  const second = publishedPrice({ price: 6, priceMax: 7, region: 'Northern' });
  assert.deepEqual(
    supportedRanges([first, second]).map((r) => [r.low, r.high, r.count]),
    [[4, 7, 2]],
  );
  for (const patch of [
    { unit: 'tonne' },
    { quantity: 100 },
    { observedAt: '2026-01-14' },
    { crop: 'Rice' },
  ]) {
    assert.equal(supportedRanges([first, publishedPrice(patch)]).length, 0);
  }
  assert.equal(
    supportedRanges([publishedPrice({ unit: 'bag' }), publishedPrice({ unit: 'bag' })]).length,
    0,
  );
  assert.equal(
    supportedRanges([
      publishedPrice({ unit: 'bag', packageWeightKg: 50 }),
      publishedPrice({ unit: 'bag', packageWeightKg: 100 }),
    ]).length,
    0,
  );
});

test('per-tonne reference respects quantities and refuses to select a national price from several observations', () => {
  const price = publishedPrice({ unit: 'bag', quantity: 2, packageWeightKg: 50, price: 400 });
  assert.equal(marketReference('Maize', [price]).perTonne, 4000);
  assert.equal(marketReference('Maize', [price, publishedPrice()]), null);
  assert.equal(marketReference('Maize', [{ ...price, status: 'draft' }]), null);
  assert.equal(marketReference('Maize', [{ ...price, packageWeightKg: undefined }]).perTonne, null);
  assert.equal(marketReference('Maize', [{ ...price, priceMax: 450 }]).perTonne, null);
});

test('research shows no recommendation without matching evidence and cites an exact observation', async () => {
  const item = evidence();
  const provider = {
    research: async () => ({
      evidence: [item],
      recommendedEvidenceId: item.id,
      explanation: 'Use the cited observation only.',
    }),
  };
  const result = await marketResearchService.research(query, { provider });
  assert.equal(result.status, 'ready');
  const draft = evidenceToDraft(result.data.evidence[0]);
  assert.equal(draft.price, item.price);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.reviewedBy, undefined);
  assert.ok(publicationError(draft));
  for (const bad of [
    null,
    { evidence: [], recommendedEvidenceId: 'none', explanation: 'No source' },
    { evidence: [item], recommendedEvidenceId: 'invented', explanation: 'Unsupported' },
    {
      evidence: [{ ...item, currency: 'USD' }],
      recommendedEvidenceId: item.id,
      explanation: 'Wrong currency',
    },
    {
      evidence: [{ ...item, quantity: 100 }],
      recommendedEvidenceId: item.id,
      explanation: 'Wrong quantity',
    },
  ]) {
    assert.equal(
      (await marketResearchService.research(query, { provider: { research: async () => bad } }))
        .status,
      'unavailable',
    );
  }
});

test('research prioritizes official publications and refuses stale units, places and future-dated source claims', async () => {
  const report = evidence({ source: { ...publishedPrice().source, kind: 'market-report' } });
  const official = evidence();
  const run = (items) =>
    marketResearchService.research(query, {
      provider: {
        research: async () => ({
          evidence: items,
          recommendedEvidenceId: items[0].id,
          explanation: 'Cited figures only.',
        }),
      },
    });
  assert.equal((await run([report, official])).data.evidence[0].id, official.id);
  assert.equal((await run([{ ...official, region: 'Northern' }])).status, 'unavailable');
  assert.equal((await run([{ ...official, observedAt: '2099-01-01' }])).status, 'unavailable');
  assert.equal(
    (await run([{ ...official, source: { ...official.source, url: 'javascript:bad()' } }])).status,
    'unavailable',
  );
});

test('server rendering never prompts; browser location denials/timeouts have manual fallbacks', async () => {
  let calls = 0;
  const browser = {
    getCurrentPosition(success, _error, options) {
      calls++;
      assert.deepEqual(options, LOCATION_ATTEMPTS[0], 'A quick fix first');
      success({ coords: { latitude: 5.6, longitude: -0.2, accuracy: 50 } });
    },
  };
  assert.equal(calls, 0);
  renderToStaticMarkup(createElement(WeatherCard));
  assert.equal(calls, 0, 'Rendering never prompts for permission');
  const current = await requestWeatherLocation(browser);
  assert.equal(calls, 1);
  assert.equal(current.latitude, 5.6);
  assert.equal(current.label, 'Your current location', 'No fabricated reverse-geocoded city');
  const tries = [];
  await assert.rejects(
    requestWeatherLocation({
      getCurrentPosition(_success, error, options) {
        tries.push(options);
        error({ code: 1 });
      },
    }),
    /denied/,
  );
  assert.equal(tries.length, 1, 'A refusal is not asked again');
  tries.length = 0;
  await assert.rejects(
    requestWeatherLocation({
      getCurrentPosition(_success, error, options) {
        tries.push(options);
        error({ code: 3 });
      },
    }),
    /could not be found in time/,
  );
  assert.deepEqual(tries, LOCATION_ATTEMPTS, 'A timeout gets one precise GPS attempt');
  assert.equal(tries[1].enableHighAccuracy, true);
  // The precise attempt can succeed where the quick one timed out.
  let attempt = 0;
  const slow = await requestWeatherLocation({
    getCurrentPosition(success, error) {
      if (attempt++ === 0) error({ code: 3 });
      else success({ coords: { latitude: 9.4, longitude: -0.84, accuracy: 12 } });
    },
  });
  assert.equal(slow.latitude, 9.4);
  await assert.rejects(
    requestWeatherLocation({
      getCurrentPosition(success) {
        success({ coords: { latitude: NaN, longitude: 999 } });
      },
    }),
    /invalid location/,
  );
});

test('location keys distinguish cities and coordinates and reject invalid Ghana place selections', () => {
  assert.equal(validWeatherLocation(accra), true);
  assert.notEqual(weatherLocationKey(accra), weatherLocationKey(kumasi));
  assert.equal(validWeatherLocation({ ...accra, region: 'Invalid' }), false);
  assert.equal(
    validWeatherLocation({ kind: 'coordinates', label: 'Test', latitude: 100, longitude: 0 }),
    false,
  );
});

test('future weather adapters receive the selected location and cannot return another city or invalid readings', async () => {
  const locations = [];
  const provider = {
    async getForecast(location) {
      locations.push(location);
      return forecast(location);
    },
  };
  assert.equal((await weatherService.getForecast(accra, { provider })).data.location.city, 'Accra');
  assert.equal(
    (await weatherService.getForecast(kumasi, { provider })).data.location.city,
    'Kumasi',
  );
  assert.equal(locations.length, 2);
  assert.equal(
    (
      await weatherService.getForecast(accra, {
        provider: { getForecast: async () => forecast(kumasi) },
      })
    ).status,
    'unavailable',
  );
  const wrong = forecast(accra);
  wrong.current.humidity = 200;
  assert.equal(
    (await weatherService.getForecast(accra, { provider: { getForecast: async () => wrong } }))
      .status,
    'unavailable',
  );
  await assert.rejects(
    weatherService.getForecast(accra, {
      provider: {
        getForecast: async () => {
          throw new Error('Provider offline');
        },
      },
    }),
    /Provider offline/,
  );
});

test('a forecast without a rain probability (MET Norway) survives the API client', async () => {
  // Through the real api(): it turns most nulls into missing fields, but not this one.
  const met = forecast();
  met.provider = 'MET Norway';
  met.current.rainChance = null;
  met.daily[0].rainChance = null;
  met.upcoming[0].rainChance = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ status: 'ready', data: met }), { status: 200 });
  try {
    const result = await weatherService.getForecast(accra);
    assert.equal(result.status, 'ready');
    assert.equal(result.data.current.rainChance, null);
    assert.equal(result.data.daily[0].rainChance, null);
    assert.equal(result.data.upcoming[0].rainChance, null);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('shared weather UI loads live weather and retains full location controls', () => {
  for (const scope of ['farmer', 'admin']) {
    const html = renderToStaticMarkup(createElement(WeatherCard, { scope }));
    assert.match(html, /Use my current location/);
    assert.match(html, /Loading weather for this location/);
    assert.match(html, /Detecting your location/);
    // Live by default: the demo label belongs to demo reports only.
    assert.doesNotMatch(html, /Demo weather|demo measurements|Update demo weather/);
    assert.match(html, /Ashanti/);
    assert.doesNotMatch(html, /Demo conditions|32°C|undefined/);
  }
  const reading = renderToStaticMarkup(createElement(WeatherReadings, { report: forecast() }));
  for (const label of [
    'Humidity',
    'Rainfall',
    'Rain probability',
    'Wind speed',
    'Daily forecast',
    'Upcoming conditions',
    'Last updated',
  ])
    assert.ok(reading.includes(label), label);
  const research = renderToStaticMarkup(createElement(MarketResearchPanel, { onApprove() {} }));
  assert.match(research, /Check Market Price with AI/);
  assert.match(research, /No recommendation/);
  assert.match(research, /Approve/);
  assert.match(research, /Reject recommendation/);
  assert.match(renderToStaticMarkup(createElement(DemoDataNotice)), /not connected yet/);
});

test('market UI escapes supplied source text and hides all unreviewed observations', () => {
  const price = publishedPrice({ crop: '<script>bad()</script>', price: 3.75, priceMax: 4.25 });
  const html = renderToStaticMarkup(
    createElement(MarketPrices, {
      prices: [price, publishedPrice({ crop: 'PRIVATE DRAFT', status: 'draft' })],
    }),
  );
  assert.doesNotMatch(html, /<script>|PRIVATE DRAFT/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /GHS 3\.75/);
  assert.match(html, /GHS 4\.25/);
  const empty = renderToStaticMarkup(createElement(MarketPrices, { prices: [] }));
  assert.match(empty, /Market price data unavailable/);
  assert.doesNotMatch(empty, /GHS [\d,]+/);
});

test('market and weather have distinct desktop/mobile destinations and dashboard forecast links', () => {
  const {
    NAV_SECTIONS,
    PAGE_META,
    mobileNavFor,
    isItemActive,
  } = require('../constants/navigation.ts');
  const {
    ADMIN_NAV_ITEMS,
    getAdminPageMeta,
    isAdminNavActive,
  } = require('../constants/admin-navigation.ts');
  const { DEFAULT_FEATURE_FLAGS } = require('../lib/admin/defaults.ts');
  const items = NAV_SECTIONS.flatMap((section) => section.items);
  const market = items.find((item) => item.href === '/market');
  const weather = items.find((item) => item.href === '/weather');
  assert.equal(market.label, 'Market Prices');
  assert.equal(weather.label, 'Weather');
  assert.equal(PAGE_META['/weather'].title, 'Weather');
  assert.equal(isItemActive('/weather', market), false);
  assert.equal(isItemActive('/weather', weather), true);
  const enabled = { ...DEFAULT_FEATURE_FLAGS, market: true };
  assert.ok(mobileNavFor(enabled).menu.some((item) => item.href === '/weather'));
  assert.ok(mobileNavFor(enabled).menu.some((item) => item.href === '/market'));
  assert.ok(
    !mobileNavFor({ ...enabled, market: false }).menu.some((item) =>
      ['/market', '/weather'].includes(item.href),
    ),
  );
  const adminWeather = ADMIN_NAV_ITEMS.find((item) => item.href === '/admin/content/weather');
  const adminMarket = ADMIN_NAV_ITEMS.find((item) => item.href === '/admin/content/market');
  assert.equal(getAdminPageMeta(adminWeather.href).title, 'Weather');
  assert.equal(isAdminNavActive(adminWeather.href, adminMarket), false);
  for (const scope of ['farmer', 'admin']) {
    const html = renderToStaticMarkup(createElement(WeatherCard, { scope, compact: true }));
    assert.match(html, /View weather forecast/);
    assert.ok(html.includes(`href="${scope === 'admin' ? adminWeather.href : weather.href}"`));
    assert.doesNotMatch(html, /<form|Use my current location|<select/);
    assert.match(html, /Loading weather/);
    assert.doesNotMatch(html, /Demo weather/);
  }
});

test('automatic location detection shares in-flight permission requests and tries once per account/tab', async () => {
  let calls = 0;
  let success;
  const browser = {
    getCurrentPosition(done) {
      calls++;
      success = done;
    },
  };
  const first = requestInitialWeatherLocation('test-auto-location', browser);
  const strictReplay = requestInitialWeatherLocation('test-auto-location', browser);
  assert.equal(first, strictReplay);
  assert.equal(calls, 1);
  success({ coords: { latitude: 6.69, longitude: -1.62, accuracy: 35 } });
  assert.equal((await first).latitude, 6.69);
  assert.equal(await requestInitialWeatherLocation('test-auto-location', browser), null);
  assert.equal(calls, 1, 'Navigation preserves the current or manually adjusted selection');
  const denied = {
    getCurrentPosition(_success, fail) {
      calls++;
      fail({ code: 1 });
    },
  };
  await assert.rejects(requestInitialWeatherLocation('test-auto-denied', denied), /denied/);
  assert.equal(await requestInitialWeatherLocation('test-auto-denied', denied), null);
  assert.equal(calls, 2, 'Denied permission is not repeatedly requested on navigation');
});
