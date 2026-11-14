'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import {
  Bell,
  Check,
  CloudLightning,
  Info,
  Languages,
  Mail,
  MessageSquareText,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Store,
  Sun,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMounted } from '@/hooks/use-mounted';
import { readOnlyMessage, useReadOnly } from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { DEFAULT_SETTINGS } from '@/services/settings.service';
import { useSettingsStore } from '@/store/settings-store';
import type { Language, NotificationSettings } from '@/types';

type Theme = 'light' | 'dark';
type Saved = { language: Language; notifications: NotificationSettings };

/** The app's own default (app-providers.tsx): dark. */
const DEFAULT_THEME: Theme = 'dark';

/** Only English is translated today; the others are listed (disabled) so farmers know they're coming. */
const LANGUAGES: { value: Language; label: string; available?: boolean }[] = [
  { value: 'en', label: 'English', available: true },
  { value: 'tw', label: 'Twi' },
  { value: 'ga', label: 'Ga' },
  { value: 'ee', label: 'Ewe' },
  { value: 'ha', label: 'Hausa' },
];

const ALERTS: {
  key: 'aiInsights' | 'weatherAlerts' | 'priceAlerts';
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    key: 'aiInsights',
    icon: TrendingUp,
    title: 'Dashboard tips',
    description: 'Show farming and money tips, based on your records, on your dashboard.',
  },
  {
    key: 'weatherAlerts',
    icon: CloudLightning,
    title: 'Weather alerts',
    description:
      'Heavy rain or a thunderstorm in the next 3 days, or a dry week in the growing season.',
  },
  {
    key: 'priceAlerts',
    icon: Store,
    title: 'Market price alerts',
    description:
      'When a reviewed price for a crop you grow moves 10% or more (local prices only for your region).',
  },
];

const same = (a: Saved, b: Saved) =>
  a.language === b.language &&
  (Object.keys(a.notifications) as (keyof NotificationSettings)[]).every(
    (key) => a.notifications[key] === b.notifications[key],
  );

/**
 * Settings → Preferences: theme, language, which alerts to get and how. Changes are kept on the
 * page until Save changes; language and alerts are saved to the account (GET/PUT /me/settings),
 * the theme to this browser.
 */
