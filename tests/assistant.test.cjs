/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS hooks load the app's TypeScript without an extra test dependency. */
// Run: node --test --test-isolation=none tests/assistant.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

// Exercise the actual TypeScript modules with Node's test runner, without a test dependency.
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

const { getAssistantReply } = require('../lib/ai/assistant-replies.ts');
const { marketService } = require('../services/market.service.ts');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MessageContent } = require('../components/assistant/message-content.tsx');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
global.window = { localStorage: memoryStorage(), sessionStorage: memoryStorage() };

const ctx = {
  farmerName: 'Ama',
  region: 'Northern',
  primaryCrops: ['Maize', 'Cassava'],
  score: 612,
  income: 4500,
  expenses: 1500,
  recordCount: 7,
  creditFactors: {
    score: 612,
    paymentHistory: 80,
    recordCompleteness: 60,
    incomeStability: 50,
    momoActivity: 10,
    verification: 75,
  },
};

test('first-match routing, personal finances and zero-income handling', async () => {
  const [first, finance, empty] = await Promise.all([
    getAssistantReply('when to plant maize with pest damage', ctx),
    getAssistantReply('what are my profits', ctx),
    getAssistantReply('income and expenses', { ...ctx, income: 0, expenses: 200, recordCount: 1 }),
  ]);
  assert.equal(first.title, 'Maize Planting in Ghana');
  assert.deepEqual(finance.bullets, [
    'Total income: GHS 4,500.',
    'Total expenses: GHS 1,500.',
    'Net profit: GHS 3,000.',
    'Profit margin: 66.7%.',
  ]);
  assert.match(empty.bullets[2], /-GHS 200/);
  assert.match(empty.bullets[3], /no income recorded/);
  assert.doesNotMatch(JSON.stringify(empty), /NaN|Infinity/);
});

test('weather uses market.service values and condition-specific advice', async () => {
  const original = marketService.getWeather;
  marketService.getWeather = async () => ({
    condition: 'storm',
    description: 'Test storm',
    temp: 24,
    humidity: 88,
    rainChance: 90,
  });
  try {
    const reply = await getAssistantReply('rain', ctx);
    assert.match(reply.intro, /Test storm, 24°C, 88% humidity and 90%/);
    assert.match(reply.intro, /location-specific availability/);
    assert.match(reply.bullets.join(' '), /drainage.*thunderstorms/);
  } finally {
    marketService.getWeather = original;
  }
});

test('React escapes both user text and every structured reply field', () => {
  const html = '<b>hi</b><script>alert(1)</script>';
  const plain = renderToStaticMarkup(createElement(MessageContent, { content: html }));
  assert.match(plain, /&lt;b&gt;hi&lt;\/b&gt;/);
  assert.doesNotMatch(plain, /<b>|<script>/);
  const structured = renderToStaticMarkup(
    createElement(MessageContent, {
      content: { title: html, intro: html, bullets: [html], tip: html },
    }),
  );
  assert.doesNotMatch(structured, /<b>|<script>/);
  assert.match(structured, /<ul/);
  assert.match(structured, /<li\b/);
  assert.match(structured, /Tip:/);
});

test('saved assistant emoji prefixes render as icons while user text stays intact', () => {
  const content = {
    title: '\u{1F33D} Maize Planting in Ghana',
    intro: 'Growing advice \u{1F331}',
    tip: '\u{1F4A1} Test your soil.',
  };
  const rendered = renderToStaticMarkup(createElement(MessageContent, { content }));
  assert.doesNotMatch(rendered, /\p{Extended_Pictographic}/u);
  assert.match(rendered, /lucide-sprout/);
  assert.match(rendered, /lucide-lightbulb/);
  assert.match(rendered, /Maize Planting in Ghana/);
  const user = renderToStaticMarkup(
    createElement(MessageContent, { content: 'My maize \u{1F33D}', isAssistant: false }),
  );
  assert.match(user, /My maize \u{1F33D}/u);
});

test('voice input transcribes revised results, handles permission errors and detaches on disposal', () => {
  const { startDictation } = require('../lib/ai/voice.ts');
  let instance;
  class Recognition {
    constructor() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- Expose the fake browser controller to exercise callbacks.
      instance = this;
      this.started = 0;
      this.aborted = 0;
    }
    start() {
      this.started++;
    }
    stop() {
      this.onend?.();
    }
    abort() {
      this.aborted++;
    }
  }
  const transcripts = [];
  const errors = [];
  let ends = 0;
  assert.equal(instance, undefined, 'No microphone request until the farmer clicks');
  const callbacks = {
    onText: (text) => transcripts.push(text),
    onEnd: () => ends++,
    onError: (error) => errors.push(error),
  };
  const session = startDictation(callbacks, { webkitSpeechRecognition: Recognition });
  assert.equal(instance.started, 1);
  assert.equal(instance.lang, 'en-GH');
  instance.onresult({ results: [[{ transcript: 'Help my' }]] });
  instance.onresult({
    results: [[{ transcript: 'Help my maize' }], [{ transcript: 'leaves are yellow' }]],
  });
  assert.deepEqual(transcripts, ['Help my', 'Help my maize leaves are yellow']);
  session.stop();
  assert.equal(ends, 1);
  const second = startDictation(callbacks, { SpeechRecognition: Recognition });
  const late = instance.onresult;
  second.dispose();
  late({ results: [[{ transcript: 'Do not leak into the next account' }]] });
  assert.equal(transcripts.length, 2);
  assert.equal(instance.aborted, 1);
  startDictation(callbacks, { SpeechRecognition: Recognition });
  instance.onerror({ error: 'not-allowed' });
  assert.match(errors.at(-1), /Microphone access was denied/);
  assert.equal(instance.onresult, null);
  assert.throws(() => startDictation(callbacks, {}), /not supported.*type/);
});

