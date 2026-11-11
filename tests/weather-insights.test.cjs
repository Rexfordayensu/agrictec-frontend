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

// Run: node --test tests/weather-insights.test.cjs
const {
  weatherWarnings,
  farmAdvice,
  dayLabel,
  hourLabel,
  updatedLabel,
  ghanaDate,
  conditionOf,
} = require('../lib/market/weather-insights.ts');

const TODAY = '2026-06-10'; // June: growing season in the south and the north.
const addDays = (n) => {
  const d = new Date(`${TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const report = (rain, chance, storms = rain.map(() => false)) => ({
  daily: rain.map((r, i) => ({
    date: addDays(i),
    description: 'x',
    minTemp: 22,
    maxTemp: 30,
    rainMm: r,
    rainChance: chance[i],
    windKph: 8,
    storm: storms[i],
  })),
});

// The same cases as the API's tests/test_farm_alerts.py: the page and the alerts must agree.
test('heavy rain in the next 3 days warns once, for the nearest day', () => {
  const w = weatherWarnings(
    report([2, 25, 40, 0, 0, 0, 0], [20, 80, 90, 10, 10, 10, 10]),
    'Ashanti',
    TODAY,
  );
  assert.deepEqual(
    w.map((x) => x.title),
    ['Heavy rain expected tomorrow'],
  );
  assert.match(w[0].body, /about 25 mm of rain \(80% chance\)/);
});

test('unlikely or light rain, and rain beyond 3 days, never warn', () => {
  assert.deepEqual(
    weatherWarnings(report([25, 5, 5, 5, 5, 5, 5], [30, 50, 50, 50, 50, 50, 50]), 'Ashanti', TODAY),
    [],
  );
  assert.deepEqual(
    weatherWarnings(report([0, 0, 0, 45, 0, 5, 5], Array(7).fill(50)), 'Ashanti', TODAY),
    [],
  );
});

test('a storm warns, and a missing rain chance does not block heavy rain', () => {
  const storm = weatherWarnings(
    report([3, 0, 0, 5, 5, 5, 5], Array(7).fill(40), [true, ...Array(6).fill(false)]),
    'Ashanti',
    TODAY,
  );
  assert.equal(storm[0].title, 'Thunderstorm expected today');
  assert.equal(storm[0].kind, 'storm');
  const noChance = weatherWarnings(
    report([0, 0, 30, 5, 5, 5, 5], Array(7).fill(null)),
    'Ashanti',
    TODAY,
  );
  assert.match(noChance[0].title, /^Heavy rain expected on /);
});

test('dry spells warn only in the growing season for the zone', () => {
  const dry = report([0, 0, 0.5, 0, 0, 0.5, 0], Array(7).fill(5));
  assert.deepEqual(
    weatherWarnings(dry, 'Ashanti', TODAY).map((w) => w.title),
    ['Dry spell ahead'],
  );
  assert.deepEqual(weatherWarnings(dry, 'Ashanti', '2026-01-12'), []);
  assert.deepEqual(weatherWarnings(dry, 'Upper East', '2026-03-09'), []);
  assert.notDeepEqual(weatherWarnings(dry, 'Volta', '2026-03-09'), []);
  const shower = report([0, 0, 0, 0, 1, 0, 0], [5, 5, 5, 5, 60, 5, 5]);
  assert.deepEqual(weatherWarnings(shower, 'Ashanti', TODAY), []);
});

test('days and hours are shown in Ghana time', () => {
  assert.equal(dayLabel(TODAY, TODAY), 'Today');
  assert.equal(dayLabel(addDays(1), TODAY), 'Tomorrow');
  assert.equal(dayLabel('2026-06-13', TODAY), 'Sat 13 Jun');
  // Ghana is GMT all year: 14:00Z is 14:00 in Accra, whatever this computer's time zone is.
  assert.equal(hourLabel('2026-06-10T14:00:00.000Z'), '14:00');
  assert.equal(updatedLabel('2026-06-10T23:30:00.000Z'), '10 Jun, 23:30');
  assert.equal(ghanaDate(new Date('2026-06-10T23:59:00Z')), '2026-06-10');
});

test('farm advice follows the forecast and never treats an unknown rain chance as dry', () => {
  const base = {
    current: { windKph: 6 },
    upcoming: Array.from({ length: 12 }, () => ({ rainChance: 10 })),
    daily: [
      { date: TODAY, rainMm: 0, maxTemp: 31, storm: false },
      { date: addDays(1), rainMm: 0, storm: false },
    ],
  };
  const calm = Object.fromEntries(farmAdvice(base, TODAY).map((a) => [a.key, a.tone]));
  assert.deepEqual(calm, { spraying: 'good', fertilizer: 'caution', drying: 'good' });

  const windyWet = farmAdvice(
    {
      ...base,
      current: { windKph: 22 },
      upcoming: Array(12).fill({ rainChance: 70 }),
      daily: [{ date: TODAY, rainMm: 30, maxTemp: 36, storm: false }, base.daily[1]],
    },
    TODAY,
  );
  const tones = Object.fromEntries(windyWet.map((a) => [a.key, a.tone]));
  assert.deepEqual(tones, {
    spraying: 'avoid',
    fertilizer: 'avoid',
    drying: 'avoid',
    heat: 'caution',
  });

  const unknown = farmAdvice({ ...base, upcoming: Array(12).fill({ rainChance: null }) }, TODAY);
  assert.ok(unknown.filter((a) => a.key !== 'fertilizer').every((a) => a.tone === 'caution'));
});

test('icons follow the provider words, and a storm flag wins', () => {
  assert.equal(conditionOf('Thunderstorm with hail'), 'storm');
  assert.equal(conditionOf('Light rain showers'), 'showers');
  assert.equal(conditionOf('Overcast'), 'partly-cloudy');
  assert.equal(conditionOf('Clear sky'), 'sunny');
  assert.equal(conditionOf('Partly cloudy', true), 'storm');
});

test('a rain amount or wind speed the source left out is unknown, never dry or calm', () => {
  // Six dry days and one with no amount given: that day could be the rain, so no dry spell.
  const gap = report([0, 0, null, 0, 0, 0, 0], Array(7).fill(null));
  assert.deepEqual(weatherWarnings(gap, 'Ashanti', TODAY), []);
  // An unknown amount is never heavy rain either.
  assert.deepEqual(
    weatherWarnings(report([null, null, null, 0, 0, 0, 0], Array(7).fill(90)), 'Ashanti', TODAY),
    [],
  );

  const advice = farmAdvice(
    {
      current: { windKph: null },
      upcoming: Array(12).fill({ rainChance: 10 }),
      daily: [
        { date: TODAY, rainMm: null, maxTemp: 30 },
        { date: addDays(1), rainMm: null },
      ],
    },
    TODAY,
  );
  const byKey = Object.fromEntries(advice.map((a) => [a.key, a]));
  assert.equal(byKey.spraying.tone, 'caution');
  assert.match(byKey.spraying.text, /no wind speed/);
  assert.equal(byKey.fertilizer.tone, 'caution');
  assert.match(byKey.fertilizer.text, /no rain amounts/);
});
