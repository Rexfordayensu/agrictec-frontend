'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Ban,
  Check,
  CircleCheck,
  EyeOff,
  ImageUp,
  Pencil,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  APPROVE_CLASS,
  PRIMARY_CLASS,
  REJECT_CLASS,
} from '@/components/admin/shared/action-styles';
import { DetailList, DetailRow } from '@/components/admin/shared/detail-row';
import { LenderFormModal } from '@/components/admin/lenders/lender-form-modal';
import { LenderProducts } from '@/components/admin/lenders/lender-products';
import {
  LicenceBadge,
  licenceLine,
  PublicationBadge,
} from '@/components/admin/lenders/lender-status';
import { useLender, useLenders } from '@/components/admin/lenders/use-lenders';
import { LenderLogo } from '@/components/shared/lender-logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatGhanaDate } from '@/lib/format';
import {
  INSTITUTION_TYPE_LABELS,
  LICENCE_LABELS,
  NOT_PROVIDED,
  PARTNERSHIP_LABELS,
  safeWebsite,
  yesNo,
} from '@/lib/lenders';
import { cn } from '@/lib/utils';
import { lendersService } from '@/services/admin/lenders.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { AdminLender, LicenceStatus } from '@/types/admin';

type Dialog = 'edit' | 'verify' | 'listing' | 'suspend' | 'unpublish' | 'delete' | null;

const today = () => new Date().toISOString().slice(0, 10);
const shown = (value: ReactNode) => value || <span className="text-text-mute">{NOT_PROVIDED}</span>;