export function PreferencesView() {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();
  const language = useSettingsStore((s) => s.language);
  const notifications = useSettingsStore((s) => s.notifications);
  const smsAvailable = useSettingsStore((s) => s.smsAvailable);
  const status = useSettingsStore((s) => s.status);
  const readOnly = useReadOnly();

  const saved: Saved = { language, notifications };
  const [draft, setDraft] = useState<Saved | null>(null);
  const [themeChoice, setThemeChoice] = useState<Theme | null>(null);
  const [saving, setSaving] = useState(false);

  const currentTheme: Theme = resolvedTheme === 'light' ? 'light' : 'dark';
  const theme = themeChoice ?? currentTheme;
  const shown = draft ?? saved;
  const settingsChanged = draft !== null && !same(draft, saved);
  const themeChanged = themeChoice !== null && themeChoice !== currentTheme;
  const dirty = settingsChanged || themeChanged;
  const locked = readOnly || saving || status !== 'ready';

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const edit = (change: (current: Saved) => Saved) => setDraft(change(draft ?? saved));
  const setAlert = (key: keyof NotificationSettings, on: boolean) =>
    edit((current) => ({ ...current, notifications: { ...current.notifications, [key]: on } }));

  async function save() {
    setSaving(true);
    try {
      if (settingsChanged && draft) await useSettingsStore.getState().saveAll(draft);
      if (themeChanged && themeChoice) setTheme(themeChoice);
      setDraft(null);
      setThemeChoice(null);
      toast.success('Preferences saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your preferences');
    } finally {
      setSaving(false);
    }
  }

  function resetToDefaults() {
    setDraft({
      language: DEFAULT_SETTINGS.language,
      notifications: { ...DEFAULT_SETTINGS.notifications },
    });
    setThemeChoice(DEFAULT_THEME);
  }

  return (
    <section aria-labelledby="settings-page-heading" className="@container/prefs min-w-0 space-y-5">
      <Banner />

      {status === 'error' && (
        <p role="alert" className="text-ink-red text-sm">
          Could not load your preferences. Check your connection and refresh the page.
        </p>
      )}

      <Panel className="grid grid-cols-1 gap-5 @3xl/prefs:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <PanelHead
            id="theme-title"
            icon={Palette}
            title="Appearance & theme"
            sub="Make AgriCtec feel like home."
          />
          <div
            role="radiogroup"
            aria-labelledby="theme-title"
            className="mt-4 grid grid-cols-1 gap-3 @md/prefs:grid-cols-2"
          >
            <ThemeOption
              value="light"
              icon={Sun}
              title="Light"
              sub="Clean and bright"
              checked={mounted && theme === 'light'}
              disabled={readOnly || saving}
              onSelect={setThemeChoice}
            />
            <ThemeOption
              value="dark"
              icon={Moon}
              title="Dark"
              sub="Easy on your eyes"
              checked={mounted && theme === 'dark'}
              disabled={readOnly || saving}
              onSelect={setThemeChoice}
            />
          </div>
        </div>
        <div className="border-border min-w-0 @3xl/prefs:border-l @3xl/prefs:pl-6">
          <p className="text-text text-sm font-bold">Preview</p>
          <ThemePreview theme={mounted ? theme : 'dark'} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 items-stretch gap-5 @3xl/prefs:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <PanelHead
              id="language-title"
              icon={Languages}
              title="Language & region"
              sub="Choose your preferred language."
            />
            <label
              htmlFor="settings-language"
              className="text-text mt-5 block text-sm font-semibold"
            >
              Language
            </label>
            <Select
              id="settings-language"
              value={
                LANGUAGES.some((l) => l.value === shown.language && l.available)
                  ? shown.language
                  : 'en'
              }
              disabled={locked}
              title={readOnly ? readOnlyMessage() : undefined}
              className="mt-2"
              onChange={(event) =>
                edit((current) => ({ ...current, language: event.target.value as Language }))
              }
            >
              {LANGUAGES.map((item) => (
                <option key={item.value} value={item.value} disabled={!item.available}>
                  {item.available ? item.label : `${item.label} (coming soon)`}
                </option>
              ))}
            </Select>
            <p className="bg-info/12 text-ink-blue mt-4 flex items-start gap-2.5 rounded-xl p-3.5 text-sm leading-relaxed">
              <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
              AgriCtec is in English for now. Twi, Ga, Ewe and Hausa are coming soon.
            </p>
          </Panel>

          <Panel className="@container/channels">
            <PanelHead
              id="channels-title"
              icon={Mail}
              title="Notification channels"
              sub="Choose how you want to receive alerts."
            />
            <div className="mt-4 grid grid-cols-1 gap-3 @md/channels:grid-cols-2">
              <Channel
                icon={Bell}
                title="In-app (recommended)"
                sub="Show alerts in AgriCtec"
                checked
                alwaysOn
              />
              <Channel
                icon={MessageSquareText}
                title="SMS"
                sub={smsAvailable ? 'Send alerts to your phone' : 'Not set up yet'}
                checked={smsAvailable && shown.notifications.smsAlerts}
                disabled={!smsAvailable || locked}
                onChange={(on) => setAlert('smsAlerts', on)}
              />
            </div>
            {!smsAvailable && (
              <p className="text-text-mute mt-3 text-xs">
                SMS is not switched on for AgriCtec yet, so alerts come to the bell only.
              </p>
            )}
          </Panel>
        </div>

        <Panel className="h-full">
          <PanelHead
            id="alerts-title"
            icon={Bell}
            title="Notifications"
            sub="Choose what updates to receive."
          />
          <ul aria-labelledby="alerts-title" className="divide-border mt-3 divide-y">
            {ALERTS.map(({ key, icon: Icon, title, description }) => (
              <li key={key} className="flex items-start gap-3 py-4 last:pb-0">
                <span className="bg-icon-bg text-icon inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-text text-sm font-bold">{title}</p>
                  <p className="text-text-dim mt-0.5 text-sm leading-snug">{description}</p>
                </div>
                <Switch
                  checked={shown.notifications[key]}
                  label={title}
                  disabled={locked}
                  onChange={(on) => setAlert(key, on)}
                  className="shrink-0"
                />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {dirty && (
          <p role="status" className="text-text-dim mr-auto text-sm">
            You have unsaved changes.
          </p>
        )}
        <Button
          variant="ghost"
          icon={RotateCcw}
          disabled={locked}
          onClick={resetToDefaults}
          className="min-w-0"
        >
          Reset to defaults
        </Button>
        <Button
          icon={Check}
          loading={saving}
          disabled={readOnly || !dirty || status !== 'ready'}
          onClick={() => void save()}
          className="min-w-0"
        >
          Save changes
        </Button>
      </div>
    </section>
  );
}

function Banner() {
  return (
    <div className="rounded-card relative isolate overflow-hidden p-6 text-white sm:p-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover"
        style={{
          backgroundImage: "url('/images/weather/weather-banner.jpg')",
          backgroundPosition: '60% 60%',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(90deg, rgba(4,60,40,0.97) 0%, rgba(6,82,52,0.9) 45%, rgba(6,82,52,0.3) 75%, rgba(6,82,52,0.1) 100%)',
        }}
      />
      <div className="flex items-center gap-6">
        <span className="bg-icon-light-bg text-icon-light hidden size-24 shrink-0 items-center justify-center rounded-3xl @md/prefs:inline-flex">
          <SlidersHorizontal size={44} aria-hidden="true" />
        </span>
        <span aria-hidden="true" className="hidden h-20 w-px bg-white/40 @md/prefs:block" />
        <div className="min-w-0">
          <h2 id="settings-page-heading" className="text-display font-extrabold tracking-tight">
            Preferences
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/90">
            Customize your AgriCtec experience, choose your language, and manage the alerts you
            receive.
          </p>
        </div>
      </div>
    </div>
  );
}

function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-card border-border bg-glass border p-4 sm:p-6', className)}>
      {children}
    </div>
  );
}

function PanelHead({
  id,
  icon: Icon,
  title,
  sub,
  tone = 'bg-icon-bg text-icon',
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  sub: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span
        className={cn('inline-flex size-12 shrink-0 items-center justify-center rounded-xl', tone)}
      >
        <Icon size={24} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 id={id} className="text-text text-lg font-bold">
          {title}
        </h3>
        <p className="text-text-dim text-sm">{sub}</p>
      </div>
    </div>
  );
}

function ThemeOption({
  value,
  icon: Icon,
  title,
  sub,
  checked,
  disabled,
  onSelect,
}: {
  value: Theme;
  icon: LucideIcon;
  title: string;
  sub: string;
  checked: boolean;
  disabled: boolean;
  onSelect: (theme: Theme) => void;
}) {
  return (
    <label
      className={cn(
        'relative flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-colors',
        checked ? 'border-accent bg-accent/8 border-2' : 'border-border hover:bg-glass-strong',
        disabled && 'cursor-not-allowed opacity-70',
      )}
    >
      <input
        type="radio"
        name="theme"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="peer sr-only"
      />
      <Icon size={26} aria-hidden="true" className="text-text shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="text-text block text-base font-bold">{title}</span>
        <span className="text-text-dim block text-sm">{sub}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-3 right-3 inline-flex size-5 items-center justify-center rounded-full border-2',
          checked ? 'border-accent' : 'border-text-mute',
        )}
      >
        {checked && <span className="bg-accent size-2.5 rounded-full" />}
      </span>
      <span className="peer-focus-visible:ring-accent pointer-events-none absolute inset-0 rounded-2xl peer-focus-visible:ring-2" />
    </label>
  );
}

