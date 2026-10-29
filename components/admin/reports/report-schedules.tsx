'use client';

import { useEffect, useId, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, CalendarClock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { REPORT_CATALOG, type ReportId } from '@/lib/admin/admin-reports';
import { cn } from '@/lib/utils';
import {
  reportSchedulesService,
  type ReportSchedule,
  type ScheduleFrequency,
  type ScheduleList,
} from '@/services/admin/report-schedules.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';

const FREQUENCIES: Record<ScheduleFrequency, string> = {
  weekly: 'Weekly · Mondays, 07:00',
  monthly: 'Monthly · the 1st, 07:00',
};

const splitEmails = (text: string) =>
  text
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);

/**
 * Scheduled email reports: a report's CSV sent to a list of addresses every week or month
 * (07:00 Ghana time). The API sends them, so the console can be closed.
 */
export function ReportSchedules() {
  const formId = useId();
  const [list, setList] = useState<ScheduleList | null>(null);
  const [failed, setFailed] = useState(false);
  const [reportId, setReportId] = useState<ReportId>('platform');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('weekly');
  const [recipients, setRecipients] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const syncVersion = useAdminDataStore((s) => s.syncVersion);

  useEffect(() => {
    let active = true;
    reportSchedulesService.list().then(
      (next) => {
        if (!active) return;
        setList(next);
        setFailed(false);
      },
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [syncVersion]);

  const replace = (schedule: ReportSchedule) =>
    setList(
      (current) =>
        current && {
          ...current,
          schedules: current.schedules.map((s) => (s.id === schedule.id ? schedule : s)),
        },
    );

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const emails = splitEmails(recipients);
    if (!emails.length) {
      toast.error('Add at least one email address.');
      return;
    }
    setAdding(true);
    try {
      const created = await reportSchedulesService.create(reportId, frequency, emails);
      setList((current) => current && { ...current, schedules: [...current.schedules, created] });
      setRecipients('');
      toast.success(`${created.reportTitle} scheduled`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the schedule');
    } finally {
      setAdding(false);
    }
  }

  async function toggle(schedule: ReportSchedule) {
    setBusyId(schedule.id);
    try {
      replace(await reportSchedulesService.update(schedule.id, { active: !schedule.active }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not change the schedule');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(schedule: ReportSchedule) {
    setBusyId(schedule.id);
    try {
      await reportSchedulesService.remove(schedule.id);
      setList(
        (current) =>
          current && {
            ...current,
            schedules: current.schedules.filter((s) => s.id !== schedule.id),
          },
      );
      toast.success('Schedule removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove the schedule');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      aria-labelledby={`${formId}-title`}
      className="border-border bg-glass rounded-2xl border p-5"
    >
      <div className="flex items-start gap-4">
        <span className="bg-info/12 text-ink-blue inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
          <CalendarClock size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id={`${formId}-title`} className="text-text text-sm font-semibold">
            Scheduled email reports
          </h2>
          <p className="text-text-dim mt-0.5 text-sm">
            Email a report&apos;s CSV every week or month, at 07:00 Ghana time. The server sends
            them, so the console doesn&apos;t need to be open.
          </p>
        </div>
      </div>

      {list && !list.emailEnabled && (
        <p className="bg-gold/10 text-ink-gold mt-4 flex gap-2 rounded-xl p-3 text-xs leading-relaxed">
          <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          Email isn&apos;t set up on the server yet (the SMTP settings), so nothing can be sent.
          Schedules you add now start sending once it is.
        </p>
      )}

      <form
        onSubmit={(e) => void add(e)}
        className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_2fr_auto]"
      >
        <label className="block">
          <span className="text-text-mute mb-1 block text-xs font-medium">Report</span>
          <Select value={reportId} onChange={(e) => setReportId(e.target.value as ReportId)}>
            {REPORT_CATALOG.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="text-text-mute mb-1 block text-xs font-medium">How often</span>
          <Select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
          >
            {Object.entries(FREQUENCIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="text-text-mute mb-1 block text-xs font-medium">
            Send to (up to 10, separated by commas)
          </span>
          <Input
            type="text"
            inputMode="email"
            autoComplete="off"
            placeholder="ops@example.com, cfo@example.com"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
          />
        </label>
        <div className="flex items-end">
          <Button
            type="submit"
            icon={Plus}
            loading={adding}
            className={cn(PRIMARY_CLASS, 'w-full')}
          >
            Schedule
          </Button>
        </div>
      </form>

      {failed && (
        <p role="alert" className="text-ink-red mt-4 text-sm">
          The schedules couldn&apos;t be loaded. Refresh the page to try again.
        </p>
      )}

      {list && list.schedules.length > 0 && (
        <ul className="divide-border border-border mt-5 divide-y rounded-xl border">
          {list.schedules.map((s) => {
            const failedSend = s.lastStatus?.startsWith('failed');
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-text text-sm font-semibold">
                    {s.reportTitle}{' '}
                    <span className="text-text-mute font-normal">· {FREQUENCIES[s.frequency]}</span>
                  </p>
                  <p className="text-text-dim truncate text-xs">{s.recipients.join(', ')}</p>
                  <p className="text-text-mute mt-0.5 text-[11px]">
                    {s.active
                      ? `Next: ${format(new Date(s.nextRunAt), 'EEE d MMM yyyy, HH:mm')}`
                      : 'Paused'}
                    {s.lastSentAt && (
                      <span className={cn(failedSend && 'text-ink-red')}>
                        {' '}
                        · Last: {format(new Date(s.lastSentAt), 'd MMM')} ({s.lastStatus})
                      </span>
                    )}
                  </p>
                </div>
                <Switch
                  checked={s.active}
                  disabled={busyId === s.id}
                  onChange={() => void toggle(s)}
                  label={`${s.active ? 'Pause' : 'Resume'} the ${s.reportTitle} schedule`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  disabled={busyId === s.id}
                  onClick={() => void remove(s)}
                  aria-label={`Remove the ${s.reportTitle} schedule`}
                >
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
