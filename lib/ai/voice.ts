import { assistantText } from '@/lib/ai/assistant-text';
import type { AssistantReply } from '@/types';

interface RecognitionResult {
  [index: number]: { transcript: string };
  length: number;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;
type VoiceWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};
interface DictationCallbacks {
  onText(text: string): void;
  onEnd(): void;
  onError(message: string): void;
}
let activeDictation: (() => void) | null = null;

export function startDictation(
  callbacks: DictationCallbacks,
  browser = typeof window === 'undefined' ? undefined : (window as VoiceWindow),
) {
  const Constructor = browser?.SpeechRecognition ?? browser?.webkitSpeechRecognition;
  if (!Constructor)
    throw new Error(
      'Voice input is not supported in this browser. Please type your question or try another browser.',
    );
  stopReading();
  activeDictation?.();
  const recognition = new Constructor();
  recognition.lang = 'en-GH';
  recognition.continuous = true;
  recognition.interimResults = true;
  let ended = false;
  const detach = () => {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  };
  const finish = () => {
    if (ended) return;
    ended = true;
    detach();
    if (activeDictation === cancel) activeDictation = null;
    callbacks.onEnd();
  };
  const cancel = () => {
    finish();
    recognition.abort();
  };
  activeDictation = cancel;
  recognition.onresult = (event) => {
    if (!ended)
      callbacks.onText(
        Array.from(event.results, (result) => result[0]?.transcript ?? '')
          .join(' ')
          .trim(),
      );
  };
  recognition.onend = finish;
  recognition.onerror = ({ error }) => {
    finish();
    recognition.abort();
    if (error === 'aborted') return;
    callbacks.onError(
      error === 'not-allowed' || error === 'service-not-allowed'
        ? 'Microphone access was denied. Allow it in your browser settings, or type your question.'
        : error === 'audio-capture'
          ? 'No microphone is available. Connect a microphone or type your question.'
          : error === 'no-speech'
            ? 'No speech was detected. Try speaking again or type your question.'
            : error === 'network'
              ? 'Voice input could not connect. Check your connection or type your question.'
              : 'Voice input stopped. Please try again or type your question.',
    );
  };
  try {
    recognition.start();
  } catch (error) {
    finish();
    recognition.abort();
    throw error;
  }
  return {
    stop: () => {
      if (!ended) {
        try {
          recognition.stop();
        } catch {
          cancel();
        }
      }
    },
    /** Detach before aborting: late browser callbacks cannot update an unmounted composer. */
    dispose: () => {
      ended = true;
      detach();
      if (activeDictation === cancel) activeDictation = null;
      recognition.abort();
    },
  };
}

export function replySpeechText(content: string | AssistantReply) {
  return assistantText(
    typeof content === 'string'
      ? content
      : [
          content.title,
          content.intro,
          ...(content.bullets ?? []),
          content.tip ? `Tip: ${content.tip}` : '',
        ]
          .filter(Boolean)
          .join('. '),
  );
}

let activeStop: (() => void) | null = null;
export function stopReading() {
  activeStop?.();
}

/** Small chunks avoid long-response cutoffs; every chunk is read in order. */
export function speechChunks(text: string) {
  const words = text.trim().split(/\s+/);
  const chunks: string[] = [];
  for (const word of words) {
    if (!word) continue;
    const last = chunks.length - 1;
    if (last < 0 || chunks[last].length + word.length + 1 > 180) chunks.push(word);
    else chunks[last] += ` ${word}`;
  }
  return chunks;
}

export function isGhanaianEnglishVoice(voice: Pick<SpeechSynthesisVoice, 'lang' | 'name'>) {
  const language = voice.lang.replaceAll('_', '-').toLowerCase();
  return (
    /^en-gh(?:-|$)/.test(language) ||
    (/^en(?:-|$)/.test(language) && /\bghana(?:ian)?\b/i.test(voice.name))
  );
}

/** Accent comes from the installed voice, not from changing pitch or the language tag alone. */
export function selectEnglishVoice(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((voice) => /^en(?:-|_|$)/i.test(voice.lang));
  return (
    english.find((voice) => /^en[-_]gh(?:-|$)/i.test(voice.lang)) ??
    english.find(isGhanaianEnglishVoice) ??
    english.find((voice) => /^en[-_]gb(?:-|$)/i.test(voice.lang)) ??
    english.find((voice) => voice.default) ??
    english[0]
  );
}

export interface PlaybackVoice {
  name: string;
  ghanaian: boolean;
}

export function readReply(
  text: string,
  callbacks: {
    onEnd(): void;
    onError(message: string): void;
    onVoice?(voice: PlaybackVoice): void;
  },
  browser = typeof window === 'undefined' ? undefined : window,
) {
  if (!browser?.speechSynthesis || !browser.SpeechSynthesisUtterance)
    throw new Error(
      'Reading aloud is not supported in this browser. You can still read the reply on screen.',
    );
  stopReading();
  activeDictation?.();
  const synth = browser.speechSynthesis;
  const chunks = speechChunks(text);
  let current: SpeechSynthesisUtterance | null = null;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (current) {
      current.onend = null;
      current.onerror = null;
    }
    if (activeStop === stop) {
      activeStop = null;
      synth.cancel();
    }
    callbacks.onEnd();
  };
  activeStop = stop;
  let index = 0;
  const next = () => {
    if (stopped) return;
    if (index >= chunks.length) {
      stop();
      return;
    }
    const utterance = new browser.SpeechSynthesisUtterance(chunks[index++]);
    current = utterance;
    utterance.lang = 'en-GH';
    const voices = synth.getVoices();
    const voice = selectEnglishVoice(voices);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang.replaceAll('_', '-');
    }
    callbacks.onVoice?.({
      name: voice?.name ?? 'Device default',
      ghanaian: !!voice && isGhanaianEnglishVoice(voice),
    });
    utterance.rate = 0.95;
    utterance.onend = next;
    utterance.onerror = () => {
      stop();
      callbacks.onError(
        'The reply could not be read aloud. Try again, or read the text on screen.',
      );
    };
    try {
      synth.speak(utterance);
    } catch {
      stop();
      callbacks.onError('Audio playback could not start. Please try again.');
    }
  };
  next();
  return {
    stop,
    dispose: () => {
      callbacks.onEnd = () => {};
      stop();
    },
  };
}
