'use client';

import { IdentityVerificationCard } from '@/components/profile/identity-verification-card';
import { VerificationGrid } from '@/components/profile/verification-grid';
import { DemoNote, useDemo } from '@/components/shared/demo-note';

/** The verification page's checks. In the guest demo there is no account to verify. */
export function VerificationChecks() {
  if (useDemo())
    return (
      <DemoNote title="Verify your phone, farm and Ghana Card">
        Checks are made on your own account, and AgriCtec reviews them. The guest demo has no
        account, so create a free account to verify your details.
      </DemoNote>
    );
  return (
    <>
      <IdentityVerificationCard />
      <VerificationGrid />
    </>
  );
}