test('listen reads the complete structured answer in chunks and never overlaps another reply', () => {
  const { replySpeechText, readReply } = require('../lib/ai/voice.ts');
  const said = [];
  let cancellations = 0;
  let ends = 0;
  const errors = [];
  const browser = {
    SpeechSynthesisUtterance: class {
      constructor(text) {
        this.text = text;
      }
    },
    speechSynthesis: {
      getVoices: () => [{ lang: 'en-GH', name: 'Test voice' }],
      speak: (utterance) => said.push(utterance),
      cancel: () => cancellations++,
    },
  };
  const content = {
    title: 'Maize care',
    intro: 'Check your crop.',
    bullets: Array.from({ length: 20 }, (_, i) => `Step ${i + 1}: inspect the leaves and soil.`),
    tip: 'Ask your extension officer.',
  };
  const text = replySpeechText(content);
  readReply(text, { onEnd: () => ends++, onError: (error) => errors.push(error) }, browser);
  for (let i = 0; i < said.length; i++) said[i].onend?.();
  assert.ok(said.length > 1);
  assert.equal(said.map((part) => part.text).join(' '), text);
  assert.equal(ends, 1);
  assert.equal(said[0].voice.lang, 'en-GH');
  const first = readReply('First reply', { onEnd: () => ends++, onError() {} }, browser);
  const second = readReply('Second reply', { onEnd: () => ends++, onError() {} }, browser);
  assert.equal(ends, 2, 'Starting the second reply stops the first');
  const before = cancellations;
  first.dispose();
  assert.equal(cancellations, before, 'Disposing an older reply cannot stop the new reply');
  second.stop();
  assert.equal(cancellations, before + 1);
  assert.deepEqual(errors, []);
  assert.throws(() => readReply('Hello', { onEnd() {}, onError() {} }, {}), /not supported/);
});

test('microphone and reply audio stop each other and playback errors leave the text available', () => {
  const { startDictation, readReply } = require('../lib/ai/voice.ts');
  let micEnds = 0;
  let audioEnds = 0;
  let utterance;
  let mic;
  const browser = {
    SpeechRecognition: class {
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- Expose the fake microphone controller for cleanup assertions.
        mic = this;
      }
      start() {}
      stop() {
        this.onend?.();
      }
      abort() {}
    },
    SpeechSynthesisUtterance: class {
      constructor(text) {
        this.text = text;
      }
    },
    speechSynthesis: {
      getVoices: () => [],
      speak: (value) => (utterance = value),
      cancel() {},
    },
  };
  const microphone = () =>
    startDictation({ onText() {}, onEnd: () => micEnds++, onError() {} }, browser);
  microphone();
  const errors = [];
  readReply(
    'A complete answer',
    { onEnd: () => audioEnds++, onError: (message) => errors.push(message) },
    browser,
  );
  assert.equal(micEnds, 1);
  assert.equal(mic.onresult, null);
  utterance.onerror();
  assert.equal(audioEnds, 1);
  assert.match(errors[0], /read the text on screen/);
  readReply('Another reply', { onEnd: () => audioEnds++, onError() {} }, browser);
  microphone().dispose();
  assert.equal(audioEnds, 2, 'Starting dictation stops audio playback');
});

test('AI reply bubbles expose Listen controls while farmer messages do not', () => {
  const { MessageBubble } = require('../components/assistant/message-bubble.tsx');
  const message = {
    id: 'speech-ui',
    role: 'ai',
    content: { title: 'Farm advice', tip: 'Check soil.' },
    createdAt: '2026-10-25T12:00:00Z',
  };
  const html = renderToStaticMarkup(createElement(MessageBubble, { message }));
  assert.match(html, /Listen to this reply/);
  assert.match(html, /Farm advice/);
  const farmer = renderToStaticMarkup(
    createElement(MessageBubble, { message: { ...message, role: 'user', content: 'My question' } }),
  );
  assert.doesNotMatch(farmer, /Listen to this reply/);
});

test('playback prioritizes Ghanaian English locales and named Ghanaian English voices with an honest fallback', () => {
  const { selectEnglishVoice, isGhanaianEnglishVoice, readReply } = require('../lib/ai/voice.ts');
  const us = { name: 'US English', lang: 'en-US', default: true };
  const uk = { name: 'UK English', lang: 'en-GB' };
  const gh = { name: 'Ghana English', lang: 'en_GH' };
  const named = { name: 'Ghanaian English voice', lang: 'en' };
  const twi = { name: 'Ghana Twi', lang: 'ak-GH' };
  assert.equal(selectEnglishVoice([us, uk, named, gh]), gh);
  assert.equal(selectEnglishVoice([us, named]), named);
  assert.equal(selectEnglishVoice([us, uk]), uk);
  assert.equal(selectEnglishVoice([twi, us]), us);
  assert.equal(isGhanaianEnglishVoice(twi), false);
  assert.equal(selectEnglishVoice([]), undefined);
  let selected;
  let spoken;
  const browser = {
    SpeechSynthesisUtterance: class {
      constructor(text) {
        this.text = text;
      }
    },
    speechSynthesis: {
      getVoices: () => [us, uk],
      speak: (utterance) => (spoken = utterance),
      cancel() {},
    },
  };
  const playback = readReply(
    'Akwaaba. Here is your farm advice.',
    { onEnd() {}, onError() {}, onVoice: (voice) => (selected = voice) },
    browser,
  );
  assert.equal(spoken.voice, uk);
  assert.equal(spoken.lang, 'en-GB', 'A fallback is not falsely tagged as a Ghanaian voice');
  assert.deepEqual(selected, { name: 'UK English', ghanaian: false });
  playback.dispose();
});
