import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { fieldClass } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={error || undefined}
      className={cn(fieldClass(error), 'resize-y py-2.5', className)}
      {...props}
    />
  );
});
