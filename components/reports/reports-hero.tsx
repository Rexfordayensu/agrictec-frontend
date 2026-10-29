'use client';

import {
  CalendarClock,
  ClipboardList,
  FileCheck2,
  FileStack,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useReportDownload } from '@/components/reports/use-report-download';
import { Button } from '@/components/ui/button';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { formatDate, formatGHS } from '@/lib/format';
import { useFarmStore } from '@/store/farm-store';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';
import { useReportStore } from '@/store/report-store';
import Link from 'next/link';

/**
 * A stack of two "paper" pages showing the real headline numbers. It is decorative
 * (aria-hidden): the same figures appear in the KPI tiles below. Paper stays white in both
 * themes, like a printed report.
 */
function DocumentMockup() {
  const { credit, creditLabel, profit, borrowingPower, creditConfig } = useFarmStats();
  const name = useProfileStore((s) => s.profile?.name.trim()) || 'Your farm';
  const maxLoan = borrowingPower;
  const pdfEnabled = usePlatformStore((s) => s.flags.pdfReports);

  return (
    <div aria-hidden="true" className="relative mx-auto h-[300px] w-[250px] select-none">
      {/* Back page */}
      <div className="absolute inset-0 translate-x-5 -translate-y-2 rotate-6 rounded-xl bg-white/70 shadow-xl ring-1 ring-black/5" />
      {/* Front page */}
      <div className="absolute inset-0 -rotate-3 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition-transform duration-500 group-hover:rotate-0">
        <div className="bg-[#10b981] px-4 py-3 text-white">
          <p className="text-[13px] font-bold">AgriCtec</p>
          <p className="text-[8px] opacity-90">Digital Financial Identity Report</p>
          <p className="mt-1 text-right text-[10px] font-bold">Loan Readiness Report</p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <p className="text-[7px] font-semibold tracking-wider text-slate-400 uppercase">
              Farmer
            </p>
            <p className="truncate text-[11px] font-bold text-slate-800">{name}</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ['Credit score', `${credit.score} (${creditLabel})`],
              ['Net profit', formatGHS(profit)],
              ['Max. loan', formatGHS(maxLoan)],
              ['Status', credit.score >= creditConfig.bands.good ? 'Loan ready' : 'Building'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-50 px-2 py-1.5 ring-1 ring-slate-100">
                <p className="text-[7px] text-slate-400">{label}</p>
                <p className="truncate text-[9.5px] font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-md ring-1 ring-slate-100">
            <div className="h-3.5 bg-[#10b981]" />
            {[70, 55, 82, 48, 64].map((w, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-2 py-1.5 ${i % 2 ? 'bg-emerald-50' : ''}`}
              >
                <span className="h-1 rounded-full bg-slate-200" style={{ width: `${w}%` }} />
                <span className="ml-auto h-1 w-6 rounded-full bg-slate-300" />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <span className="block h-1 w-full rounded-full bg-slate-100" />
            <span className="block h-1 w-4/5 rounded-full bg-slate-100" />
          </div>
        </div>
      </div>
      {/* Verified seal (only while PDF downloads are switched on) */}
      {pdfEnabled && (
        <div className="absolute -right-3 bottom-6 inline-flex items-center gap-1.5 rounded-full bg-[#022c22] px-3 py-1.5 text-[11px] font-semibold text-[#34d399] shadow-lg ring-1 ring-[#34d399]/40">
          <ShieldCheck size={13} /> PDF ready
        </div>
      )}
    </div>
  );
}

export function ReportsHero() {
  const { credit, creditLabel, recordCount, momo } = useFarmStats();
  const latest = useFarmStore((s) => s.records[0]?.date);
  const openPreview = useReportStore((s) => s.openPreview);
  const { busy, download, enabled: pdfEnabled } = useReportDownload();

  const facts = [
    { icon: ShieldCheck, text: `Credit score ${credit.score} · ${creditLabel}` },
    { icon: ClipboardList, text: `${recordCount} records · ${momo.count} MoMo` },
    { icon: CalendarClock, text: latest ? `Latest entry ${formatDate(latest)}` : 'No entries yet' },
  ];

  return (
    <section
      aria-labelledby="reports-hero-title"
      className="group border-border bg-glass shadow-glass @container relative overflow-hidden rounded-3xl border p-6 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.18),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-32 size-[28rem] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.22),transparent_70%)]"
      />

      <div className="relative grid items-center gap-8 @3xl:grid-cols-[minmax(0,1fr)_290px]">
        <div>
          <span className="border-purple/30 bg-purple/10 text-ink-purple inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold">
            <Sparkles size={13} aria-hidden="true" /> AI Report Center
          </span>
          <h2
            id="reports-hero-title"
            className="font-display text-ink-green mt-4 text-3xl leading-tight font-bold @xl:text-4xl"
          >
            Your lender-ready financial file
          </h2>
          <p className="text-text-dim mt-3 max-w-xl text-sm @xl:text-base">
            Turn your farm records into professional PDF reports that banks and microfinance
            institutions can review in minutes.
          </p>

          <ul className="mt-5 flex flex-wrap gap-2">
            {facts.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="border-border bg-glass text-text-dim inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
              >
                <Icon size={13} aria-hidden="true" className="text-ink-green" /> {text}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 @md:flex-row">
            <Button icon={FileCheck2} onClick={() => openPreview('loan')}>
              Generate Loan Report
            </Button>
            {pdfEnabled && (
              <Button
                variant="ghost"
                icon={FileStack}
                loading={busy === 'all'}
                disabled={busy !== null && busy !== 'all'}
                onClick={() => download('all')}
              >
                {busy === 'all' ? 'Building your file…' : 'Download complete file'}
              </Button>
            )}
          </div>
          <p className="text-text-mute mt-4 flex items-center gap-1.5 text-xs">
            <Lock size={12} aria-hidden="true" /> Reports are created on your device. Nothing is
            uploaded.
          </p>
          {!pdfEnabled && (
            <p className="text-text-dim mt-3 text-sm">
              PDF downloads are included in Basic, Premium and Advanced.{' '}
              <Link href="/settings/plans" className="text-ink-green font-semibold underline">
                View plans
              </Link>
            </p>
          )}
        </div>

        <div className="hidden py-4 @3xl:block">
          <DocumentMockup />
        </div>
      </div>
    </section>
  );
}
