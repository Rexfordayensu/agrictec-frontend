'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowRight,
  Award,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronDown,
  ClipboardCheck,
  Coins,
  Download,
  FileText,
  Gauge,
  Info,
  Landmark,
  Layers,
  LockKeyhole,
  Plus,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { CashFlowChart } from '@/components/loans/cash-flow-chart';
import { LoanActionLink } from '@/components/loans/loan-ui';
import { ScoreFactors } from '@/components/loans/score-factors';
import { Button } from '@/components/ui/button';
import { useCredit, useLoanPath, type Credit } from '@/hooks/use-credit';
import { useFinancialSummary } from '@/hooks/use-financial-summary';
import { financialReportError, hasReportableFigures } from '@/lib/financial-report-state';
import { saveBlob } from '@/lib/loans/application-status';
import { SCORE_EXPLANATION, LOAN_REVIEW_EXPLANATION } from '@/lib/loans/score-policy';
import { formatTransactionMoney } from '@/lib/transactions';
import { financialService } from '@/services/financial.service';
import { useApplicationsStore } from '@/store/applications-store';
import { useLoanStore } from '@/store/loan-store';
import { useModalStore } from '@/store/modal-store';
import { usePlatformStore } from '@/store/platform-store';
import type { ReportMonths } from '@/types/financial';
import './loans-overview.css';

function IconCircle({ icon: Icon, className = '' }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={`loans-icon ${className}`}>
      <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
    </span>
  );
}

