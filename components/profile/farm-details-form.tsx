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
import { CardHead } from '@/components/settings/card-head';
import { Card } from '@/components/ui/card';
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
  editing,
  children,
}: {
  section: Section;
  onEdit: (section: Section) => void;
  editing: boolean;
  children: ReactNode;
}) {
  const { title, icon: Icon } = EDITORS[section];
  return (
    <div className="border-border grid grid-cols-[1.5rem_minmax(6.5rem,8rem)_minmax(0,1fr)_auto] items-start gap-3 border-b py-3 last:border-b-0">
      <Icon size={19} aria-hidden="true" className="text-text-dim mt-0.5" />
      <p className="text-text-dim text-sm">{title}</p>
      <div className="text-text min-w-0 text-sm">{children}</div>
      {editing ? (
        <button
          type="button"
          onClick={() => onEdit(section)}
          aria-label={`Edit ${title.toLowerCase()}`}
          className="text-ink-green hover:bg-glass -my-1.5 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold"
        >
          <Pencil size={13} aria-hidden="true" />
          Edit
        </button>
      ) : (
        <span />
      )}
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
  const [editMode, setEditMode] = useState(false);
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
      // A moved or removed pin loses its verification (the API decides that, not this form).
      const saved = await save(patch);
      if (pinChanged && saved.gps && !isReadOnly()) {
        // An admin reviews the new pin on the map; it is verified once approved.
        await usePlatformStore
          .getState()
          .submitLocation(`${saved.gps.lat.toFixed(4)}, ${saved.gps.lng.toFixed(4)}`);
        toast.success('Farm details updated. Your location was sent for review.');
      } else toast.success('Farm details updated');
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
      <CardHead
        id="farm-details-title"
        icon={Sprout}
        title="Farm details"
        sub={editMode ? 'Choose the part to change.' : 'Information about your farm.'}
        onEdit={() => setEditMode((v) => !v)}
        editLabel={editMode ? 'Done' : 'Edit'}
      />
      <div className="mt-3" />

      <Row section="name" onEdit={setEditing} editing={editMode}>
        <p className="font-semibold">{profile.farmName || 'Not set'}</p>
      </Row>
      <Row section="location" onEdit={setEditing} editing={editMode}>
        <p className="font-semibold">{locationLabel(profile) || 'Not set'}</p>
        {profile.community && <p className="text-text-dim">{profile.community}</p>}
        <p className="text-text-mute text-xs tabular-nums">
          {profile.gps ? formatGPS(profile.gps.lat, profile.gps.lng) : 'No map pin'}
        </p>
      </Row>
      <Row section="size" onEdit={setEditing} editing={editMode}>
        <p className="font-semibold">
          {profile.acres > 0 ? formatFarmSize(profile.acres, profile.sizeUnit) : 'Not set'}
        </p>
      </Row>
      <Row section="crops" onEdit={setEditing} editing={editMode}>
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
      <Row section="type" onEdit={setEditing} editing={editMode}>
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
