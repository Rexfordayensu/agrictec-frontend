import { Check, X } from 'lucide-react';
import { ADMIN_PASSWORD_RULES } from '@/lib/admin/passwords';
import { cn } from '@/lib/utils';

/** Live ✓/✗ list of the admin password rules (icons, not emoji). */
export function PasswordChecklist({
  password,
  currentPassword,
  id,
}: {
  password: string;
  /** When known, also checks that the new password differs from it. */
  currentPassword?: string;
  id?: string;
}) {
  const rules = [
    ...ADMIN_PASSWORD_RULES.map((rule) => ({ label: rule.label, met: rule.test(password) })),
    ...(currentPassword !== undefined
      ? [
          {
            label: 'Different from your current password',
            met: password.length > 0 && password !== currentPassword,
          },
        ]
      : []),
  ];

  return (
    <ul id={id} aria-label="Password rules" className="grid gap-1.5 text-xs sm:grid-cols-2">
      {rules.map((rule) => (
        <li
          key={rule.label}
          className={cn(
            'flex items-center gap-1.5',
            rule.met ? 'text-ink-green' : 'text-text-mute',
          )}
        >
          {rule.met ? (
            <Check size={14} strokeWidth={3} aria-hidden="true" />
          ) : (
            <X size={14} strokeWidth={3} aria-hidden="true" />
          )}
          {rule.label}
          <span className="sr-only">{rule.met ? '(met)' : '(not met)'}</span>
        </li>
      ))}
    </ul>
  );
}
