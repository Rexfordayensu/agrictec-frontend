import type { MarketPrice } from '@/types';

// Icons come from components/ui/crop-icon.tsx (cropFromName), not from the data.
export const MARKET_PRICES: MarketPrice[] = [
  { crop: 'Maize', unit: '100kg bag', price: 320, change: 5.2 },
  { crop: 'Cassava', unit: '100kg', price: 90, change: -1.5 },
  { crop: 'Rice (local)', unit: '50kg bag', price: 550, change: 8.1 },
  { crop: 'Cocoa', unit: '64kg bag', price: 1350, change: 3.4 },
  { crop: 'Yam', unit: 'tuber', price: 45, change: -2.0 },
  { crop: 'Plantain', unit: 'bunch', price: 25, change: 1.8 },
  { crop: 'Groundnut', unit: '50kg bag', price: 600, change: 4.5 },
  { crop: 'Tomato', unit: 'basket', price: 180, change: -6.2 },
];
