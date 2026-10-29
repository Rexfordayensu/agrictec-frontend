'use client';

import { useEffect, useRef, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { readReply, replySpeechText, type PlaybackVoice } from '@/lib/ai/voice';
import type { ChatMessage } from '@/types';

export function ReplyAudioButton({ content }: { content: ChatMessage['content'] }) {
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState<PlaybackVoice | null>(null);
  const playback = useRef<ReturnType<typeof readReply> | null>(null);
  useEffect(() => {
    // Ask the browser to load its voice list before the farmer presses Listen. No audio starts.
    window.speechSynthesis?.getVoices();
    const controller = playback;
    return () => {
      controller.current?.dispose();
    };
  }, []);
  function toggle() {
    if (playing) {
      playback.current?.stop();
      return;
    }
    try {
      setPlaying(true);
      playback.current = readReply(replySpeechText(content), {
        onEnd: () => setPlaying(false),
        onError: (message) => toast.error(message),
        onVoice: setVoice,
      });
    } catch (error) {
      setPlaying(false);
      toast.error(error instanceof Error ? error.message : 'Audio playback is unavailable.');
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? 'Stop reading this reply' : 'Listen to this reply'}
        className="text-ink-green hover:bg-accent/10 focus-visible:outline-accent inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium"
      >
        {playing ? (
          <Square size={14} aria-hidden="true" />
        ) : (
          <Volume2 size={14} aria-hidden="true" />
        )}
        {playing ? 'Stop audio' : 'Listen'}
      </button>
      {voice && (
        <span title={voice.name} className="text-text-mute text-[10px]">
          {voice.ghanaian
            ? 'Ghanaian English'
            : voice.name === 'Device default'
              ? 'Device default voice; Ghanaian English requested'
              : 'English fallback: Ghanaian voice not available on this device'}
        </span>
      )}
    </div>
  );
}
