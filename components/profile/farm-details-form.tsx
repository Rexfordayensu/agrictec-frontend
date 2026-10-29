'use client';

import { useId, useState, type ComponentType, type ReactNode } from 'react';
import { MapPinned, Pencil, Ruler, Save, Sprout, Tractor, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { StepCrops } from '@/components/onboarding/step-crops';
import { StepFarmName } from '@/components/onboarding/step-farm-name';
import { StepFarmSize } from '@/components/onboarding/step-farm-size';
import { StepFarmType } from '@/components/onboarding/step-farm-type';
import { StepLocation } from '@/components/onboarding/step-location';
import type { StepProps } from '@/components/onboarding/wizard-nav';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { CropIcon, cropFromName } from '@/components/ui/crop-icon';
import { Modal } from '@/components/ui/modal';
import { formatGPS } from '@/lib/format';
import { cropNames, formatFarmSize, locationLabel } from '@/lib/profile';
import { isReadOnly } from '@/lib/read-only';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';
import type { Profile } from '@/types';

type Section = 'name' | 'location' | 'size' | 'crops' | 'type';
type StepComponent = ComponentType<StepProps & { autoFocusHeading?: boolean }>;

const EDITORS: Record<Section, { title: string; icon: typeof Sprout; Step: StepComponent }> = {
  name: { title: 'Farm name', icon: Tractor, Step: StepFarmName },
  location: { title: 'Farm location', icon: MapPinned, Step: StepLocation },
  size: { title: 'Farm size', icon: Ruler, Step: StepFarmSize },
  crops: { title: 'Crops', icon: Sprout, Step: StepCrops },
  type: { title: 'Farm type', icon: Warehouse, Step: StepFarmType },
};

function Row({
  section,
  onEdit,
  children,
}: {
  section: Section;
  onEdit: (section: Section) => void;
  children: ReactNode;
}) {
  const { title, icon: Icon } = EDITORS[section];
  return (
    <div className="border-border flex items-start gap-3 border-b py-3.5 first:pt-0 last:border-b-0 last:pb-0">
      <Icon size={17} aria-hidden="true" className="text-text-mute mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-text-mute text-[11px] font-semibold tracking-wider uppercase">{title}</p>
        <div className="text-text mt-0.5 text-sm">{children}</div>
      </div>
      <button
        type="button"
        onClick={() => onEdit(section)}
        aria-label={`Edit ${title.toLowerCase()}`}
        className="text-ink-green hover:bg-glass -mt-1.5 -mr-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
      >
        <Pencil size={13} aria-hidden="true" />
        Edit
      </button>
    </div>
  );
}

/**
 * Farm details on the profile page: everything set during onboarding, each part editable in a
 * dialog with the same component as the wizard step (same fields, same validation).
 */
export function FarmDetailsForm() {
  const profile = useProfileStore((state) => state.profile);
  const save = useProfileStore((state) => state.save);
  const [editing, setEditing] = useState<Section | null>(null);
  const [saving, setSaving] = useState(false);
  const formId = useId();

  if (!profile) return null;
  const crops = cropNames(profile);

  async function submit(patch: Partial<Profile>) {
    if (!profile) return;
    setSaving(true);
    try {
      const pinChanged =
        'gps' in patch && JSON.stringify(patch.gps) !== JSON.stringify(profile.gps);
      await save({
        ...patch,
        // A pin verifies the farm location; removing it un-verifies it.
        ...(pinChanged && { verification: { location: Boolean(patch.gps) } }),
      });
      if (pinChanged && patch.gps && !isReadOnly()) {
        void usePlatformStore
          .getState()
          .logInstantCheck('location', `${patch.gps.lat.toFixed(4)}, ${patch.gps.lng.toFixed(4)}`)
          .catch(() => {});
      }
      toast.success('Farm details updated');
      setEditing(null);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update your farm');
    } finally {
      setSaving(false);
    }
  }

  const editor = editing ? EDITORS[editing] : null;

  return (
    <Card id="farm-details" className="h-full scroll-mt-24 rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sprout size={18} aria-hidden="true" className="text-ink-green" />
            Farm details
          </CardTitle>
          <CardSub>What you told us during setup. Tap Edit to change any part.</CardSub>
        </div>
      </CardHeader>

      <Row section="name" onEdit={setEditing}>
        <p className="font-semibold">{profile.farmName || 'Not set'}</p>
      </Row>
      <Row section="location" onEdit={setEditing}>
        <p className="font-semibold">{locationLabel(profile) || 'Not set'}</p>
        {profile.community && <p className="text-text-dim">{profile.community}</p>}
        <p className="text-text-mute text-xs tabular-nums">
          {profile.gps ? formatGPS(profile.gps.lat, profile.gps.lng) : 'No map pin'}
        </p>
      </Row>
      <Row section="size" onEdit={setEditing}>
        <p className="font-semibold">
          {profile.acres > 0 ? formatFarmSize(profile.acres, profile.sizeUnit) : 'Not set'}
        </p>
      </Row>
      <Row section="crops" onEdit={setEditing}>
        {crops.length ? (
          <ul aria-label="Crops" className="mt-1 flex flex-wrap gap-1.5">
            {crops.map((crop) => (
              <li
                key={crop}
                className="bg-accent/12 text-ink-green inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold"
              >
                <CropIcon crop={cropFromName(crop)} size={12} />
                {crop}
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-semibold">Not set</p>
        )}
      </Row>
      <Row section="type" onEdit={setEditing}>
        <p className="font-semibold">{profile.farmType}</p>
        {profile.cooperativeName && <p className="text-text-dim">{profile.cooperativeName}</p>}
        {profile.outgrowerCompany && (
          <p className="text-text-dim">Grows for {profile.outgrowerCompany}</p>
        )}
      </Row>

      {editor && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={editor.title}
          size={editing === 'location' ? 'lg' : 'md'}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button mutates type="submit" form={formId} icon={Save} loading={saving}>
                Save
              </Button>
            </>
          }
        >
          <editor.Step formId={formId} data={profile} onSubmit={submit} autoFocusHeading={false} />
        </Modal>
      )}
    </Card>
  );
}
