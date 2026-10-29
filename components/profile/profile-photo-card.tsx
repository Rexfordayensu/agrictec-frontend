'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { compressImage, imageValidationError } from '@/lib/image/compress';
import { safeProfilePhoto } from '@/lib/profile-photo';
import { useReadOnly } from '@/lib/read-only';
import { useProfileStore } from '@/store/profile-store';

export function ProfilePhotoCard() {
  const userId = useProfileStore((s) => s.userId);
  return <PhotoEditor key={userId ?? 'no-user'} userId={userId} />;
}

function PhotoEditor({ userId }: { userId: string | null }) {
  const profile = useProfileStore((s) => s.profile);
  const status = useProfileStore((s) => s.status);
  const readOnly = useReadOnly();
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [draft, setDraft] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const savedPhoto = profile?.photoDataUrl;
  const busy = processing || saving;
  const disabled = busy || readOnly || !userId || status !== 'ready';

  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  async function choosePhoto(file?: File) {
    if (!file || disabled) return;
    const validationError = imageValidationError(file);
    if (validationError) return toast.error(validationError);
    const version = ++request.current;
    setProcessing(true);
    try {
      const photo = await compressImage(file, 320, 0.8);
      if (request.current !== version || useProfileStore.getState().userId !== userId) return;
      if (!safeProfilePhoto(photo))
        throw new Error('This photo is too large. Try another picture.');
      setDraft(photo);
    } catch (error) {
      if (request.current === version && useProfileStore.getState().userId === userId)
        toast.error(error instanceof Error ? error.message : 'Could not open this photo.');
    } finally {
      if (request.current === version) setProcessing(false);
    }
  }

  async function savePhoto(photoDataUrl?: string) {
    if (disabled || useProfileStore.getState().userId !== userId) return;
    setSaving(true);
    try {
      await useProfileStore.getState().save({ photoDataUrl });
      if (useProfileStore.getState().userId !== userId) return;
      setDraft(null);
      toast.success(photoDataUrl ? 'Profile photo saved' : 'Profile photo removed');
    } catch (error) {
      if (useProfileStore.getState().userId === userId)
        toast.error(error instanceof Error ? error.message : 'Could not save your photo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card id="profile-photo" className="scroll-mt-28 rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle>Profile photo</CardTitle>
          <CardSub>Make your workspace feel like yours.</CardSub>
        </div>
      </CardHeader>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ProfileAvatar
          name={profile?.name}
          photoDataUrl={draft ?? savedPhoto}
          className="ring-accent/15 size-24 text-3xl ring-4"
        />
        <div className="min-w-0 flex-1">
          <p className="text-text-dim text-sm">
            Your photo appears on your profile and at the top of your pages. Choose a clear picture
            of yourself.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose your profile photo"
            aria-describedby="profile-photo-help"
            className="hidden"
            disabled={disabled}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              void choosePhoto(file);
            }}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="ghost"
              icon={Camera}
              mutates
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              {processing ? 'Preparing photo…' : savedPhoto || draft ? 'Change photo' : 'Add photo'}
            </Button>
            {draft ? (
              <>
                <Button
                  icon={Save}
                  mutates
                  loading={saving}
                  disabled={disabled}
                  onClick={() => void savePhoto(draft)}
                >
                  Save photo
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </>
            ) : savedPhoto ? (
              <Button
                variant="ghost"
                icon={Trash2}
                mutates
                loading={saving}
                disabled={disabled}
                onClick={() => void savePhoto()}
              >
                Remove photo
              </Button>
            ) : null}
          </div>
          <p id="profile-photo-help" className="text-text-mute mt-3 text-xs">
            JPG, PNG or WEBP up to 10MB. A smaller copy is saved on this device with your profile.
          </p>
          <p role="status" className="text-ink-green mt-2 text-xs">
            {processing
              ? 'Preparing your preview…'
              : draft
                ? 'Preview ready. Select Save photo to use it.'
                : ''}
          </p>
        </div>
      </div>
    </Card>
  );
}
