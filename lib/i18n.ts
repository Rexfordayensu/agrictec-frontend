'use client';

import { useSettingsStore } from '@/store/settings-store';
import type { Language } from '@/types';

export const dictionaries: Record<Language, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.records': 'Farm Records',
    'nav.momo': 'MoMo Transactions',
    'nav.reports': 'Financial Reports',
    'nav.assistant': 'AI Assistant',
    'nav.crop-doctor': 'AI Crop Doctor',
    'nav.yield-predictor': 'AI Yield Predictor',
    'nav.loans': 'Loans & Credit',
    'nav.market': 'Market Prices',
    'nav.weather': 'Weather',
    'nav.profile': 'Profile',
    'nav.settings': 'Profile & Settings',
    'nav.section.Main': 'Main',
    'nav.section.AI Powered': 'AI Powered',
    'nav.section.Finance': 'Finance',
    'nav.section.Account': 'Account',
    'common.save': 'Save Changes',
    'common.signOut': 'Sign Out',
    'common.menu': 'Menu',
    'common.close': 'Close',
  },
  tw: {},
  ga: {},
  ee: {},
  ha: {},
};

export function t(key: string, lang: Language): string {
  return dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
}

export function useT() {
  const language = useSettingsStore((state) => state.language);
  return (key: string) => t(key, language);
}

export function navKey(href: string): string {
  return `nav.${href.split('/').filter(Boolean)[0] ?? 'dashboard'}`;
}
