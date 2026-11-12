'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  EyeOff,
  History,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { APPROVE_CLASS, PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { RequirementModal } from '@/components/admin/lenders/requirement-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { REGIONS } from '@/constants/regions';
import { formatGhanaDate } from '@/lib/format';
import {
  CATEGORY_LABELS,
  FREQUENCY_LABELS,
  RATE_METHOD_LABELS,
  requirementAsk,
  VERIFICATION_LABELS,
} from '@/lib/loan-products';
import { loanProductsService } from '@/services/admin/loan-products.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type {
  AdminProduct,
  Fee,
  ProductContent,
  ProductTerms,
  ProductVersion,
  Requirement,
} from '@/types/products';
import { LogoLoader } from '@/components/ui/logo-loader';

type Dialog =
  | { type: 'requirement'; index: number | null }
  | { type: 'publish' }
  | { type: 'unpublish' }
  | { type: 'reset' }
  | { type: 'delete' }
  | null;

const today = () => new Date().toISOString().slice(0, 10);
const text = (v: string | null | undefined) => v ?? '';
const orNull = (v: string) => (v.trim() ? v.trim() : null);
const isDecimal = (v: string | null | undefined) => !v || /^\d+(\.\d{1,4})?$/.test(v.trim());

/** The console's editor for one loan product. */
export function ProductEditor({ lenderId, productId }: { lenderId: string; productId: string }) {
  const router = useRouter();
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [draft, setDraft] = useState<ProductContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [versions, setVersions] = useState<ProductVersion[] | null>(null);

  useEffect(() => {
    let active = true;
    loanProductsService.get(productId).then(
      (loaded) => {
        if (!active) return;
        setProduct(loaded);
        // Another tab's change doesn't overwrite edits being typed here.
        setDraft((current) => (current && dirty ? current : loaded.draft));
      },
      (cause: unknown) =>
        active && setError(cause instanceof Error ? cause.message : 'Could not load the product'),
    );
    return () => {
      active = false;
    };
    // `dirty` is read at answer time only; reloading on every keystroke is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, syncVersion]);

  if (error)
    return (
      <div className="space-y-4">
        <BackLink lenderId={lenderId} />
        <p role="alert" className="text-ink-red text-sm">
          {error}
        </p>
      </div>
    );
  if (!product || !draft) return <Skeleton className="h-96 w-full rounded-2xl" />;
  const current = product;
  const content = draft;

  const edit = (next: ProductContent) => {
    setDraft(next);
    setDirty(true);
  };
  const setTerms = (patch: Partial<ProductTerms>) =>
    edit({ ...content, terms: { ...content.terms, ...patch } });
  const setRequirements = (requirements: Requirement[]) => edit({ ...content, requirements });

  const localProblems: string[] = [];
  for (const [label, value] of [
    ['Smallest loan', content.terms.minAmount],
    ['Largest loan', content.terms.maxAmount],
    ['Interest rate', content.terms.interestRate],
  ] as const)
    if (!isDecimal(value)) localProblems.push(`${label}: use a plain number, e.g. 5000 or 28.5.`);
  content.terms.fees.forEach((fee, i) => {
    if (!fee.name.trim()) localProblems.push(`Fee ${i + 1}: give it a name.`);
    if (!fee.value || !isDecimal(fee.value))
      localProblems.push(`Fee ${i + 1}: enter its amount or %.`);
  });

  async function run(
    task: () => Promise<AdminProduct | void>,
    success: string,
    after?: () => void,
  ) {
    setBusy(true);
    try {
      const saved = await task();
      if (saved) {
        setProduct(saved);
        setDraft(saved.draft);
        setDirty(false);
      }
      toast.success(success);
      setDialog(null);
      setVersions(null);
      after?.();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'That did not work');
    } finally {
      setBusy(false);
    }
  }

  const save = () => run(() => loanProductsService.saveDraft(current.id, content), 'Draft saved');
  const canPublish =
    !dirty &&
    current.problems.length === 0 &&
    (current.draftChanged || current.status !== 'published');
  const takenKeys = (index: number | null) =>
    content.requirements.filter((_, i) => i !== index).map((r) => r.key);

  return (
    <div className="space-y-5">
      <BackLink lenderId={lenderId} />

      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-text text-xl font-bold wrap-break-word">
            {content.name || 'Untitled'}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <Badge
              color={
                current.status === 'published'
                  ? 'green'
                  : current.status === 'draft'
                    ? 'blue'
                    : 'gold'
              }
            >
              {current.status === 'published'
                ? 'Published'
                : current.status === 'draft'
                  ? 'Draft'
                  : 'Unpublished'}
            </Badge>
            {current.published && (
              <span className="text-text-mute">
                Farmers see version {current.published.version} ·{' '}
                {current.listed ? 'listed' : 'not listed (lender or product hidden)'}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            icon={Save}
            loading={busy}
            disabled={!dirty || localProblems.length > 0}
            onClick={save}
          >
            Save draft
          </Button>
          {current.published && current.draftChanged && !dirty && (
            <Button variant="ghost" icon={RotateCcw} onClick={() => setDialog({ type: 'reset' })}>
              Discard changes
            </Button>
          )}
          {current.status === 'published' && (
            <Button variant="ghost" icon={EyeOff} onClick={() => setDialog({ type: 'unpublish' })}>
              Unpublish
            </Button>
          )}
          <Button
            icon={Send}
            disabled={!canPublish}
            className={APPROVE_CLASS}
            onClick={() => setDialog({ type: 'publish' })}
          >
            {current.published && !current.draftChanged ? 'Publish again' : 'Publish'}
          </Button>
        </div>
      </header>

      <StatusPanel product={current} dirty={dirty} localProblems={localProblems} />

      <Card className="space-y-4">
        <SectionTitle title="Product" />
        <FormField label="Name (as the lender publishes it)" htmlFor="p-name">
          <Input
            id="p-name"
            value={content.name}
            maxLength={120}
            onChange={(e) => edit({ ...content, name: e.target.value })}
          />
        </FormField>
        <FormField
          label="Purpose"
          htmlFor="p-purpose"
          hint="What the loan is for, in the lender’s words."
        >
          <Input
            id="p-purpose"
            value={text(content.terms.purpose)}
            maxLength={300}
            onChange={(e) => setTerms({ purpose: orNull(e.target.value) })}
          />
        </FormField>
        <FormField label="Description" htmlFor="p-description">
          <Textarea
            id="p-description"
            rows={3}
            maxLength={2000}
            value={text(content.terms.description)}
            onChange={(e) => setTerms({ description: orNull(e.target.value) })}
          />
        </FormField>
      </Card>

      <Card className="space-y-4">
        <SectionTitle
          title="Terms"
          hint="Leave anything the lender doesn’t state empty: farmers see “Not provided”."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Smallest loan (GHS)" htmlFor="p-min">
            <Input
              id="p-min"
              inputMode="decimal"
              value={text(content.terms.minAmount)}
              onChange={(e) => setTerms({ minAmount: orNull(e.target.value) })}
            />
          </FormField>
          <FormField label="Largest loan (GHS)" htmlFor="p-max">
            <Input
              id="p-max"
              inputMode="decimal"
              value={text(content.terms.maxAmount)}
              onChange={(e) => setTerms({ maxAmount: orNull(e.target.value) })}
            />
          </FormField>
          <FormField label="Shortest period (months)" htmlFor="p-min-months">
            <Input
              id="p-min-months"
              type="number"
              min={1}
              max={360}
              value={content.terms.minMonths ?? ''}
              onChange={(e) =>
                setTerms({ minMonths: e.target.value ? Number(e.target.value) : null })
              }
            />
          </FormField>
          <FormField label="Longest period (months)" htmlFor="p-max-months">
            <Input
              id="p-max-months"
              type="number"
              min={1}
              max={360}
              value={content.terms.maxMonths ?? ''}
              onChange={(e) =>
                setTerms({ maxMonths: e.target.value ? Number(e.target.value) : null })
              }
            />
          </FormField>
          <FormField
            label="History assessed (months)"
            htmlFor="p-assessment-months"
            hint="How many months of transactions the lender looks at. Leave empty if not stated."
          >
            <Input
              id="p-assessment-months"
              type="number"
              min={1}
              max={36}
              value={content.terms.assessmentMonths ?? ''}
              onChange={(e) =>
                setTerms({ assessmentMonths: e.target.value ? Number(e.target.value) : null })
              }
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Interest rate (%)" htmlFor="p-rate">
            <Input
              id="p-rate"
              inputMode="decimal"
              value={text(content.terms.interestRate)}
              onChange={(e) => setTerms({ interestRate: orNull(e.target.value) })}
            />
          </FormField>
          <FormField label="Rate is" htmlFor="p-period">
            <Select
              id="p-period"
              value={content.terms.ratePeriod ?? ''}
              onChange={(e) =>
                setTerms({ ratePeriod: (e.target.value || null) as ProductTerms['ratePeriod'] })
              }
            >
              <option value="">Not provided</option>
              <option value="year">Per year</option>
              <option value="month">Per month</option>
            </Select>
          </FormField>
          <FormField label="Calculation method" htmlFor="p-method">
            <Select
              id="p-method"
              value={content.terms.rateMethod ?? ''}
              onChange={(e) =>
                setTerms({ rateMethod: (e.target.value || null) as ProductTerms['rateMethod'] })
              }
            >
              <option value="">Not provided</option>
              {Object.entries(RATE_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Repayment" htmlFor="p-frequency">
            <Select
              id="p-frequency"
              value={content.terms.repaymentFrequency ?? ''}
              onChange={(e) =>
                setTerms({
                  repaymentFrequency: (e.target.value ||
                    null) as ProductTerms['repaymentFrequency'],
                })
              }
            >
              <option value="">Not provided</option>
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Note on the rate (optional)" htmlFor="p-rate-note">
          <Input
            id="p-rate-note"
            maxLength={500}
            value={text(content.terms.rateNote)}
            onChange={(e) => setTerms({ rateNote: orNull(e.target.value) })}
          />
        </FormField>
        <FeesEditor fees={content.terms.fees} onChange={(fees) => setTerms({ fees })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Collateral" htmlFor="p-collateral">
            <Textarea
              id="p-collateral"
              rows={2}
              maxLength={500}
              value={text(content.terms.collateral)}
              onChange={(e) => setTerms({ collateral: orNull(e.target.value) })}
            />
          </FormField>
          <FormField label="Guarantor" htmlFor="p-guarantor">
            <Textarea
              id="p-guarantor"
              rows={2}
              maxLength={500}
              value={text(content.terms.guarantor)}
              onChange={(e) => setTerms({ guarantor: orNull(e.target.value) })}
            />
          </FormField>
        </div>
        <RegionsEditor
          regions={content.terms.supportedRegions ?? null}
          onChange={(supportedRegions) => setTerms({ supportedRegions })}
        />
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle
            title="Requirements"
            hint="In the lender’s order. Nothing is required unless the lender asks for it."
          />
          <Button
            size="sm"
            icon={Plus}
            className={PRIMARY_CLASS}
            onClick={() => setDialog({ type: 'requirement', index: null })}
          >
            Add requirement
          </Button>
        </div>
        {content.requirements.length === 0 ? (
          <p className="text-text-dim text-sm">No requirements yet.</p>
        ) : (
          <ol className="divide-border divide-y">
            {content.requirements.map((r, i) => (
              <li key={r.key} className="flex flex-wrap items-start gap-3 py-3">
                <span className="text-text-mute w-5 shrink-0 pt-0.5 text-xs tabular-nums">
                  {i + 1}.
                </span>
                <div className="min-w-48 flex-1">
                  <p className="text-text text-sm font-semibold">
                    {r.name}{' '}
                    <span className="text-text-mute font-normal">
                      · {CATEGORY_LABELS[r.category]}
                    </span>
                  </p>
                  <p className="text-text-mute text-xs">
                    {r.required ? 'Mandatory' : 'Optional'} · {VERIFICATION_LABELS[r.verification]}
                    {r.visibleIf
                      ? ` · only when “${r.visibleIf.key}” is ${r.visibleIf.equals}`
                      : ''}
                  </p>
                  {requirementAsk(r) && (
                    <p className="text-text-dim mt-0.5 text-xs">{requirementAsk(r)}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconButton
                    label={`Move ${r.name} up`}
                    disabled={i === 0}
                    onClick={() => setRequirements(move(content.requirements, i, -1))}
                  >
                    <ArrowUp size={15} />
                  </IconButton>
                  <IconButton
                    label={`Move ${r.name} down`}
                    disabled={i === content.requirements.length - 1}
                    onClick={() => setRequirements(move(content.requirements, i, 1))}
                  >
                    <ArrowDown size={15} />
                  </IconButton>
                  <IconButton
                    label={`Edit ${r.name}`}
                    onClick={() => setDialog({ type: 'requirement', index: i })}
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    label={`Remove ${r.name}`}
                    onClick={() => setRequirements(content.requirements.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card className="space-y-4">
        <SectionTitle
          title="Source"
          hint="Where these terms and requirements come from. Needed to publish."
        />
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <FormField
            label="Official source"
            htmlFor="p-source"
            hint="The lender’s page address, or the document’s title and date."
          >
            <Textarea
              id="p-source"
              rows={2}
              maxLength={1000}
              value={text(content.source)}
              onChange={(e) => edit({ ...content, source: orNull(e.target.value) })}
            />
          </FormField>
          <FormField label="Checked on" htmlFor="p-checked">
            <Input
              id="p-checked"
              type="date"
              max={today()}
              value={text(content.sourceCheckedOn)}
              onChange={(e) => edit({ ...content, sourceCheckedOn: e.target.value || null })}
            />
          </FormField>
        </div>
      </Card>

      <VersionHistory productId={current.id} versions={versions} onLoad={setVersions} />

      {current.status === 'draft' && (
        <div>
          <Button
            size="sm"
            variant="ghost"
            icon={Trash2}
            onClick={() => setDialog({ type: 'delete' })}
          >
            Delete this draft product
          </Button>
        </div>
      )}

      {dialog?.type === 'requirement' && (
        <RequirementModal
          initial={dialog.index === null ? undefined : content.requirements[dialog.index]}
          earlier={content.requirements.slice(0, dialog.index ?? content.requirements.length)}
          takenKeys={takenKeys(dialog.index)}
          onClose={() => setDialog(null)}
          onSave={(requirement) => {
            const list = [...content.requirements];
            if (dialog.index === null) list.push(requirement);
            else list[dialog.index] = requirement;
            setRequirements(list);
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === 'publish' && (
        <PublishDialog
          product={current}
          busy={busy}
          onClose={() => setDialog(null)}
          onPublish={(note) =>
            run(() => loanProductsService.publish(current.id, note), 'Published to farmers')
          }
        />
      )}
      <ConfirmDialog
        open={dialog?.type === 'unpublish'}
        title="Unpublish this product?"
        message="Farmers stop seeing it straight away. Its versions are kept, and you can publish it again."
        confirmLabel="Unpublish"
        loading={busy}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          run(() => loanProductsService.unpublish(current.id), 'Product unpublished')
        }
      />
      <ConfirmDialog
        open={dialog?.type === 'reset'}
        title="Discard the draft’s changes?"
        message="The draft goes back to the published version. Farmers are not affected."
        confirmLabel="Discard changes"
        danger
        loading={busy}
        onCancel={() => setDialog(null)}
        onConfirm={() => run(() => loanProductsService.resetDraft(current.id), 'Changes discarded')}
      />
      <ConfirmDialog
        open={dialog?.type === 'delete'}
        title="Delete this draft product?"
        message="It was never published, so it can be removed for good."
        confirmLabel="Delete product"
        danger
        loading={busy}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          run(
            () => loanProductsService.remove(current.id),
            'Product deleted',
            () => router.push(`/admin/lenders/${encodeURIComponent(lenderId)}`),
          )
        }
      />
    </div>
  );
}

function move<T>(list: T[], index: number, by: number): T[] {
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(index + by, 0, item);
  return next;
}

function BackLink({ lenderId }: { lenderId: string }) {
  return (
    <Link
      href={`/admin/lenders/${encodeURIComponent(lenderId)}`}
      className="text-text-dim hover:text-text inline-flex min-h-9 items-center gap-1.5 text-sm"
    >
      <ArrowLeft size={15} aria-hidden="true" /> Back to the lender
    </Link>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-text text-base font-semibold">{title}</h2>
      {hint && <p className="text-text-mute mt-0.5 text-xs">{hint}</p>}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="text-text-dim hover:bg-glass-strong hover:text-text inline-flex size-9 items-center justify-center rounded-lg disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function StatusPanel({
  product,
  dirty,
  localProblems,
}: {
  product: AdminProduct;
  dirty: boolean;
  localProblems: string[];
}) {
  if (dirty)
    return (
      <p className="border-gold/40 bg-gold/10 text-text rounded-2xl border px-4 py-3 text-sm">
        You have unsaved changes. Save the draft to check it for publishing.
        {localProblems.length > 0 && (
          <span className="text-ink-gold mt-1 block text-xs">{localProblems.join(' ')}</span>
        )}
      </p>
    );
  if (product.problems.length > 0)
    return (
      <div className="border-gold/40 bg-gold/10 rounded-2xl border px-4 py-3">
        <p className="text-text text-sm font-semibold">Before publishing:</p>
        <ul className="text-text-dim mt-1 list-disc space-y-0.5 pl-5 text-sm">
          {product.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    );
  return (
    <p className="border-accent/40 bg-accent/10 text-ink-green rounded-2xl border px-4 py-3 text-sm font-semibold">
      {product.published && !product.draftChanged
        ? product.status === 'published'
          ? 'Farmers see this version.'
          : 'This version can be published again.'
        : 'The draft is ready to publish.'}
    </p>
  );
}

function FeesEditor({ fees, onChange }: { fees: Fee[]; onChange: (fees: Fee[]) => void }) {
  const set = (i: number, patch: Partial<Fee>) =>
    onChange(fees.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <fieldset className="space-y-2">
      <legend className="text-text-dim mb-1 text-xs font-semibold">
        Fees (only those the lender states)
      </legend>
      {fees.map((fee, i) => (
        <div key={i} className="grid grid-cols-[1fr_7rem_7rem_auto] items-end gap-2">
          <Input
            aria-label={`Fee ${i + 1} name`}
            placeholder="Processing fee"
            value={fee.name}
            maxLength={80}
            onChange={(e) => set(i, { name: e.target.value })}
          />
          <Select
            aria-label={`Fee ${i + 1} kind`}
            value={fee.kind}
            onChange={(e) => set(i, { kind: e.target.value as Fee['kind'] })}
          >
            <option value="percent">% of loan</option>
            <option value="fixed">GHS</option>
          </Select>
          <Input
            aria-label={`Fee ${i + 1} value`}
            inputMode="decimal"
            value={fee.value}
            onChange={(e) => set(i, { value: e.target.value.trim() })}
          />
          <IconButton
            label={`Remove fee ${i + 1}`}
            onClick={() => onChange(fees.filter((_, j) => j !== i))}
          >
            <Trash2 size={15} />
          </IconButton>
        </div>
      ))}
      {fees.length < 10 && (
        <Button
          size="sm"
          variant="ghost"
          icon={Plus}
          onClick={() => onChange([...fees, { name: '', kind: 'percent', value: '' }])}
        >
          Add fee
        </Button>
      )}
    </fieldset>
  );
}

function RegionsEditor({
  regions,
  onChange,
}: {
  regions: string[] | null;
  onChange: (regions: string[] | null) => void;
}) {
  return (
    <fieldset>
      <legend className="text-text-dim mb-2 text-xs font-semibold">Regions served</legend>
      <div className="mb-2 flex flex-wrap gap-4 text-sm">
        <label className="text-text flex items-center gap-2">
          <input
            type="radio"
            checked={regions === null}
            onChange={() => onChange(null)}
            className="accent-accent"
          />
          Not provided
        </label>
        <label className="text-text flex items-center gap-2">
          <input
            type="radio"
            checked={regions !== null}
            onChange={() => onChange(regions ?? [])}
            className="accent-accent"
          />
          These regions
        </label>
        {regions !== null && (
          <button
            type="button"
            className="text-ink-purple text-xs font-semibold"
            onClick={() => onChange([...REGIONS])}
          >
            All regions
          </button>
        )}
      </div>
      {regions !== null && (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {REGIONS.map((region) => (
            <label key={region} className="text-text flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={regions.includes(region)}
                onChange={() =>
                  onChange(
                    regions.includes(region)
                      ? regions.filter((r) => r !== region)
                      : [...regions, region],
                  )
                }
                className="accent-accent size-4"
              />
              {region}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function PublishDialog({
  product,
  busy,
  onClose,
  onPublish,
}: {
  product: AdminProduct;
  busy: boolean;
  onClose: () => void;
  onPublish: (note: string) => void;
}) {
  const [note, setNote] = useState(product.published ? '' : 'First version');
  const next =
    product.published && !product.draftChanged
      ? product.published.version
      : (product.published?.version ?? 0) + 1;
  return (
    <Modal
      open
      size="sm"
      onClose={onClose}
      title={`Publish version ${next}`}
      description="Farmers see these terms and requirements once the lender is listed. A published version is never changed: later edits become a new version."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon={Send}
            loading={busy}
            disabled={note.trim().length < 3}
            className={APPROVE_CLASS}
            onClick={() => onPublish(note.trim())}
          >
            Publish
          </Button>
        </>
      }
    >
      <FormField
        label="What changed"
        htmlFor="publish-note"
        hint="e.g. “Rate lowered to 26% (new brochure, Nov 2026)”."
      >
        <Input
          id="publish-note"
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </FormField>
    </Modal>
  );
}

function VersionHistory({
  productId,
  versions,
  onLoad,
}: {
  productId: string;
  versions: ProductVersion[] | null;
  onLoad: (v: ProductVersion[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        type="button"
        aria-expanded={open}
        onClick={async () => {
          setOpen(!open);
          if (!versions) onLoad(await loanProductsService.versions(productId).catch(() => []));
        }}
        className="text-text flex w-full items-center gap-2 text-left text-base font-semibold"
      >
        <History size={16} aria-hidden="true" /> Published versions
      </button>
      {open &&
        (versions === null ? (
          <LogoLoader size="sm" label="Loading versions" className="mt-3" />
        ) : versions.length === 0 ? (
          <p className="text-text-dim mt-3 text-sm">Not published yet.</p>
        ) : (
          <ol className="divide-border mt-3 divide-y">
            {versions.map((v) => (
              <li key={v.version} className="py-2.5 text-sm">
                <p className="text-text font-semibold">
                  Version {v.version}{' '}
                  <span className="text-text-mute font-normal">
                    · {formatGhanaDate(v.publishedAt)} by {v.publishedBy}
                  </span>
                </p>
                <p className="text-text-dim text-xs">{v.note}</p>
              </li>
            ))}
          </ol>
        ))}
    </Card>
  );
}
