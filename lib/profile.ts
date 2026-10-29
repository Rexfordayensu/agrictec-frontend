import type { FarmType, GhanaCardInfo, GhanaCardStatus, Profile, SizeUnit } from '@/types';
import { safeProfilePhoto } from '@/lib/profile-photo';

export const ghanaPhone = /^(\+233|0)[235]\d{8}$/;
export const ghanaCard = /^GHA-\d{9}-\d$/;

export const FARM_TYPES: FarmType[] = ['Smallholder', 'Commercial', 'Cooperative', 'Out-grower'];
export const SIZE_UNITS: SizeUnit[] = ['acres', 'hectares'];

/** 1 hectare = 2.47105 acres. */
export const ACRES_PER_HECTARE = 2.47105;

export function normalizePhone(phone: string): string {
  const value = phone.trim();
  return value.startsWith('0') ? `+233${value.slice(1)}` : value;
}

/** Formats as the farmer types: uppercase, "GHA-" prefix and dashes added automatically. */
export function formatGhanaCard(value: string): string {
  const digits = value
    .toUpperCase()
    .replace(/^GHA-?/, '')
    .replace(/\D/g, '')
    .slice(0, 10);
  return digits ? `GHA-${digits.slice(0, 9)}${digits.length > 9 ? `-${digits[9]}` : ''}` : '';
}

/** Four trailing digits including the check digit; the full identifier is never persisted. */
export function maskGhanaCard(last4?: string): string {
  return last4 && /^\d{4}$/.test(last4)
    ? `GHA-******${last4.slice(0, 3)}-${last4[3]}`
    : 'Not verified';
}

/** The masked form of a full card number ("GHA-123456789-0" → "GHA-******789-0"). */
export const maskFullGhanaCard = (cardNumber: string) =>
  maskGhanaCard(cardNumber.replace(/\D/g, '').slice(-4));

const MASKED_CARD = /^GHA-\*{6}\d{3}-\d$/;

export const GHANA_CARD_LABELS: Record<GhanaCardStatus, string> = {
  not_provided: 'Not provided',
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Rejected',
};

// ---------- Farm size ----------

const round2 = (value: number) => Math.round(value * 100) / 100;

/** The size in acres (what is stored) from what the farmer typed in their unit. */
export const toAcres = (size: number, unit: SizeUnit) =>
  unit === 'hectares' ? size * ACRES_PER_HECTARE : size;

/** The stored acres back in the farmer's unit, rounded to 2 decimals. */
export const fromAcres = (acres: number, unit: SizeUnit) =>
  round2(unit === 'hectares' ? acres / ACRES_PER_HECTARE : acres);

/** "2 hectares", "1 acre", "4.5 acres". */
export function formatFarmSize(acres: number, unit: SizeUnit = 'acres'): string {
  const value = fromAcres(acres, unit);
  const name = unit === 'hectares' ? 'hectare' : 'acre';
  return `${value.toLocaleString('en-GH', { maximumFractionDigits: 2 })} ${name}${value === 1 ? '' : 's'}`;
}

/** The farmer's crops for display: "Other" replaced by what they typed. */
export function cropNames(profile: Pick<Profile, 'primaryCrops' | 'otherCrops'>): string[] {
  return profile.primaryCrops.flatMap((crop) =>
    crop === 'Other' ? (profile.otherCrops?.trim() ? [profile.otherCrops.trim()] : []) : [crop],
  );
}

/** "Northern Region" style location: "Tamale North, Northern" (constituency first when known). */
export const locationLabel = (profile: Pick<Profile, 'constituency' | 'region'>) =>
  [profile.constituency, profile.region].filter(Boolean).join(', ');

// ---------- Defaults, migration and the stored shape ----------

export function defaultProfile(userId: string): Profile {
  return {
    userId,
    name: '',
    phone: '',
    email: '',
    farmName: '',
    useNameAsFarmName: false,
    region: '',
    constituency: '',
    acres: 0,
    sizeUnit: 'acres',
    farmType: 'Smallholder',
    primaryCrops: [],
    ghanaCard: { status: 'not_provided' },
    verification: { phone: false, location: false, ghanaCard: false },
  };
}

/** A saved profile as it may be in storage: older ones had ghanaCardLast4 and no card status. */
type StoredProfile = Partial<Omit<Profile, 'ghanaCard' | 'verification'>> & {
  ghanaCard?: Partial<GhanaCardInfo>;
  ghanaCardLast4?: string;
  verification?: Partial<Profile['verification']>;
};