export function LenderDetail({ id }: { id: string }) {
  const router = useRouter();
  const { lender, error, loaded, reload, replace } = useLender(id);
  const { lenders } = useLenders();
  const refreshConsole = useAdminDataStore((s) => s.refresh);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);

  if (!loaded) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!lender)
    return (
      <div className="space-y-4">
        <BackLink />
        <p role="alert" className="text-ink-red text-sm">
          {error ?? 'Lender not found.'}
        </p>
      </div>
    );
  const current = lender;

  /** Runs one step, shows the server's answer, and says what happened. */
  async function step(run: () => Promise<AdminLender | void>, success: string) {
    setBusy(true);
    try {
      const saved = await run();
      if (saved) replace(saved);
      toast.success(success);
      setDialog(null);
      void refreshConsole();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'That did not work');
      reload();
    } finally {
      setBusy(false);
    }
  }

  const suspended = current.publicationStatus === 'suspended';
  const published = current.publicationStatus === 'published';
  const canPublish =
    !suspended &&
    !published &&
    current.licenceStatus === 'verified' &&
    current.listingAuthorised &&
    !current.blockers.some((b) => b.includes('days old'));

  return (
    <div className="space-y-5">
      <BackLink />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <LenderLogo
            name={current.name}
            color={current.color}
            logoPath={current.logoPath}
            size={56}
          />
          <div className="min-w-0">
            <h1 className="text-text text-display font-bold wrap-break-word">{current.name}</h1>
            <p className="text-text-mute text-sm">
              {INSTITUTION_TYPE_LABELS[current.institutionType]}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <PublicationBadge status={current.publicationStatus} />
              <LicenceBadge lender={current} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" icon={Pencil} onClick={() => setDialog('edit')}>
            Edit details
          </Button>
          {published && (
            <Button variant="ghost" icon={EyeOff} onClick={() => setDialog('unpublish')}>
              Unpublish
            </Button>
          )}
          {suspended ? (
            <Button
              variant="ghost"
              icon={RotateCcw}
              loading={busy}
              onClick={() =>
                step(
                  () => lendersService.reinstate(current.id),
                  `${current.name} reinstated (unpublished)`,
                )
              }
            >
              Lift suspension
            </Button>
          ) : (
            <Button icon={Ban} onClick={() => setDialog('suspend')} className={REJECT_CLASS}>
              Suspend
            </Button>
          )}
        </div>
      </header>

      <VisibilityBanner lender={current} />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="space-y-1">
          <h2 className="text-text mb-3 text-base font-semibold">Path to the marketplace</h2>
          <Step
            n={1}
            done
            title="Official details entered"
            detail="Name, type, regulator, licence reference and official contacts."
          />
          <Step
            n={2}
            done={current.licenceStatus === 'verified' && !current.reviewDue}
            warn={current.reviewDue || ['expired', 'revoked'].includes(current.licenceStatus)}
            title="Licence checked against an official source"
            detail={
              current.licenceStatus === 'unverified'
                ? 'Not checked yet.'
                : `${LICENCE_LABELS[current.licenceStatus]} · ${licenceLine(current)}`
            }
            action={
              <Button
                size="sm"
                variant="ghost"
                icon={ShieldCheck}
                onClick={() => setDialog('verify')}
              >
                {current.licenceStatus === 'unverified' ? 'Record check' : 'Record a new check'}
              </Button>
            }
          />
          <Step
            n={3}
            done={current.listingAuthorised}
            title="Public listing authorised"
            detail={
              current.listingAuthorised
                ? (current.listingNote ?? 'Authorised.')
                : 'Record how the institution (or its public terms) allows listing on AgriCtec.'
            }
            action={
              <Button size="sm" variant="ghost" icon={Check} onClick={() => setDialog('listing')}>
                {current.listingAuthorised ? 'Change' : 'Record authorisation'}
              </Button>
            }
          />
          <Step
            n={4}
            done={published}
            title="Published to farmers"
            detail={
              published && current.publishedAt
                ? `Since ${formatGhanaDate(current.publishedAt)}`
                : suspended
                  ? `Suspended: ${current.suspensionReason ?? ''}`
                  : 'Every farmer sees the same catalogue once published.'
            }
            action={
              !published &&
              !suspended && (
                <Button
                  size="sm"
                  icon={Send}
                  disabled={!canPublish}
                  loading={busy}
                  className={APPROVE_CLASS}
                  onClick={() =>
                    step(() => lendersService.publish(current.id), `${current.name} published`)
                  }
                >
                  Publish
                </Button>
              )
            }
          />
        </Card>

        <LogoCard lender={current} onSaved={replace} />
      </div>

      <LenderProducts lenderId={current.id} lenderListed={current.listed} />

      <Card>
        <h2 className="text-text mb-2 text-base font-semibold">Institution details</h2>
        <DetailList>
          <DetailRow label="Registered name">{shown(current.registeredName)}</DetailRow>
          <DetailRow label="Description">{shown(current.description)}</DetailRow>
          <DetailRow label="Regulator">{shown(current.regulator)}</DetailRow>
          <DetailRow label="Licence reference" mono>
            {shown(current.licenceRef)}
          </DetailRow>
          <DetailRow label="Check source">{shown(current.verificationSource)}</DetailRow>
          <DetailRow label="Checked by">
            {current.verifiedBy
              ? `${current.verifiedBy}${current.verificationNote ? ` · ${current.verificationNote}` : ''}`
              : shown(null)}
          </DetailRow>
          <DetailRow label="Website">
            {safeWebsite(current.website) ? (
              <a
                href={current.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-purple hover:underline"
              >
                {current.website}
              </a>
            ) : (
              shown(null)
            )}
          </DetailRow>
          <DetailRow label="Email">{shown(current.email)}</DetailRow>
          <DetailRow label="Telephone">{shown(current.phone)}</DetailRow>
          <DetailRow label="Address">{shown(current.address)}</DetailRow>
          <DetailRow label="Head office region">{shown(current.region)}</DetailRow>
          <DetailRow label="Agricultural loans">{yesNo(current.offersAgriLoans)}</DetailRow>
          <DetailRow label="Regions served">{shown(current.supportedRegions.join(', '))}</DetailRow>
          <DetailRow label="Partnership">{PARTNERSHIP_LABELS[current.partnershipStatus]}</DetailRow>
          <DetailRow label="Applications">{current.applications}</DetailRow>
          <DetailRow label="Added">
            {`${formatGhanaDate(current.createdAt)}${current.createdBy ? ` by ${current.createdBy}` : ''}`}
          </DetailRow>
          {current.updatedAt && (
            <DetailRow label="Last changed">
              {`${formatGhanaDate(current.updatedAt)}${current.updatedBy ? ` by ${current.updatedBy}` : ''}`}
            </DetailRow>
          )}
        </DetailList>
        {current.applications === 0 && (
          <div className="border-border mt-4 border-t pt-4">
            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDialog('delete')}>
              Delete lender
            </Button>
          </div>
        )}
      </Card>

      <LenderFormModal
        open={dialog === 'edit'}
        lender={current}
        lenders={lenders}
        onClose={() => setDialog(null)}
        onSaved={(saved) => {
          replace(saved);
          setDialog(null);
          void refreshConsole();
        }}
      />
      {dialog === 'verify' && (
        <VerifyDialog
          lender={current}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(check) =>
            step(() => lendersService.verify(current.id, check), 'Licence check recorded')
          }
        />
      )}
      {dialog === 'listing' && (
        <ListingDialog
          lender={current}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(authorised, note) =>
            step(
              () => lendersService.setListing(current.id, authorised, note),
              authorised ? 'Listing authorisation recorded' : 'Listing authorisation withdrawn',
            )
          }
        />
      )}
      {dialog === 'suspend' && (
        <SuspendDialog
          lender={current}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(reason) =>
            step(
              () => lendersService.suspend(current.id, reason),
              `${current.name} suspended and hidden from farmers`,
            )
          }
        />
      )}
      <ConfirmDialog
        open={dialog === 'unpublish'}
        title={`Unpublish ${current.name}?`}
        message="Farmers stop seeing this lender straight away. You can publish it again later."
        confirmLabel="Unpublish"
        loading={busy}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          step(() => lendersService.unpublish(current.id), `${current.name} unpublished`)
        }
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        title={`Delete ${current.name}?`}
        message="This lender has no applications, so it can be removed for good."
        confirmLabel="Delete lender"
        danger
        loading={busy}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          step(async () => {
            await lendersService.remove(current.id);
            router.push('/admin/lenders');
          }, `${current.name} deleted`)
        }
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/lenders"
      className="text-text-dim hover:text-text inline-flex min-h-9 items-center gap-1.5 text-sm"
    >
      <ArrowLeft size={15} aria-hidden="true" /> Lenders
    </Link>
  );
}

