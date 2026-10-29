// Platform-level storage keys (stored as "agrictec:<key>" by services/storage.ts).
// They sit beside the existing per-user farmer keys "agrictec:<userId>:<name>".

export const PLATFORM_KEYS = {
  admins: 'platform:admins',
  creditConfig: 'platform:credit-config',
  creditHistory: 'platform:credit-config-history',
  flags: 'platform:flags',
  plans: 'platform:plans',
  lenders: 'platform:lenders',
  market: 'platform:content:market',
  weatherOverride: 'platform:content:weather-override',
  crops: 'platform:content:crops',
  assistantKb: 'platform:content:assistant-kb',
  diagnoses: 'platform:content:diagnoses',
  /** Who last saved each content type, and when ("Last updated by X on date"). */
  contentMeta: 'platform:content:meta',
  announcements: 'platform:announcements',
  verifications: 'platform:verifications',
  loanApplications: 'platform:loan-applications',
  riskFlags: 'platform:risk-flags',
  audit: 'platform:audit',
  /** Entries moved out of the audit log once it passes its cap. Never deleted. */
  auditArchive: 'platform:audit-archive',
  /** Timestamp of the last seed. */
  seeded: 'platform:seeded',
} as const;

/** The signed-in admin ("agrictec:admin-session"). */
export const ADMIN_SESSION_KEY = 'admin-session';

/** Failed admin login attempts and the lockout time. */
export const ADMIN_LOCKOUT_KEY = 'admin-lockout';

/** Per-farmer admin data (tags, notes), stored with the farmer's own keys so a delete wipes it. */
export const FARMER_ADMIN_META = 'admin-meta';

/** Per-farmer data names under "agrictec:<userId>:<name>". */
export const FARMER_DATA = {
  profile: 'profile',
  records: 'records',
  momo: 'momo',
  diagnoses: 'diagnoses',
} as const;

/** Seeded farmers have IDs with this prefix, so a demo reset never touches real accounts. */
export const SEED_FARMER_PREFIX = 'seed-farmer-';
