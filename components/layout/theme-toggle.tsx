'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useMounted } from '@/hooks/use-mounted';

const buttonClass =
  'glass inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-text transition-colors hover:bg-glass-strong';

export function ThemeToggle() {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();

  // The theme is only known in the browser: render a same-size placeholder until then.
  if (!mounted) {
    return (
      <span aria-hidden="true" className={buttonClass}>
        <span className="size-[18px]" />
      </span>
    );
  }

  const isDark = resolvedTheme !== 'light';
  const next = isDark ? 'light' : 'dark';
  const Icon = isDark ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(next);
        toast.success(`Switched to ${next} mode`);
      }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={buttonClass}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
