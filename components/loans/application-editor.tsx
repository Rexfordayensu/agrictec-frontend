'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CircleAlert,
  Download,
  FileUp,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { LogoLoader } from '@/components/ui/logo-loader';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatGhanaDate } from '@/lib/format';
import { APPLICATION_STATUS, saveBlob } from '@/lib/loans/application-status';
import { useReadOnly } from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { applicationsService } from '@/services/applications.service';
import type {
  ApplicationRequirement,
  ConsentNotice,
  LoanApplicationDetail,
} from '@/types/applications';

const panel = 'border-border bg-glass rounded-2xl border p-5 space-y-4';
const money = (value: string) =>
  `GHS ${Number(value).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * One loan application. While it is a draft (or AgriCtec asked for changes) the farmer fills
 * in the lender's requirements, uploads documents, writes the letter and submits with consent;
 * afterwards it is read-only, with its timeline and the application pack to download.
 */
export function ApplicationEditor({ id }: { id: string }) {
  const readOnly = useReadOnly();
  const [app, setApp] = useState<LoanApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<ConsentNotice | null>(null);

  const load = useCallback(async () => {
    try {
      setApp(await applicationsService.get(id));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the application.');
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
      applicationsService.notice().then(setNotice, () => setNotice(null));
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (error) {
    return (
      <div role="alert" className={panel}>
        <p className="text-ink-red text-sm">{error}</p>
        <Link href="/loans?tab=applications" className="text-ink-green text-sm font-semibold">
          Back to your applications
        </Link>
      </div>
    );
  }
  if (!app) return <LogoLoader center size="lg" label="Loading your application" />;

  const style = APPLICATION_STATUS[app.status];
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/loans?tab=applications"
        className="text-text-dim hover:text-text inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Your applications
      </Link>
      <header className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-text-mute text-xs">{app.reference}</p>
            <h2 className="text-text text-xl font-semibold">{app.product.name}</h2>
            <p className="text-text-dim text-sm">
              {app.lender.name} · {money(app.amount)} over {app.months} months
            </p>
          </div>
          <Badge color={style.color}>{app.statusLabel}</Badge>
        </div>
        <p className="text-text-dim text-sm">{style.farmerHint}</p>
        {app.reviewNote && app.status === 'changes_requested' && (
          <p className="border-gold/40 bg-gold/10 text-text rounded-xl border px-3 py-2 text-sm">
            <span className="font-semibold">AgriCtec asked: </span>
            {app.reviewNote}
          </p>
        )}
      </header>

      {app.canEdit && !readOnly ? (
        <DraftForm app={app} notice={notice} onChange={setApp} />
      ) : (
        <Submitted app={app} onChange={setApp} readOnly={readOnly} />
      )}

      <Timeline app={app} />
    </div>
  );
}

// ---------- Draft ----------

function DraftForm({
  app,
  notice,
  onChange,
}: {
  app: LoanApplicationDetail;
  notice: ConsentNotice | null;
  onChange: (app: LoanApplicationDetail) => void;
}) {
  const [amount, setAmount] = useState(app.amount);
  const [months, setMonths] = useState(String(app.months));
  const [purpose, setPurpose] = useState(app.purpose);
  const [letter, setLetter] = useState(app.letter ?? '');
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(app.requirements.filter((r) => r.answer).map((r) => [r.key, r.answer as string])),
  );
  const [saving, setSaving] = useState(false);
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dirty =
    amount !== app.amount ||
    months !== String(app.months) ||
    purpose !== app.purpose ||
    letter !== (app.letter ?? '') ||
    app.requirements.some((r) => (answers[r.key] ?? '') !== (r.answer ?? ''));

  async function save(): Promise<LoanApplicationDetail | null> {
    setSaving(true);
    try {
      const changed: Record<string, string | null> = {};
      for (const r of app.requirements) {
        if (r.fieldType === 'none' || r.fieldType === 'document') continue;
        if ((answers[r.key] ?? '') !== (r.answer ?? '')) changed[r.key] = answers[r.key] || null;
      }
      const next = await applicationsService.update(app.id, {
        amount,
        months: Number(months),
        purpose,
        letter,
        ...(Object.keys(changed).length > 0 && { answers: changed }),
      });
      onChange(next);
      toast.success('Saved');
      return next;
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!notice) return;
    setSubmitting(true);
    try {
      if (dirty && !(await save())) return;
      onChange(await applicationsService.submit(app.id, notice.version));
      toast.success('Application submitted for AgriCtec’s review');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not submit.');
      onChange(await applicationsService.get(app.id));
    } finally {
      setSubmitting(false);
    }
  }

  const visible = app.requirements.filter((r) => r.visible || answers[r.key]);
  const asked = visible.filter((r) => r.fieldType !== 'none');
  const checked = app.requirements.filter((r) => r.checkedByAgriCtec);

  return (
    <>
      <section className={panel} aria-labelledby="request-title">
        <h3 id="request-title" className="text-text font-semibold">
          Your request
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Amount (GHS)" htmlFor="app-amount">
            <Input id="app-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormField>
          <FormField label="Repay over (months)" htmlFor="app-months">
            <Input id="app-months" inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
          </FormField>
          <FormField label="Purpose" htmlFor="app-purpose">
            <Input id="app-purpose" value={purpose} maxLength={300} onChange={(e) => setPurpose(e.target.value)} />
          </FormField>
        </div>
      </section>

      <section className={panel} aria-labelledby="asks-title">
        <h3 id="asks-title" className="text-text font-semibold">
          What {app.lender.name} asks for
        </h3>
        {asked.length === 0 && (
          <p className="text-text-dim text-sm">The lender asks nothing else for you to provide.</p>
        )}
        {asked.map((req) =>
          req.fieldType === 'document' ? (
            <DocumentField key={req.key} app={app} req={req} onChange={onChange} />
          ) : (
            <AnswerField
              key={req.key}
              req={req}
              value={answers[req.key] ?? ''}
              onValue={(value) => setAnswers((current) => ({ ...current, [req.key]: value }))}
            />
          ),
        )}
        {checked.length > 0 && (
          <p className="text-text-mute text-xs">
            AgriCtec checks from your records: {checked.map((r) => r.name).join(', ')}. Your
            eligibility check and transaction statement are attached when you submit.
          </p>
        )}
      </section>

      <section className={panel} aria-labelledby="letter-title">
        <h3 id="letter-title" className="text-text font-semibold">
          Your application letter
        </h3>
        <p className="text-text-dim text-xs">
          Tell the lender about your farm, what the loan is for and how you plan to repay it.
        </p>
        <Textarea
          id="app-letter"
          rows={7}
          maxLength={4000}
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          aria-label="Application letter"
        />
        <p className="text-text-mute text-right text-[11px]">{letter.length} / 4,000</p>
        <Button variant="ghost" icon={Save} loading={saving} disabled={!dirty} onClick={() => void save()}>
          Save changes
        </Button>
      </section>

      <section className={panel} aria-labelledby="submit-title">
        <h3 id="submit-title" className="text-text font-semibold">
          Review and submit
        </h3>
        {app.missing.length > 0 && (
          <ul className="space-y-1">
            {app.missing.map((item) => (
              <li key={item} className="text-ink-gold flex gap-2 text-sm">
                <CircleAlert size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}
        {notice && (
          <div className="border-border rounded-xl border p-3 text-sm">
            <p className="text-text font-semibold">What will be shared with {app.lender.name}</p>
            <ul className="text-text-dim mt-2 list-disc space-y-1 pl-5">
              {notice.dataItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-text-mute mt-2 text-xs">
              AgriCtec checks your application first and shares it only with this lender, for
              this application. You can withdraw it at any time before the lender decides.
            </p>
          </div>
        )}
        <label className="text-text-dim flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-1 size-4 shrink-0"
          />
          <span>
            I agree that AgriCtec shares the information above with {app.lender.name} for this
            application.
          </span>
        </label>
        <Button
          icon={Send}
          mutates
          loading={submitting}
          disabled={!consented || !notice || (app.missing.length > 0 && !dirty)}
          onClick={() => void submit()}
        >
          Submit for AgriCtec’s review
        </Button>
      </section>
    </>
  );
}

function AnswerField({
  req,
  value,
  onValue,
}: {
  req: ApplicationRequirement;
  value: string;
  onValue: (value: string) => void;
}) {
  const id = `req-${req.key}`;
  const label = `${req.name}${req.required ? '' : ' (optional)'}`;
  return (
    <FormField label={label} htmlFor={id} hint={req.description ?? undefined}>
      {req.fieldType === 'yes_no' ? (
        <Select id={id} value={value} onChange={(e) => onValue(e.target.value)}>
          <option value="">Choose…</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </Select>
      ) : req.fieldType === 'select' ? (
        <Select id={id} value={value} onChange={(e) => onValue(e.target.value)}>
          <option value="">Choose…</option>
          {req.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      ) : req.fieldType === 'text' ? (
        <Textarea id={id} rows={2} maxLength={1000} value={value} onChange={(e) => onValue(e.target.value)} />
      ) : (
        <Input
          id={id}
          type={req.fieldType === 'date' ? 'date' : 'text'}
          inputMode={req.fieldType === 'date' ? undefined : 'decimal'}
          value={value}
          onChange={(e) => onValue(e.target.value)}
        />
      )}
    </FormField>
  );
}

function DocumentField({
  app,
  req,
  onChange,
}: {
  app: LoanApplicationDetail;
  req: ApplicationRequirement;
  onChange: (app: LoanApplicationDetail) => void;
}) {
  const [busy, setBusy] = useState(false);
  const formats = req.allowedFormats.map((f) => f.toUpperCase()).join(', ') || 'PDF or image';

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await applicationsService.upload(app.id, req.key, file));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not upload.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-border space-y-2 rounded-xl border p-3">
      <p className="text-text text-sm font-semibold">
        {req.name}
        {req.required ? '' : ' (optional)'}
      </p>
      {req.description && <p className="text-text-dim text-xs">{req.description}</p>}
      <ul className="space-y-1">
        {req.documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-text-dim truncate">{doc.filename}</span>
            <button
              type="button"
              aria-label={`Remove ${doc.filename}`}
              onClick={async () => onChange(await applicationsService.removeDocument(app.id, doc.id))}
              className="text-text-mute hover:text-ink-red inline-flex size-8 items-center justify-center rounded-lg"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <label
        className={cn(
          'text-ink-green inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold',
          busy && 'pointer-events-none opacity-60',
        )}
      >
        <FileUp size={15} aria-hidden="true" />
        {busy ? 'Uploading…' : 'Upload a file'}
        <input
          type="file"
          className="sr-only"
          accept={req.allowedFormats.map((f) => (f === 'jpg' ? 'image/jpeg' : f === 'pdf' ? 'application/pdf' : `image/${f}`)).join(',')}
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </label>
      <p className="text-text-mute text-[11px]">
        {formats}, up to {req.maxSizeMb ?? 5} MB.
      </p>
    </div>
  );
}

// ---------- Submitted ----------

function Submitted({
  app,
  onChange,
  readOnly,
}: {
  app: LoanApplicationDetail;
  onChange: (app: LoanApplicationDetail) => void;
  readOnly: boolean;
}) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function withdraw() {
    setBusy(true);
    try {
      onChange(await applicationsService.withdraw(app.id));
      toast.success('Application withdrawn');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not withdraw.');
    } finally {
      setBusy(false);
      setWithdrawing(false);
    }
  }

  return (
    <section className={panel} aria-labelledby="sent-title">
      <h3 id="sent-title" className="text-text font-semibold">
        What you submitted
      </h3>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <Fact label="Purpose">{app.purpose}</Fact>
        <Fact label="Submitted">{app.submittedAt ? formatGhanaDate(app.submittedAt) : '—'}</Fact>
        {app.assessment && (
          <Fact label="AgriCtec’s preliminary check">{app.assessment.outcomeLabel}</Fact>
        )}
        {app.consent && (
          <Fact label="Consent to share">
            Given {formatGhanaDate(app.consent.givenAt)}
            {app.consent.withdrawnAt ? `, withdrawn ${formatGhanaDate(app.consent.withdrawnAt)}` : ''}
          </Fact>
        )}
      </dl>
      {app.letter && (
        <p className="text-text-dim border-border rounded-xl border p-3 text-sm whitespace-pre-line">
          {app.letter}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          icon={Download}
          onClick={async () => saveBlob(await applicationsService.pack(app.id), `${app.reference}-application.pdf`)}
        >
          Download the application pack
        </Button>
        {app.canWithdraw && !readOnly && (
          <Button variant="ghost" icon={Undo2} onClick={() => setWithdrawing(true)}>
            Withdraw
          </Button>
        )}
      </div>
      <p className="text-text-mute flex items-center gap-1.5 text-xs">
        <ShieldCheck size={13} aria-hidden="true" /> AgriCtec never approves loans: only the lender
        decides, and a lender’s update is shown only with its confirmation.
      </p>
      <ConfirmDialog
        open={withdrawing}
        title="Withdraw this application?"
        message="It won’t be sent, or AgriCtec will tell the lender you withdrew it. You can start a new application later."
        confirmLabel="Withdraw"
        danger
        loading={busy}
        onCancel={() => setWithdrawing(false)}
        onConfirm={() => void withdraw()}
      />
    </section>
  );
}

function Timeline({ app }: { app: LoanApplicationDetail }) {
  return (
    <section className={panel} aria-labelledby="timeline-title">
      <h3 id="timeline-title" className="text-text font-semibold">
        Timeline
      </h3>
      <ol className="space-y-3">
        {[...app.timeline].reverse().map((event) => (
          <li key={event.eventId} className="border-border border-l-2 pl-3">
            <p className={cn('text-sm font-semibold', event.lenderConfirmed ? 'text-ink-green' : 'text-text')}>
              {event.label}
            </p>
            <p className="text-text-mute text-xs">
              {formatGhanaDate(event.at)} · {event.by}
            </p>
            {event.note && <p className="text-text-dim mt-1 text-sm">{event.note}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-text-mute text-xs">{label}</dt>
      <dd className="text-text">{children}</dd>
    </div>
  );
}
