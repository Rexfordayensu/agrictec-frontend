import { LogoLoader } from '@/components/ui/logo-loader';

/** Between pages: the animated AgriCtec mark in the content area. */
export default function Loading() {
  return (
    <>
      <span hidden data-launch-pending />
      <LogoLoader center size="lg" label="Loading page" />
    </>
  );
}
