import { Check, ChevronRight, ImagePlus, ScanSearch, ShieldCheck, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The page banner (the user's field photo with the title over a green wash). */
export function CropDoctorHero() {
  return (
    <section
      aria-labelledby="crop-doctor-title"
      className="rounded-card relative isolate overflow-hidden p-5 text-white sm:p-7"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover"
        style={{
          backgroundImage: "url('/images/crop-doctor/crop-doctor-banner.jpg')",
          backgroundPosition: '70% 70%',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(90deg, rgba(4,62,38,0.98) 0%, rgba(6,84,50,0.92) 42%, rgba(6,84,50,0.35) 72%, rgba(6,84,50,0.05) 100%)',
        }}
      />
      <div className="flex items-center gap-5 sm:gap-6">
        <span className="bg-icon-light-bg text-icon-light hidden size-20 shrink-0 items-center justify-center rounded-3xl sm:inline-flex sm:size-24">
          <Stethoscope size={44} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1
            id="crop-doctor-title"
            className="font-display text-display leading-tight font-extrabold tracking-tight"
          >
            AI Crop Doctor
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90">
            Upload a clear photo of your crop leaf to detect problems, get a diagnosis and treatment
            advice.
          </p>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: ImagePlus, title: 'Upload a leaf photo', text: 'Take a clear, close-up photo.' },
  { icon: ScanSearch, title: 'Get a diagnosis', text: 'See the likely problem.' },
  { icon: ShieldCheck, title: 'Treat and prevent', text: 'Follow practical advice.' },
];

/**
 * How a scan works, following the farmer's progress: 1 while choosing a photo, 2 while the AI
 * reads it, 3 once the diagnosis and its advice are on screen.
 */
export function CropDoctorSteps({ stage }: { stage: 1 | 2 | 3 }) {
  return (
    <ol
      aria-label="How the Crop Doctor works"
      className="rounded-card border-border bg-glass grid grid-cols-1 gap-3 border p-3 sm:p-4 @3xl:grid-cols-3 @3xl:gap-0"
    >
      {STEPS.map(({ icon: Icon, title, text }, index) => {
        const number = index + 1;
        const done = number < stage;
        const current = number === stage;
        return (
          <li
            key={title}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'relative flex items-center gap-3 rounded-2xl px-2 py-1.5 @3xl:px-4',
              index > 0 && '@3xl:border-border @3xl:border-l',
            )}
          >
            <span
              className={cn(
                'font-display inline-flex size-12 shrink-0 items-center justify-center rounded-xl text-2xl font-extrabold',
                current || done ? 'bg-icon-bg text-icon' : 'bg-glass-strong text-text-mute',
              )}
            >
              {done ? <Check size={24} aria-label="Done" /> : number}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-text flex items-center gap-2 text-sm font-bold">
                <Icon size={18} aria-hidden="true" className="text-icon shrink-0" />
                {title}
              </span>
              <span className="text-text-dim mt-0.5 block text-sm">{text}</span>
            </span>
            {index < STEPS.length - 1 && (
              <ChevronRight
                size={20}
                aria-hidden="true"
                className="text-text-mute hidden shrink-0 @3xl:block"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
