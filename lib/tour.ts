// The app tour: six short steps for a first-timer, each pointing at the real place on the
// screen. It opens once for a new farmer (finishing or skipping it is kept on the account:
// POST /me/tour) and at the start of a guest demo (kept on the phone only, with the demo).
// Anyone can replay it from Settings › About or the account menu.

import { DEMO_TOUR_KEY } from '@/lib/demo';
import { api } from '@/services/api';
import { storage } from '@/services/storage';
import type { AppSettings } from '@/types';

export type TourStepId = 'welcome' | 'records' | 'momo' | 'score' | 'loans' | 'settings';

export interface TourStep {
  id: TourStepId;
  title: string;
  body: string;
  /** Where it points, first visible match wins; none visible: a card in the middle. */
  targets: string[];
  /** Said when the target isn't on this screen (a phone's bottom bar has fewer items). */
  elsewhere?: string;
}

const NAV = (href: string) => [
  `nav[aria-label="Main navigation"] a[href="${href}"]`,
  `nav[aria-label="Mobile navigation"] a[href="${href}"]`,
];

/** The steps, in order. Loans is left out when the admin has turned loans off. */
export function tourSteps({ guest, loans }: { guest: boolean; loans: boolean }): TourStep[] {
  const steps: TourStep[] = [
    guest
      ? {
          id: 'welcome',
          title: 'Welcome to the AgriCtec demo',
          body: 'Try AgriCtec for one day: what you add stays on this phone and is never sent to us. This short tour shows you where everything is and how it works.',
          targets: [],
        }
      : {
          id: 'welcome',
          title: 'Welcome to AgriCtec',
          body: 'AgriCtec turns your everyday farm records into a financial identity that lenders can trust. This short tour shows you where everything is and how it works.',
          targets: [],
        },
    {
      id: 'records',
      title: 'Record your farm money',
      body: 'Write down what your farm earns and spends: crop sales, inputs, labour, activities and loans. Say how you were paid (cash, bank or Mobile Money) so your history is complete.',
      targets: NAV('/records'),
    },
    {
      id: 'momo',
      title: 'Log Mobile Money with its receipt',
      body: 'Add each MoMo payment with a photo of its receipt. AgriCtec checks the receipt, and verified entries count more towards your score.',
      targets: NAV('/momo'),
      elsewhere: 'On a phone, MoMo Transactions is under Menu at the bottom of the screen.',
    },
    {
      id: 'score',
      title: 'Your AgriCtec score',
      body: guest
        ? 'Your score (300 to 850) grows when you record regularly, attach receipts and verify your Ghana Card. Add a few records in the demo and watch it change.'
        : 'Your score (300 to 850) grows when you record regularly, attach receipts and verify your Ghana Card. Lenders can see it, but it never approves or refuses a loan on its own.',
      targets: ['[data-tour="score"]'],
    },
    {
      id: 'loans',
      title: 'Find a loan',
      body: 'Compare the lenders published on AgriCtec, see what each one asks for, check how ready your records are and apply through AgriCtec.',
      targets: NAV('/loans'),
      elsewhere: 'On a phone, Loans & Credit is under Menu at the bottom of the screen.',
    },
    guest
      ? {
          id: 'settings',
          title: 'Ready to start for real?',
          body: 'Create a free account to keep your records, get your receipts verified and apply to lenders. You can replay this tour any time from Settings › About.',
          targets: NAV('/settings/profile'),
        }
      : {
          id: 'settings',
          title: 'Verify your details',
          body: 'In Profile & Settings, confirm your phone by SMS, pin your farm on the map and add your Ghana Card: verified details make your records trusted. You can replay this tour from Settings › About.',
          targets: NAV('/settings/profile'),
        },
  ];
  return loans ? steps : steps.filter((step) => step.id !== 'loans');
}

/** Whether a guest already saw the tour in this demo (kept on the phone, with the demo). */
export function guestSawTour(): boolean {
  return storage.get<boolean>(DEMO_TOUR_KEY, false) === true;
}

/**
 * Finishing or skipping the tour. A farmer's choice is kept on the account (every phone); a
 * guest's on this phone only, and it goes with the demo. Returns the farmer's settings.
 */
export async function recordTourSeen(guest: boolean): Promise<AppSettings | null> {
  if (guest) {
    storage.set(DEMO_TOUR_KEY, true);
    return null;
  }
  return api<AppSettings>('/me/tour', { method: 'POST' });
}