/**
 * Merges a saved profile over the defaults and upgrades older saves: a verified card saved as
 * ghanaCardLast4 becomes ghanaCard { status: 'verified', masked }.
 */
export function normalizeProfile(userId: string, saved: StoredProfile | null): Profile {
  const base = defaultProfile(userId);
  if (!saved) return base;
  const verification = { ...base.verification, ...saved.verification };
  const legacyLast4 =
    saved.ghanaCardLast4 && /^\d{4}$/.test(saved.ghanaCardLast4) ? saved.ghanaCardLast4 : null;
  const card: GhanaCardInfo = saved.ghanaCard?.status
    ? { ...saved.ghanaCard, status: saved.ghanaCard.status }
    : legacyLast4 && verification.ghanaCard
      ? { status: 'verified', masked: maskGhanaCard(legacyLast4) }
      : { status: 'not_provided' };
  const { ghanaCardLast4: _legacy, ...rest } = saved;
  void _legacy;
  return safeProfile({
    ...base,
    ...rest,
    userId,
    ghanaCard: card,
    verification,
  } as Profile);
}

/**
 * Whitelists the persisted profile fields. Never a raw Ghana Card number: only a masked value
 * and a hash. verification.ghanaCard follows the card status.
 */
export function safeProfile(profile: Profile): Profile {
  const card = profile.ghanaCard ?? { status: 'not_provided' };
  const status: GhanaCardStatus = ['not_provided', 'pending', 'verified', 'rejected'].includes(
    card.status,
  )
    ? card.status
    : 'not_provided';
  const ghanaCardInfo: GhanaCardInfo = {
    status,
    ...(card.masked && MASKED_CARD.test(card.masked) && { masked: card.masked }),
    ...(card.hash && /^[\w-]{8,128}$/.test(card.hash) && { hash: card.hash }),
    ...(card.submittedAt && { submittedAt: card.submittedAt }),
    ...(status === 'rejected' && card.rejectedReason && { rejectedReason: card.rejectedReason }),
  };
  const text = (value: string | undefined) => (value?.trim() ? value.trim() : undefined);
  const community = text(profile.community);
  const otherCrops = text(profile.otherCrops);
  const cooperativeName = text(profile.cooperativeName);
  const outgrowerCompany = text(profile.outgrowerCompany);
  const photoDataUrl = safeProfilePhoto(profile.photoDataUrl);
  return {
    userId: profile.userId,
    name: profile.name ?? '',
    ...(photoDataUrl && { photoDataUrl }),
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    farmName: profile.farmName ?? '',
    useNameAsFarmName: Boolean(profile.useNameAsFarmName),
    region: profile.region ?? '',
    constituency: profile.constituency ?? '',
    ...(community && { community }),
    ...(profile.gps && { gps: { lat: profile.gps.lat, lng: profile.gps.lng } }),
    acres: Number.isFinite(profile.acres) ? profile.acres : 0,
    sizeUnit: profile.sizeUnit === 'hectares' ? 'hectares' : 'acres',
    primaryCrops: [...(profile.primaryCrops ?? [])],
    ...(otherCrops && profile.primaryCrops?.includes('Other') && { otherCrops }),
    farmType: FARM_TYPES.includes(profile.farmType) ? profile.farmType : 'Smallholder',
    ...(profile.farmType === 'Cooperative' && cooperativeName && { cooperativeName }),
    ...(profile.farmType === 'Out-grower' && outgrowerCompany && { outgrowerCompany }),
    ghanaCard: ghanaCardInfo,
    verification: {
      phone: Boolean(profile.verification?.phone),
      location: Boolean(profile.verification?.location),
      ghanaCard: status === 'verified',
    },
    ...(profile.onboardingCompletedAt && { onboardingCompletedAt: profile.onboardingCompletedAt }),
  };
}

export function profileCompleteness(profile: Profile | null): number {
  if (!profile) return 0;
  const fields = [
    profile.name.trim(),
    profile.phone,
    profile.email,
    profile.region,
    profile.constituency,
    profile.farmName.trim(),
    profile.acres > 0,
    profile.primaryCrops.length > 0,
    profile.verification.phone,
    profile.verification.location,
    profile.verification.ghanaCard,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}
