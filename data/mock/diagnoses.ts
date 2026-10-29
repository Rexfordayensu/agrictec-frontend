import type { DiagnosisResult } from '@/types';

export const MOCK_DIAGNOSES: DiagnosisResult[] = [
  {
    crop: 'Maize',
    disease: 'Fall Armyworm',
    confidence: 94,
    severity: 'High',
    treatment:
      'Spray an approved insecticide such as emamectin benzoate early in the morning, targeting the leaf funnel. Repeat after 7 days and scout the whole field twice a week.',
  },
  {
    crop: 'Maize',
    disease: 'Maize Lethal Necrosis',
    confidence: 88,
    severity: 'High',
    treatment:
      'Uproot and destroy infected plants, control aphids and thrips, and replant with certified MLN-tolerant seed. Rotate with legumes such as groundnut next season.',
  },
  {
    crop: 'Cassava',
    disease: 'Cassava Mosaic Disease',
    confidence: 89,
    severity: 'Moderate',
    treatment:
      'Uproot and burn infected plants, control whiteflies, and replant with resistant varieties using clean, certified stems.',
  },
  {
    crop: 'Cocoa',
    disease: 'Cocoa Black Pod',
    confidence: 91,
    severity: 'High',
    treatment:
      'Remove and bury infected pods, prune to improve airflow, and apply a copper-based fungicide every 3 to 4 weeks during the rainy season.',
  },
  {
    disease: 'Healthy',
    confidence: 97,
    severity: 'None',
    treatment:
      'No disease detected. Keep up regular weeding, balanced fertilizer and weekly scouting to keep your crop healthy.',
  },
];