function PanelTitle({
  icon,
  title,
  subtitle,
  aside,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="loans-panel-heading">
      <IconCircle icon={icon} />
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}

export function LoansOverview() {
  const router = useRouter();
  const credit = useCredit();
  const path = useLoanPath(credit);
  const lenders = usePlatformStore((s) => s.lenders);
  const platformStatus = usePlatformStore((s) => s.status);
  const applications = useApplicationsStore((s) => s.list);
  const applicationsStatus = useApplicationsStore((s) => s.status);
  const earlier = useLoanStore((s) => s.applications);
  const setTab = useLoanStore((s) => s.setTab);
  const openModal = useModalStore((s) => s.openModal);
  if (!credit || !path) return null;
  const done = path.steps.filter((step) => step.done).length;
  const showScore = () => {
    const details = document.getElementById('loan-score-explanation') as HTMLDetailsElement | null;
    if (details) {
      details.open = true;
      details.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  return (
    <div className="loans-reference">
      <section className="loans-hero" aria-labelledby="loan-overview-title">
        <div className="loans-hero-copy">
          <h2 id="loan-overview-title">Your loan readiness overview</h2>
          <p>Build your financial records and complete the steps lenders review before applying.</p>
          <div className="loans-hero-progress">
            <div
              className="loans-progress-segments"
              aria-label={`${done} of ${path.steps.length} preparation steps completed`}
            >
              {path.steps.map((step) => (
                <span key={step.key} className={step.done ? 'complete' : ''} />
              ))}
            </div>
            <strong>
              {done} of {path.steps.length} steps completed
            </strong>
          </div>
        </div>
        <Button mutates icon={Plus} onClick={() => openModal('record')}>
          Add record
        </Button>
      </section>

      <div className="loans-summary-grid">
        <SummaryCard
          icon={Gauge}
          label="Financial health score"
          value={credit.score}
          className="loans-score-tile"
          onClick={showScore}
        >
          <span className={`loans-band ${credit.band.toLowerCase()}`}>{credit.band}</span>
          <p>AgriCtec internal score</p>
        </SummaryCard>
        <SummaryCard
          icon={FileText}
          label="Transaction records"
          value={credit.totalEntries}
          onClick={() => router.push('/records')}
        >
          <p>
            {credit.verifiedEntries} verified
            {credit.verifiedEntries < credit.totalEntries ? ' · evidence needed' : ''}
          </p>
        </SummaryCard>
        <SummaryCard
          icon={Landmark}
          label="Available lenders"
          value={platformStatus === 'ready' ? lenders.length : '—'}
          onClick={() => setTab('lenders')}
        >
          <p>{lenders.length ? 'View published loan products' : 'No published lenders yet'}</p>
        </SummaryCard>
        <SummaryCard
          icon={Layers}
          label="Applications"
          value={applicationsStatus === 'ready' ? applications.length + earlier.length : '—'}
          onClick={() => setTab('applications')}
        >
          <p>
            {applicationsStatus === 'error'
              ? 'Could not load · try again'
              : applicationsStatus !== 'ready'
                ? 'Loading applications…'
                : applications.length + earlier.length
                  ? 'View and track your applications'
                  : 'No applications yet'}
          </p>
        </SummaryCard>
      </div>

      <div className="loans-overview-columns">
        <div className="loans-left-column">
          <section className="loans-panel loans-checklist">
            <PanelTitle
              icon={ClipboardCheck}
              title="Loan readiness checklist"
              subtitle="Prepare your transaction history and supporting evidence."
              aside={
                <span className="loans-complete-count">
                  {done}/{path.steps.length} complete
                </span>
              }
            />
            <ol>
              {path.steps.map((step, i) => (
                <li
                  key={step.key}
                  className={i === path.current ? 'current' : step.done ? 'done' : ''}
                >
                  <span className="loans-step-number">
                    {step.done ? <Check size={16} /> : i + 1}
                  </span>
                  <div>
                    <h4>{step.title}</h4>
                    <p>{step.detail}</p>
                  </div>
                  {step.action ? (
                    <LoanActionLink action={step.action} />
                  ) : (
                    <span className="loans-locked">
                      <LockKeyhole size={13} />
                      {step.key === 'apply' && lenders.length === 0
                        ? 'To be available'
                        : 'Under review'}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <details id="loan-score-explanation" className="loans-panel loans-score-explanation">
            <summary>
              <IconCircle icon={Info} />
              <div>
                <h3>How your score is calculated</h3>
                <p>
                  {credit.score} · {credit.band} · based on records, consistency and verification.
                </p>
              </div>
              <ChevronDown size={18} />
            </summary>
            <div className="loans-score-content">
              <p>{SCORE_EXPLANATION}</p>
              <p>{LOAN_REVIEW_EXPLANATION}</p>
              <ScoreFactors steps={credit.steps} bestKey={credit.best?.key ?? null} />
            </div>
          </details>

          <section className="loans-panel loans-lenders-panel">
            <PanelTitle icon={Landmark} title="Verified lenders" />
            {lenders.length === 0 ? (
              <div className="loans-no-lenders">
                <BankIllustration />
                <h4>No verified lenders available yet</h4>
                <p>
                  Once the administrator publishes legitimate lenders, they will appear here for all
                  farmers.
                </p>
                <button className="loans-learn-button" onClick={showScore}>
                  <Info size={16} />
                  Learn how loan readiness works
                </button>
              </div>
            ) : (
              <div className="loans-listed-lenders">
                {lenders.slice(0, 3).map((lender) => (
                  <button key={lender.id} onClick={() => setTab('lenders')}>
                    <IconCircle icon={Landmark} />
                    <span>
                      <strong>{lender.name}</strong>
                      <small>View terms and available products</small>
                    </span>
                    <ArrowRight size={17} />
                  </button>
                ))}
                <button className="loans-learn-button" onClick={() => setTab('lenders')}>
                  Compare all lenders <ArrowRight size={15} />
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="loans-right-column">
          <TransactionHistory />
          <ImprovementActions credit={credit} />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  children,
  className = '',
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  children: ReactNode;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`loans-panel loans-summary-card ${className}`}
      onClick={onClick}
    >
      <IconCircle icon={icon} />
      <div>
        <h3>{label}</h3>
        <strong className="loans-summary-value">{value}</strong>
        {children}
      </div>
    </button>
  );
}

export function TransactionHistory() {
  const [months, setMonths] = useState<ReportMonths>(12);
  const [busy, setBusy] = useState(false);
  const figures = useFinancialSummary(months);
  const summary = figures.summary;
  async function download() {
    if (!summary || !hasReportableFigures(summary) || busy) return;
    setBusy(true);
    try {
      const report = await financialService.createReport(months);
      const file = await financialService.downloadReport(report);
      saveBlob(file.blob, file.filename);
    } catch (cause) {
      toast.error(financialReportError(cause, 'pdf'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="loans-panel loans-history-panel">
      <PanelTitle
        icon={ChartNoAxesColumnIncreasing}
        title="Transaction history"
        subtitle="Your recorded income, expenses, and net cash flow over time."
      />
      {summary ? (
        <>
          <div className="loans-history-metrics">
            <HistoryMetric
              icon={TrendingUp}
              label="Recorded income"
              value={formatTransactionMoney(summary.farm.income.total)}
            />
            <HistoryMetric
              icon={ArrowDown}
              label="Recorded expenses"
              value={formatTransactionMoney(summary.farm.expenses.total)}
              danger
            />
            <HistoryMetric
              icon={Coins}
              label="Net cash flow"
              value={formatTransactionMoney(summary.farm.net)}
            />
            <HistoryMetric
              icon={ShieldCheck}
              label="Verification coverage"
              value={`${summary.verifiedShare.byCount}%`}
              detail={`${summary.counts.verified} of ${summary.counts.total} verified`}
            />
          </div>
          <div className="loans-chart-heading">
            <h4>Monthly cash flow (GHS)</h4>
            <div className="loans-chart-legend">
              <span>
                <i />
                Income
              </span>
              <span>
                <i />
                Expenses
              </span>
              <span>
                <i />
                Net cash flow
              </span>
            </div>
          </div>
          <CashFlowChart summary={summary} />
          {summary.counts.total === 0 && (
            <p className="loans-history-empty">
              Your chart starts with your first financial record. No example transactions are shown.
            </p>
          )}
          <p className="loans-finance-note">
            MoMo and financing are recorded separately and are not added to farm income.
          </p>
        </>
      ) : figures.status === 'error' ? (
        <div className="loans-history-state" role="alert">
          <Info size={23} />
          <p>{figures.error}</p>
          <Button size="sm" variant="ghost" onClick={figures.retry}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="loans-history-state" role="status">
          <span className="loans-loading-pulse" />
          <p>Loading your recorded figures…</p>
        </div>
      )}
      <div className="loans-export-row">
        <label htmlFor="loan-history-period">Export statement</label>
        <div className="loans-period-select">
          <select
            id="loan-history-period"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value) as ReportMonths)}
          >
            {([3, 6, 12] as const).map((m) => (
              <option value={m} key={m}>
                Last {m} months
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </div>
        <Button
          mutates
          icon={Download}
          loading={busy}
          disabled={!summary || !hasReportableFigures(summary)}
          onClick={() => void download()}
        >
          Download PDF statement
        </Button>
      </div>
      <p className="loans-export-note">
        <Info size={15} />
        PDF includes transaction history, income, expenses, and verification status.
      </p>
    </section>
  );
}

function HistoryMetric({
  icon,
  label,
  value,
  detail,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  danger?: boolean;
}) {
  return (
    <div>
      <div className="loans-history-label">
        <IconCircle icon={icon} className={danger ? 'danger' : ''} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function ImprovementActions({ credit }: { credit: Credit }) {
  const steps = [...credit.steps]
    .sort((a, b) => b.available - a.available)
    .filter((step) => step.available > 0)
    .slice(0, 2);
  return (
    <section className="loans-panel loans-improve-panel">
      <PanelTitle
        icon={Award}
        title="Improve your financial health"
        subtitle="Strengthen your records and improve your consistency."
      />
      <div className="loans-improvement-list">
        {steps.length ? (
          steps.map((step) => (
            <Link href={step.href} key={step.key}>
              <IconCircle
                icon={step.key === 'paymentHistory' ? CalendarDays : ChartNoAxesColumnIncreasing}
              />
              <span>
                <strong>{step.label}</strong>
                <small>{step.help}</small>
              </span>
              <span
                className="loans-points"
                title="Potential improvement in your informational AgriCtec score"
              >
                +{step.available} pts
              </span>
              <span className="loans-improve-action">
                {step.action}
                <ArrowRight size={15} />
              </span>
            </Link>
          ))
        ) : (
          <p className="loans-all-complete">
            <Check size={20} />
            Your records meet all current score targets. Keep recording consistently.
          </p>
        )}
      </div>
    </section>
  );
}

function BankIllustration() {
  return (
    <svg
      className="loans-bank-illustration"
      viewBox="0 0 310 112"
      role="img"
      aria-label="An illustrated bank surrounded by green hills"
    >
      <defs>
        <linearGradient id="bank-roof" x2="0" y2="1">
          <stop stopColor="#65d5ac" />
          <stop offset="1" stopColor="#008e64" />
        </linearGradient>
        <linearGradient id="bank-column" x2="1" y2="0">
          <stop stopColor="#50cba0" />
          <stop offset="0.5" stopColor="#d8fff0" />
          <stop offset="1" stopColor="#078b65" />
        </linearGradient>
      </defs>
      <path d="M12 103Q56 46 103 100Q147 72 183 98Q239 26 297 103" fill="#d6f3e8" />
      <path d="M0 105Q91 86 155 104Q241 66 310 105" fill="#b8e8d6" />
      <path d="M60 42q9-13 18-2q12-20 22 3H60M222 21q8-14 19-6q14-23 30 6h-49" fill="#d8f5ec" />
      <path d="M111 51l44-27 47 27z" fill="#b4f0d8" />
      <path d="M116 51l39-23 41 23z" fill="url(#bank-roof)" />
      <circle cx="156" cy="43" r="4" fill="#effff7" />
      <path d="M119 56h77v6h-77zM119 97h77v5h-77zM109 104h97v5h-97z" fill="#179c73" />
      {[123, 145, 177].map((x) => (
        <g key={x}>
          <path d={`M${x} 62h12v34h-12z`} fill="url(#bank-column)" />
          <path d={`M${x - 2} 60h16v4h-16zM${x - 2} 94h16v4h-16z`} fill="#4dbb96" />
        </g>
      ))}
    </svg>
  );
}
