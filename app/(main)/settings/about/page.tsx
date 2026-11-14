import type { Metadata } from 'next';
import { Info } from 'lucide-react';
import { AboutCard } from '@/components/settings/about-card';
import { IconTile } from '@/components/ui/icon-tile';
import '@/components/settings/about-page.css';

export const metadata: Metadata = { title: 'About' };

export default function AboutSettingsPage() {
  return (
    <section className="about-reference" aria-labelledby="about-page-heading">
      <header className="about-page-heading">
        <IconTile icon={Info} size="lg" />
        <div>
          <h2 id="about-page-heading">About AgriCtec</h2>
          <p>Learn about AgriCtec, what we do and how you manage your data.</p>
        </div>
      </header>
      <AboutCard />
    </section>
  );
}
