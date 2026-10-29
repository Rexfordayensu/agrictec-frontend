import {
  Bot,
  Check,
  ClipboardCheck,
  ReceiptText,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { DiagnosisResult, Severity } from '@/types';

export const SEVERITY_COLORS = { High: 'red', Moderate: 'gold', None: 'green' } as const;

const severityBorder: Record<Severity, string> = {
  High: 'border-l-danger',
  Moderate: 'border-l-warning',
  None: 'border-l-accent',
};

const severityWash: Record<Severity, string> = {
  High: 'from-danger/15',
  Moderate: 'from-warning/15',
  None: 'from-accent/15',
};

const SEVERITY_LEVELS: Severity[] = ['None', 'Moderate', 'High'];
const LEVEL_FILL: Record<Severity, string> = {
  None: 'bg-accent',
  Moderate: 'bg-warning',
  High: 'bg-danger',
};

/** Splits a treatment paragraph into steps ("Remove pods. Prune trees." → two steps). */
function treatmentSteps(text: string): string[] {
  const sentences = text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length > 1) return sentences;

  // One long sentence ("Remove pods, prune trees, and apply fungicide."): split on commas.
  const parts = text
    .replace(/\.$/, '')
    .split(/,\s*(?:and\s+)?/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return sentences;
  return parts.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}.`);
}

export function DiagnosisCard({
  result,
  saving,
  saved,
  onSave,
  onScanAnother,
  onLogTreatment,
  onAskAssistant,
}: {
  result: DiagnosisResult;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onScanAnother: () => void;
  /** Opens a pre-filled expense record for the treatment cost. */
  onLogTreatment?: () => void;
  onAskAssistant?: () => void;
}) {
  const level = SEVERITY_LEVELS.indexOf(result.severity);
  const steps = treatmentSteps(result.treatment);

  return (
    <div
      className={cn(
        'border-border overflow-hidden rounded-2xl border border-l-4 bg-linear-to-br to-transparent',
        severityBorder[result.severity],
        severityWash[result.severity],
      )}
    >
      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge color="purple">
            <Stethoscope size={11} aria-hidden="true" />
            Mock result
          </Badge>
          <Badge color={SEVERITY_COLORS[result.severity]}>
            {result.severity === 'None' ? 'No issue in sample' : `${result.severity} severity`}
          </Badge>
          {result.crop && <Badge color="blue">{result.crop}</Badge>}
        </div>
        <h4 className="font-display text-text text-2xl font-bold">{result.disease}</h4>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Progress value={result.confidence} label="AI Confidence" />
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-text-dim">Severity</span>
              <span className="text-text font-semibold">{result.severity}</span>
            </div>
            <div className="grid grid-cols-3 gap-1" aria-hidden="true">
              {SEVERITY_LEVELS.map((s, i) => (
                <span
                  key={s}
                  className={cn(
                    'h-2 rounded-full',
                    i <= level ? LEVEL_FILL[result.severity] : 'bg-glass-strong',
                  )}
                />
              ))}
            </div>
            <div
              className="text-text-mute mt-1 flex justify-between text-[10px]"
              aria-hidden="true"
            >
              <span>None</span>
              <span>Moderate</span>
              <span>High</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-border bg-glass border-t p-5">
        <h5 className="text-text flex items-center gap-2 text-sm font-bold">
          <ClipboardCheck size={16} aria-hidden="true" className="text-ink-green" />
          Recommended Treatment
        </h5>
        <ol className="mt-3 space-y-2.5">
          {steps.map((step, i) => (
            <li key={i} className="text-text-dim flex gap-3 text-sm leading-relaxed">
              <span className="bg-accent/15 text-ink-green inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {result.prevention && result.prevention.length > 0 && (
          <>
            <h5 className="text-text mt-5 flex items-center gap-2 text-sm font-bold">
              <ShieldCheck size={16} aria-hidden="true" className="text-ink-green" />
              Prevention
            </h5>
            <ul className="mt-2.5 space-y-2">
              {result.prevention.map((tip, i) => (
                <li key={i} className="text-text-dim flex gap-2.5 text-sm leading-relaxed">
                  <Check size={15} aria-hidden="true" className="text-ink-green mt-0.5 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="bg-gold/10 text-ink-gold mt-4 flex gap-2 rounded-xl p-3 text-xs leading-relaxed">
          <ShieldAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <p>
            AI diagnosis is a guide. Confirm with your MoFA extension officer before applying
            chemicals.
          </p>
        </div>
        <p className="text-text-mute mt-3 text-[11px] leading-relaxed">
          This result is a deterministic demo and does not assess the health of the uploaded plant.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            mutates
            icon={saved ? Check : Save}
            loading={saving}
            disabled={saved}
            onClick={onSave}
          >
            {saved ? 'Diagnosis saved' : 'Save Diagnosis'}
          </Button>
          <Button variant="ghost" icon={RotateCcw} disabled={saving} onClick={onScanAnother}>
            Scan another
          </Button>
          {onLogTreatment && result.severity !== 'None' && (
            <Button mutates variant="ghost" size="sm" icon={ReceiptText} onClick={onLogTreatment}>
              Log treatment cost
            </Button>
          )}
          {onAskAssistant && (
            <Button mutates variant="ghost" size="sm" icon={Bot} onClick={onAskAssistant}>
              Ask the AI assistant
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
