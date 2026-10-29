import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

/** IDs for the field's message, so the input can point to it with aria-describedby. */
export const fieldErrorId = (htmlFor: string) => `${htmlFor}-error`;
export const fieldHintId = (htmlFor: string) => `${htmlFor}-hint`;

export function FormField({ label, htmlFor, error, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-text-dim text-xs font-semibold tracking-wide uppercase"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={fieldErrorId(htmlFor)} role="alert" className="text-ink-red text-xs">
          {error}
        </p>
      ) : (
        hint && (
          <p id={fieldHintId(htmlFor)} className="text-text-mute text-xs">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
