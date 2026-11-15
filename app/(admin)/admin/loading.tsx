import { LogoLoader } from '@/components/ui/logo-loader';

/** Between console pages: the animated AgriCtec mark in the content area. */
export default function AdminLoading() {
  return (
    <>
      <span hidden data-launch-pending />
      <LogoLoader center size="lg" label="Loading page" />
    </>
  );
}
