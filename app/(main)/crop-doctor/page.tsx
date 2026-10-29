import type { Metadata } from 'next';
import { FeatureGate } from '@/components/shared/feature-gate';
import { CropDoctorHero } from '@/components/crop-doctor/crop-doctor-hero';
import { CropDoctorView } from '@/components/crop-doctor/crop-doctor-view';
import { DiseaseGuide } from '@/components/crop-doctor/disease-guide';

export const metadata: Metadata = { title: 'AI Crop Doctor' };

/** `@container`: the layout responds to the content width (which depends on the sidebar). */
export default function CropDoctorPage() {
  return (
    <FeatureGate flag="cropDoctor">
      <div className="@container space-y-4">
        <CropDoctorHero />
        <CropDoctorView />
        <DiseaseGuide />
      </div>
    </FeatureGate>
  );
}
