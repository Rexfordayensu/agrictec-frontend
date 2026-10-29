'use client';

import { READ_ONLY_MESSAGE, useReadOnly } from '@/lib/read-only';
import { useState } from 'react';
import { Languages, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useSettingsStore } from '@/store/settings-store';
import type { Language } from '@/types';

const languages: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'tw', label: 'Twi' },
  { value: 'ga', label: 'Ga' },
  { value: 'ee', label: 'Ewe' },
  { value: 'ha', label: 'Hausa' },
];
export function AppearanceSettings() {
  const language = useSettingsStore((state) => state.language);
  const status = useSettingsStore((state) => state.status);
  const [saving, setSaving] = useState(false);
  const readOnly = useReadOnly();
  return (
    <Card className="h-full rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Palette size={18} aria-hidden="true" className="text-ink-purple" />
            Appearance
          </CardTitle>
          <CardSub>Make AgriCtec feel like home</CardSub>
        </div>
      </CardHeader>
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b pb-5">
        <div>
          <p className="text-text text-sm font-semibold">Theme</p>
          <p className="text-text-mute mt-1 text-xs">Light or dark, your choice.</p>
        </div>
        <ThemeToggle />
      </div>
      <div className="pt-5">
        <label
          htmlFor="settings-language"
          className="text-text flex items-center gap-1.5 text-sm font-semibold"
        >
          <Languages size={15} aria-hidden="true" className="text-ink-green" />
          Language
        </label>
        <Select
          id="settings-language"
          value={language}
          disabled={saving || status !== 'ready' || readOnly}
          title={readOnly ? READ_ONLY_MESSAGE : undefined}
          className="mt-3"
          onChange={async (event) => {
            const next = event.target.value as Language;
            setSaving(true);
            try {
              await useSettingsStore.getState().setLanguage(next);
              if (next !== 'en')
                toast.info(
                  `${languages.find((item) => item.value === next)?.label} translation coming soon — showing English for now`,
                );
            } catch {
              toast.error('Could not save your language preference');
            } finally {
              setSaving(false);
            }
          }}
        >
          {languages.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <p className="text-text-mute mt-2 text-xs leading-relaxed">
          English is available now. Your language preference is saved for future translations.
        </p>
      </div>
    </Card>
  );
}