/** A small drawing of the app in the chosen theme (illustration only, no data). */
function ThemePreview({ theme }: { theme: Theme }) {
  const c =
    theme === 'light'
      ? { bg: '#f6f8fb', panel: '#ffffff', line: '#e3e8ef', bar: '#dfe5ec', soft: '#d9f3e4' }
      : { bg: '#0f1720', panel: '#1a2430', line: '#2a3644', bar: '#33404f', soft: '#1d4a35' };
  return (
    <div
      role="img"
      aria-label={`Preview of AgriCtec in ${theme} mode`}
      className="border-border mt-3 rounded-2xl border p-3"
      style={{ background: c.bg }}
    >
      <div className="grid grid-cols-[30%_1fr] gap-3">
        <div className="space-y-2 rounded-xl p-2.5" style={{ background: c.panel }}>
          <div className="flex items-center gap-1.5">
            <span className="size-3.5 rounded bg-[#19b56d]" />
            <span className="h-1.5 w-10 rounded-full" style={{ background: c.bar }} />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-md px-1 py-1"
              style={{ background: i === 2 ? c.soft : 'transparent' }}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: i === 2 ? '#19b56d' : c.bar }}
              />
              <span className="h-1.5 flex-1 rounded-full" style={{ background: c.bar }} />
            </div>
          ))}
        </div>
        <div className="space-y-2.5">
          <div className="flex h-8 items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b7a4b] to-[#19b56d] px-2.5">
            <span className="size-3.5 rounded bg-white/90" />
            <span className="h-1.5 w-16 rounded-full bg-white/80" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="h-14 rounded-lg p-2" style={{ background: c.panel }}>
              <span className="block h-1.5 w-2/3 rounded-full" style={{ background: c.bar }} />
            </div>
            <div className="space-y-2">
              <div className="h-6 rounded-lg" style={{ background: c.soft }} />
              <div className="h-6 rounded-lg" style={{ background: c.soft }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Channel({
  icon: Icon,
  title,
  sub,
  checked,
  disabled,
  alwaysOn,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  checked: boolean;
  disabled?: boolean;
  /** Ticked and cannot be turned off (the in-app inbox gets every alert). */
  alwaysOn?: boolean;
  onChange?: (on: boolean) => void;
}) {
  const fixed = disabled || alwaysOn;
  return (
    <label
      className={cn(
        'flex min-h-16 items-start gap-3 rounded-2xl border p-3.5',
        checked ? 'border-accent/50 bg-accent/6' : 'border-border',
        fixed ? 'cursor-default' : 'hover:bg-glass-strong cursor-pointer',
      )}
    >
      <Icon size={22} aria-hidden="true" className="text-text mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="text-text block text-sm font-bold">{title}</span>
        <span className="text-text-dim block text-xs leading-snug">{sub}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-disabled={alwaysOn || undefined}
        onChange={(event) => {
          if (!alwaysOn) onChange?.(event.target.checked);
        }}
        className="accent-accent mt-0.5 size-5 shrink-0 disabled:opacity-60"
      />
    </label>
  );
}
