'use client';

import { useProfileStore } from '@/store/profile-store';

/** "Hello, {first name}!" over a field of crop rows (decoration only). */
export function AssistantHero() {
  const name = useProfileStore((s) => s.profile?.name.trim().split(/\s+/)[0]);
  return (
    <section
      aria-labelledby="assistant-hello"
      className="assistant-hero rounded-card relative isolate overflow-hidden p-6 text-white sm:p-7"
      style={{ background: 'linear-gradient(105deg, #054a33 0%, #0a6b47 50%, #138a57 100%)' }}
    >
      <div className="relative z-10 max-w-xl">
        <h2
          id="assistant-hello"
          className="text-[clamp(28px,3.4vw,40px)] leading-tight font-extrabold tracking-tight"
        >
          Hello{name ? `, ${name}` : ''}!
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-white/90">
          I’m your AgriCtec AI Assistant. I can help you with farming advice, financial guidance,
          and loan readiness.
        </p>
      </div>
      <FieldArt />
    </section>
  );
}

function FieldArt() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 420 150"
      preserveAspectRatio="xMaxYMax slice"
      className="pointer-events-none absolute inset-y-0 right-0 -z-0 hidden h-full w-[52%] sm:block"
    >
      <defs>
        <linearGradient id="ah-fade" x1="0" x2="1">
          <stop offset="0" stopColor="#0a6b47" />
          <stop offset="0.55" stopColor="#0a6b47" stopOpacity="0.35" />
          <stop offset="1" stopColor="#0a6b47" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ah-sky" x2="0" y2="1">
          <stop stopColor="#80c0cf" />
          <stop offset="1" stopColor="#e0e6ba" />
        </linearGradient>
        <linearGradient id="ah-crop" x2=".8" y2="1">
          <stop stopColor="#c3db30" />
          <stop offset=".4" stopColor="#76aa12" />
          <stop offset="1" stopColor="#226514" />
        </linearGradient>
        <linearGradient id="ah-field" x2="1" y2="1">
          <stop stopColor="#477d25" />
          <stop offset="1" stopColor="#193e15" />
        </linearGradient>
      </defs>
      <rect width="420" height="150" fill="url(#ah-sky)" />
      <path
        d="M210 20q30-14 38-4q17-13 32 0h-70M340 10q12-12 22-2q20-10 35 3h-57"
        fill="#fff5cb"
        opacity=".7"
      />
      <path d="M0 0H155Q218 25 260 45T420 33V150H0Z" fill="#44845b" />
      <path d="M0 34Q110 14 198 58T420 50V150H0Z" fill="#28724d" />
      <path d="M0 88Q140 83 258 71T420 58V150H0Z" fill="url(#ah-field)" />
      {Array.from({ length: 11 }, (_, row) => {
        const start = 240 + row * 15;
        const end = -130 + row * 65;
        return (
          <g key={row}>
            <path d={`M${start} 73L${end} 155`} stroke="#b4a039" strokeWidth="3" opacity=".75" />
            {Array.from({ length: 13 }, (_, step) => {
              const t = (step + 1) / 13;
              const x = start + (end - start) * t;
              const y = 73 + 82 * t;
              return (
                <g key={step}>
                  <ellipse
                    cx={x + 2}
                    cy={y + 3}
                    rx={1 + 8 * t}
                    ry={1 + 3 * t}
                    fill="#102c12"
                    opacity=".5"
                  />
                  <ellipse cx={x} cy={y} rx={1 + 7 * t} ry={1 + 5 * t} fill="url(#ah-crop)" />
                  <path
                    d={`M${x} ${y + 3 * t}l${2 * t} ${-8 * t}`}
                    stroke="#c8dc55"
                    strokeWidth={0.5 + t}
                    opacity=".5"
                  />
                </g>
              );
            })}
          </g>
        );
      })}
      <g transform="translate(70 92)">
        <path d="M18 58 Q 16 34 18 12" stroke="#6fd36c" strokeWidth="4" fill="none" />
        <path d="M18 30 Q -6 22 -4 2 Q 16 6 18 30 Z" fill="#8fe07f" />
        <path d="M19 22 Q 40 6 50 18 Q 38 34 19 22 Z" fill="#76d36e" />
      </g>
      <rect width="420" height="150" fill="url(#ah-fade)" />
    </svg>
  );
}
