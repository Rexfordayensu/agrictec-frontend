'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CROPS } from '@/constants/crops';
import { REGIONS } from '@/constants/regions';
import {
  CATEGORY_LABELS,
  DOCUMENT_FORMATS,
  FIELD_TYPE_LABELS,
  DSCR_METHOD,
  FINANCIAL_METRICS,
  METRICS,
  OPS_BY_KIND,
  VERIFICATION_LABELS,
} from '@/lib/loan-products';
import type {
  Category,
  CheckOp,
  DocumentFormat,
  FieldType,
  Metric,
  Requirement,
  Verification,
} from '@/types/products';

const FARM_TYPES = ['Smallholder', 'Commercial', 'Cooperative', 'Out-grower'];
const CHOICES: Partial<Record<Metric, readonly string[]>> = {
  farm_region: REGIONS,
  primary_crop: CROPS,
  farm_type: FARM_TYPES,
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

const decimal = (v: string) => /^\d+(\.\d{1,4})?$/.test(v.trim());
const orNull = (v: string) => (v.trim() ? v.trim() : null);

/**
 * Adds or edits one requirement. A requirement is either something AgriCtec can check from
 * what it already holds (the check), something the farmer provides, or both.
 */
export function RequirementModal({
  initial,
  earlier,
  takenKeys,
  onClose,
  onSave,
}: {
  initial?: Requirement;
  /** Requirements listed before this one (it may depend on a yes/no or choice among them). */
  earlier: Requirement[];
  takenKeys: string[];
  onClose: () => void;
  onSave: (requirement: Requirement) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [key, setKey] = useState(initial?.key ?? '');
  const [keyEdited, setKeyEdited] = useState(Boolean(initial));
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'identity');
  const [required, setRequired] = useState(initial?.required ?? true);
  const [fieldType, setFieldType] = useState<FieldType>(initial?.fieldType ?? 'none');
  const [min, setMin] = useState(initial?.min ?? '');
  const [max, setMax] = useState(initial?.max ?? '');
  const [options, setOptions] = useState((initial?.options ?? []).join('\n'));
  const [formats, setFormats] = useState<DocumentFormat[]>(initial?.allowedFormats ?? ['pdf']);
  const [maxSize, setMaxSize] = useState(String(initial?.maxSizeMb ?? 5));
  const [hasCheck, setHasCheck] = useState(Boolean(initial?.check));
  const [metric, setMetric] = useState<Metric>(initial?.check?.metric ?? 'ghana_card_verified');
  const [op, setOp] = useState<CheckOp>(initial?.check?.op ?? 'is_true');
  const [checkNumber, setCheckNumber] = useState(
    typeof initial?.check?.value === 'string' || typeof initial?.check?.value === 'number'
      ? String(initial.check.value)
      : '',
  );
  const [checkChoices, setCheckChoices] = useState<string[]>(
    Array.isArray(initial?.check?.value) ? initial.check.value : [],
  );
  const [dependsOn, setDependsOn] = useState(initial?.visibleIf?.key ?? '');
  const [equals, setEquals] = useState(initial?.visibleIf?.equals ?? '');
  const [verification, setVerification] = useState<Verification>(
    initial?.verification ?? 'self_declared',
  );
  const [source, setSource] = useState(initial?.source ?? '');
  const [effectiveFrom, setEffectiveFrom] = useState(initial?.effectiveFrom ?? '');
  const [reviewedOn, setReviewedOn] = useState(initial?.reviewedOn ?? '');
  const [reviewBy, setReviewBy] = useState(initial?.reviewBy ?? '');

  const kind = METRICS[metric].kind;
  const parents = earlier.filter((r) => r.fieldType === 'yes_no' || r.fieldType === 'select');
  const parent = parents.find((r) => r.key === dependsOn);
  const parentAnswers = parent
    ? parent.fieldType === 'yes_no'
      ? ['yes', 'no']
      : parent.options
    : [];
  const optionList = options
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean);
  const finalKey = keyEdited ? key : slug(name);

  const problems: string[] = [];
  if (name.trim().length < 2) problems.push('Enter the requirement’s name.');
  if (!/^[a-z0-9_]{2,40}$/.test(finalKey)) problems.push('The key uses a–z, 0–9 and _ only.');
  if (takenKeys.includes(finalKey)) problems.push('Another requirement already uses this key.');
  if (fieldType === 'none' && !hasCheck)
    problems.push('Add a check AgriCtec can make, or choose what the farmer provides.');
  if (
    (fieldType === 'number' || fieldType === 'amount') &&
    ((min && !decimal(min)) || (max && !decimal(max)))
  )
    problems.push('Limits must be plain numbers.');
  if (fieldType === 'select' && optionList.length < 2) problems.push('List at least two options.');
  if (fieldType === 'document' && formats.length === 0)
    problems.push('Choose the accepted file types.');
  if (hasCheck && (kind === 'number' || kind === 'amount') && !decimal(checkNumber))
    problems.push('Enter the number the check compares with.');
  if (hasCheck && kind === 'choice' && checkChoices.length === 0)
    problems.push('Choose at least one value for the check.');
  if (dependsOn && !equals) problems.push('Choose the answer that shows this requirement.');
  const financialRule = hasCheck && FINANCIAL_METRICS.has(metric);
  if (financialRule && !effectiveFrom) problems.push('Enter the date this lender rule took effect.');
  if (financialRule && !reviewedOn)
    problems.push('Enter the date this rule was last confirmed with the lender.');
  if (reviewedOn && reviewBy && reviewBy < reviewedOn)
    problems.push('The next review date is before the last review.');

  function save() {
    const numeric = fieldType === 'number' || fieldType === 'amount';
    onSave({
      key: finalKey,
      name: name.trim(),
      description: orNull(description),
      category,
      required,
      fieldType,
      min: numeric ? orNull(min) : null,
      max: numeric ? orNull(max) : null,
      options: fieldType === 'select' ? optionList : [],
      allowedFormats: fieldType === 'document' ? formats : [],
      maxSizeMb: fieldType === 'document' ? Number(maxSize) || null : null,
      check: hasCheck
        ? {
            metric,
            op: OPS_BY_KIND[kind].includes(op) ? op : OPS_BY_KIND[kind][0],
            value: kind === 'bool' ? null : kind === 'choice' ? checkChoices : checkNumber.trim(),
          }
        : null,
      visibleIf: dependsOn && equals ? { key: dependsOn, equals } : null,
      verification,
      source: orNull(source),
      effectiveFrom: orNull(effectiveFrom),
      reviewedOn: orNull(reviewedOn),
      reviewBy: orNull(reviewBy),
    });
  }

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={initial ? `Edit “${initial.name}”` : 'Add a requirement'}
      description="Only what this lender officially asks for this product."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon={Save}
            disabled={problems.length > 0}
            className={PRIMARY_CLASS}
            onClick={save}
          >
            {initial ? 'Update requirement' : 'Add requirement'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
          <FormField label="Requirement" htmlFor="req-name">
            <Input
              id="req-name"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <FormField label="Key (stays the same across versions)" htmlFor="req-key">
            <Input
              id="req-key"
              value={finalKey}
              maxLength={40}
              disabled={Boolean(initial)}
              onChange={(e) => {
                setKeyEdited(true);
                setKey(e.target.value);
              }}
              className="font-mono text-xs"
            />
          </FormField>
        </div>
        <FormField label="Description (optional)" htmlFor="req-description">
          <Textarea
            id="req-description"
            rows={2}
            maxLength={600}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Category" htmlFor="req-category">
            <Select
              id="req-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="The farmer provides" htmlFor="req-field">
            <Select
              id="req-field"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FieldType)}
            >
              {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="How it is checked" htmlFor="req-verification">
            <Select
              id="req-verification"
              value={verification}
              onChange={(e) => setVerification(e.target.value as Verification)}
            >
              {Object.entries(VERIFICATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <label className="text-text flex min-h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="accent-accent size-4"
          />
          Mandatory (unticked: optional)
        </label>

        {(fieldType === 'number' || fieldType === 'amount') && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Minimum (optional)" htmlFor="req-min">
              <Input
                id="req-min"
                inputMode="decimal"
                value={min}
                onChange={(e) => setMin(e.target.value)}
              />
            </FormField>
            <FormField label="Maximum (optional)" htmlFor="req-max">
              <Input
                id="req-max"
                inputMode="decimal"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </FormField>
          </div>
        )}
        {fieldType === 'select' && (
          <FormField label="Options, one per line" htmlFor="req-options">
            <Textarea
              id="req-options"
              rows={3}
              value={options}
              onChange={(e) => setOptions(e.target.value)}
            />
          </FormField>
        )}
        {fieldType === 'document' && (
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <fieldset>
              <legend className="text-text-dim mb-2 text-xs font-semibold">Accepted files</legend>
              <div className="flex flex-wrap gap-3">
                {DOCUMENT_FORMATS.map((f) => (
                  <label key={f} className="text-text flex items-center gap-1.5 text-sm uppercase">
                    <input
                      type="checkbox"
                      checked={formats.includes(f)}
                      onChange={() =>
                        setFormats(
                          formats.includes(f) ? formats.filter((x) => x !== f) : [...formats, f],
                        )
                      }
                      className="accent-accent size-4"
                    />
                    {f}
                  </label>
                ))}
              </div>
            </fieldset>
            <FormField label="Largest file (MB)" htmlFor="req-size">
              <Input
                id="req-size"
                type="number"
                min={1}
                max={20}
                value={maxSize}
                onChange={(e) => setMaxSize(e.target.value)}
              />
            </FormField>
          </div>
        )}

        <fieldset className="border-border rounded-xl border p-3.5">
          <legend className="px-1">
            <label className="text-text flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={hasCheck}
                onChange={(e) => setHasCheck(e.target.checked)}
                className="accent-accent size-4"
              />
              AgriCtec can check this from what it already holds
            </label>
          </legend>
          {hasCheck && (
            <div className="mt-2 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="What" htmlFor="req-metric">
                  <Select
                    id="req-metric"
                    value={metric}
                    onChange={(e) => {
                      const next = e.target.value as Metric;
                      setMetric(next);
                      setOp(OPS_BY_KIND[METRICS[next].kind][0]);
                      setCheckChoices([]);
                    }}
                  >
                    {Object.entries(METRICS).map(([value, spec]) => (
                      <option key={value} value={value}>
                        {spec.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                {(kind === 'number' || kind === 'amount') && (
                  <div className="grid grid-cols-[8rem_1fr] gap-2">
                    <FormField label="Rule" htmlFor="req-op">
                      <Select
                        id="req-op"
                        value={op}
                        onChange={(e) => setOp(e.target.value as CheckOp)}
                      >
                        <option value="gte">At least</option>
                        <option value="lte">At most</option>
                      </Select>
                    </FormField>
                    <FormField label={kind === 'amount' ? 'GHS' : 'Value'} htmlFor="req-value">
                      <Input
                        id="req-value"
                        inputMode="decimal"
                        value={checkNumber}
                        onChange={(e) => setCheckNumber(e.target.value)}
                      />
                    </FormField>
                  </div>
                )}
              </div>
              {kind === 'choice' && (
                <fieldset>
                  <legend className="text-text-dim mb-2 text-xs font-semibold">Any of</legend>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {(CHOICES[metric] ?? []).map((choice) => (
                      <label key={choice} className="text-text flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={checkChoices.includes(choice)}
                          onChange={() =>
                            setCheckChoices(
                              checkChoices.includes(choice)
                                ? checkChoices.filter((c) => c !== choice)
                                : [...checkChoices, choice],
                            )
                          }
                          className="accent-accent size-4"
                        />
                        {choice}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          )}
        </fieldset>

        {parents.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Only show when (optional)" htmlFor="req-depends">
              <Select
                id="req-depends"
                value={dependsOn}
                onChange={(e) => {
                  setDependsOn(e.target.value);
                  setEquals('');
                }}
              >
                <option value="">Always show</option>
                {parents.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </FormField>
            {dependsOn && (
              <FormField label="is answered" htmlFor="req-equals">
                <Select id="req-equals" value={equals} onChange={(e) => setEquals(e.target.value)}>
                  <option value="">Choose…</option>
                  {parentAnswers.map((answer) => (
                    <option key={answer} value={answer}>
                      {answer}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
          </div>
        )}

        <FormField
          label="Where the lender states it (optional)"
          htmlFor="req-source"
          hint="Leave empty when it is in the product’s main source."
        >
          <Input
            id="req-source"
            value={source}
            maxLength={500}
            onChange={(e) => setSource(e.target.value)}
          />
        </FormField>

        {/* A lender rule is applied only as confirmed: from when, last checked, next check. */}
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            label={financialRule ? 'Rule took effect' : 'Rule took effect (optional)'}
            htmlFor="req-effective"
          >
            <Input
              id="req-effective"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </FormField>
          <FormField
            label={financialRule ? 'Last confirmed with the lender' : 'Last confirmed (optional)'}
            htmlFor="req-reviewed"
          >
            <Input
              id="req-reviewed"
              type="date"
              value={reviewedOn}
              onChange={(e) => setReviewedOn(e.target.value)}
            />
          </FormField>
          <FormField
            label="Confirm again by (optional)"
            htmlFor="req-review-by"
            hint="After this date the rule is not applied until confirmed again."
          >
            <Input
              id="req-review-by"
              type="date"
              value={reviewBy}
              onChange={(e) => setReviewBy(e.target.value)}
            />
          </FormField>
        </div>
        {hasCheck && metric === 'dscr' && (
          <p className="text-text-mute text-xs">
            AgriCtec calculates it as: {DSCR_METHOD} Use this check only when the lender’s stated
            method is the same.
          </p>
        )}

        {problems.length > 0 && (
          <ul className="text-ink-gold list-disc space-y-0.5 pl-5 text-xs">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
