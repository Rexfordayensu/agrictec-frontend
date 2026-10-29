import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

/** Shared look for Input, Select and Textarea. */
export const fieldClass = (error?: boolean) =>
  cn(
    'w-full rounded-xl border bg-bg-2 px-3.5 text-sm text-text transition-[border-color,box-shadow] duration-200',
    'focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-60',
    error ? 'border-danger focus:border-danger' : 'border-border',
  );

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={error || undefined}
      className={cn(fieldClass(error), 'min-h-11 py-2.5', className)}
      {...props}
    />
  );
});