function VisibilityBanner({ lender }: { lender: AdminLender }) {
  if (lender.listed)
    return (
      <p className="border-accent/40 bg-accent/10 text-ink-green flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold">
        <CircleCheck size={16} aria-hidden="true" /> Farmers see this lender in their marketplace.
      </p>
    );
  return (
    <div className="border-gold/40 bg-gold/10 rounded-2xl border px-4 py-3">
      <p className="text-text text-sm font-semibold">Farmers don’t see this lender because:</p>
      <ul className="text-text-dim mt-1 list-disc space-y-0.5 pl-5 text-sm">
        {lender.blockers.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

function Step({
  n,
  done,
  warn = false,
  title,
  detail,
  action,
}: {
  n: number;
  done: boolean;
  warn?: boolean;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-border flex flex-wrap items-start gap-3 border-t py-3 first-of-type:border-t-0">
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
          warn
            ? 'border-gold bg-gold/15 text-ink-gold'
            : done
              ? 'bg-accent border-transparent text-white'
              : 'border-border text-text-mute',
        )}
      >
        {done && !warn ? <Check size={14} strokeWidth={3} /> : n}
      </span>
      <div className="min-w-40 flex-1">
        <p className="text-text text-sm font-semibold">
          {title}
          <span className="sr-only">{done ? ' (done)' : ' (to do)'}</span>
        </p>
        <p className="text-text-mute mt-0.5 text-xs wrap-break-word">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function LogoCard({ lender, onSaved }: { lender: AdminLender; onSaved: (l: AdminLender) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setProblem(null);
    try {
      onSaved(await lendersService.uploadLogo(lender.id, file));
      toast.success('Logo uploaded');
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : 'Could not upload the logo');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <Card>
      <h2 className="text-text text-base font-semibold">Official logo</h2>
      <p className="text-text-mute mt-1 text-xs">
        Use the institution’s genuine logo (PNG, JPEG or WebP, up to 2 MB). Without one, its
        initials show.
      </p>
      <div className="mt-4 flex items-center gap-4">
        <LenderLogo name={lender.name} color={lender.color} logoPath={lender.logoPath} size={72} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Choose a logo file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button
            size="sm"
            icon={ImageUp}
            loading={busy}
            className={PRIMARY_CLASS}
            onClick={() => input.current?.click()}
          >
            {lender.logoPath ? 'Replace logo' : 'Upload logo'}
          </Button>
          {lender.logoPath && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  onSaved(await lendersService.removeLogo(lender.id));
                } catch (cause) {
                  setProblem(cause instanceof Error ? cause.message : 'Could not remove the logo');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
      {problem && (
        <p role="alert" className="text-ink-red mt-3 text-sm">
          {problem}
        </p>
      )}
    </Card>
  );
}

function VerifyDialog({
  lender,
  busy,
  onClose,
  onSave,
}: {
  lender: AdminLender;
  busy: boolean;
  onClose: () => void;
  onSave: (check: {
    licenceStatus: LicenceStatus;
    source?: string;
    checkedOn: string;
    note?: string;
  }) => void;
}) {
  const [status, setStatus] = useState<LicenceStatus>('verified');
  const [source, setSource] = useState(lender.verificationSource ?? '');
  const [checkedOn, setCheckedOn] = useState(today());
  const [note, setNote] = useState('');
  const needsSource = status !== 'unverified';
  const valid = (!needsSource || source.trim().length > 3) && checkedOn && checkedOn <= today();

  return (
    <Modal
      open
      onClose={onClose}
      title="Record a licence check"
      description={`Check ${lender.name}${lender.licenceRef ? ` (${lender.licenceRef})` : ''} on the regulator’s own register or notice, then record what you found.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon={ShieldCheck}
            loading={busy}
            disabled={!valid}
            className={PRIMARY_CLASS}
            onClick={() =>
              onSave({
                licenceStatus: status,
                source: source.trim() || undefined,
                checkedOn,
                note: note.trim() || undefined,
              })
            }
          >
            Save check
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Result" htmlFor="licence-status">
          <Select
            id="licence-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as LicenceStatus)}
          >
            <option value="verified">Licensed: found and valid</option>
            <option value="expired">Licence expired</option>
            <option value="revoked">Licence revoked</option>
            <option value="unverified">Could not verify</option>
          </Select>
        </FormField>
        <FormField
          label="Official source"
          htmlFor="licence-source"
          hint="The register’s web address, or the notice’s title and date."
        >
          <Textarea
            id="licence-source"
            rows={2}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </FormField>
        <FormField label="Checked on" htmlFor="licence-date">
          <Input
            id="licence-date"
            type="date"
            max={today()}
            value={checkedOn}
            onChange={(e) => setCheckedOn(e.target.value)}
          />
        </FormField>
        <FormField label="Note (optional)" htmlFor="licence-note">
          <Textarea
            id="licence-note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </FormField>
        <p className="text-text-mute text-xs">
          A check is valid for 365 days. Anything but “Licensed” takes the lender off the
          marketplace.
        </p>
      </div>
    </Modal>
  );
}

function ListingDialog({
  lender,
  busy,
  onClose,
  onSave,
}: {
  lender: AdminLender;
  busy: boolean;
  onClose: () => void;
  onSave: (authorised: boolean, note?: string) => void;
}) {
  const [authorised, setAuthorised] = useState(!lender.listingAuthorised);
  const [note, setNote] = useState(lender.listingNote ?? '');
  return (
    <Modal
      open
      onClose={onClose}
      title="Public listing authorisation"
      description="Being licensed does not mean an institution agreed to be listed. Record how the listing was authorised."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={authorised && note.trim().length < 3}
            className={PRIMARY_CLASS}
            onClick={() => onSave(authorised, note.trim() || undefined)}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="border-border flex items-start gap-3 rounded-xl border p-3.5">
          <input
            type="checkbox"
            checked={authorised}
            onChange={(e) => setAuthorised(e.target.checked)}
            className="accent-accent mt-0.5 size-5 shrink-0"
          />
          <span className="text-text text-sm">
            {lender.name}’s public listing on AgriCtec is authorised
          </span>
        </label>
        <FormField
          label="How it was authorised"
          htmlFor="listing-note"
          hint="e.g. “Email from the bank’s communications office, 3 Nov 2026”."
        >
          <Textarea
            id="listing-note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  );
}

function SuspendDialog({
  lender,
  busy,
  onClose,
  onSave,
}: {
  lender: AdminLender;
  busy: boolean;
  onClose: () => void;
  onSave: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Suspend ${lender.name}?`}
      description="Every farmer stops seeing it immediately. Its applications keep their history."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon={Ban}
            loading={busy}
            disabled={reason.trim().length < 5}
            className={REJECT_CLASS}
            onClick={() => onSave(reason.trim())}
          >
            Suspend
          </Button>
        </>
      }
    >
      <FormField label="Reason (for the record)" htmlFor="suspend-reason">
        <Textarea
          id="suspend-reason"
          rows={2}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </FormField>
    </Modal>
  );
}
